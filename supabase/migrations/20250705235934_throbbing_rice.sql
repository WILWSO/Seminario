/*
  # Garantir que todos os usuários tenham pelo menos 1 role

  1. Validações de banco de dados
    - Atualizar constraint para garantir que role não seja vazio
    - Atualizar usuários existentes sem role
    - Adicionar trigger para garantir role padrão

  2. Funções auxiliares
    - Função para garantir role padrão
    - Trigger para novos usuários
*/

-- Atualizar usuários existentes que não têm role ou têm array vazio
UPDATE users 
SET role = ARRAY['student']::text[]
WHERE role IS NULL 
   OR role = '{}' 
   OR array_length(role, 1) IS NULL 
   OR array_length(role, 1) = 0;

-- Atualizar constraint para garantir que role não seja vazio
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (
  (role IS NOT NULL) 
  AND (array_length(role, 1) > 0) 
  AND (role <@ ARRAY['student'::text, 'teacher'::text, 'admin'::text])
);

-- Função para garantir role padrão
CREATE OR REPLACE FUNCTION ensure_user_has_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Se role é NULL, vazio ou não tem elementos, definir como student
  IF NEW.role IS NULL 
     OR NEW.role = '{}' 
     OR array_length(NEW.role, 1) IS NULL 
     OR array_length(NEW.role, 1) = 0 THEN
    NEW.role = ARRAY['student']::text[];
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir role em INSERT e UPDATE
DROP TRIGGER IF EXISTS ensure_user_role_trigger ON users;

CREATE TRIGGER ensure_user_role_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_has_role();

-- Função para adicionar role (sem duplicatas)
CREATE OR REPLACE FUNCTION add_user_role(user_id uuid, new_role text)
RETURNS void AS $$
BEGIN
  -- Verificar se o role é válido
  IF new_role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Role inválido: %', new_role;
  END IF;
  
  -- Adicionar role se não existir
  UPDATE users 
  SET role = array_append(role, new_role)
  WHERE id = user_id 
    AND NOT (role @> ARRAY[new_role]::text[]);
    
  -- Se nenhuma linha foi afetada, o usuário não existe ou já tem o role
  IF NOT FOUND THEN
    RAISE NOTICE 'Usuário não encontrado ou já possui o role %', new_role;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover role (garantindo que sempre reste pelo menos um)
CREATE OR REPLACE FUNCTION remove_user_role(user_id uuid, old_role text)
RETURNS void AS $$
DECLARE
  current_roles text[];
BEGIN
  -- Buscar roles atuais
  SELECT role INTO current_roles FROM users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Verificar se o usuário tem mais de um role
  IF array_length(current_roles, 1) <= 1 THEN
    RAISE EXCEPTION 'Não é possível remover o último role do usuário';
  END IF;
  
  -- Remover o role
  UPDATE users 
  SET role = array_remove(role, old_role)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION add_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_role(uuid, text) TO authenticated;