/*
  # Migração para suporte a múltiplos roles

  1. Mudanças no esquema
    - Alterar campo role de text para text[]
    - Remover e recriar constraints
    - Atualizar default value

  2. Funções helper
    - user_has_role() para verificar role específico
    - Atualizar is_admin(), is_teacher(), is_student()
    - add_user_role() e remove_user_role() para gestão

  3. Políticas atualizadas
    - Usar novas funções de verificação de role
    - Manter compatibilidade com sistema existente
*/

-- Primeiro, remover constraint existente
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Remover o default temporariamente
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Alterar o tipo da coluna para array, convertendo valores existentes
ALTER TABLE users ALTER COLUMN role TYPE text[] USING 
  CASE 
    WHEN role IS NULL THEN ARRAY['student']
    ELSE ARRAY[role]
  END;

-- Definir novo default como array
ALTER TABLE users ALTER COLUMN role SET DEFAULT ARRAY['student'];

-- Adicionar nova constraint para roles válidos
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (
    role IS NOT NULL AND 
    array_length(role, 1) > 0 AND
    role <@ ARRAY['student', 'teacher', 'admin']
  );

-- Garantir que todos os usuários existentes tenham pelo menos 'student'
UPDATE users 
SET role = ARRAY['student'] 
WHERE role IS NULL OR array_length(role, 1) = 0;

-- Criar função helper para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    user_roles text[];
  BEGIN
    SELECT role INTO user_roles FROM public.users WHERE id = auth.uid();
    RETURN required_role = ANY(user_roles);
  END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_role(text) TO authenticated;

-- Atualizar função is_admin para usar a nova estrutura
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.user_has_role('admin');
END;
$$;

-- Criar função para verificar se é teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.user_has_role('teacher');
END;
$$;

-- Criar função para verificar se é student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.user_has_role('student');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;

-- Atualizar políticas para usar as novas funções
DROP POLICY IF EXISTS "Teachers can manage own courses" ON courses;
CREATE POLICY "Teachers can manage own courses" ON courses
  FOR ALL USING (teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Teachers can manage modules of own courses" ON modules;
CREATE POLICY "Teachers can manage modules of own courses" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND (teacher_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Teachers can manage lessons of own courses" ON lessons;
CREATE POLICY "Teachers can manage lessons of own courses" ON lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = module_id AND (c.teacher_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Teachers can read enrollments for own courses" ON enrollments;
CREATE POLICY "Teachers can read enrollments for own courses" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND (teacher_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Teachers can manage assignments for own courses" ON assignments;
CREATE POLICY "Teachers can manage assignments for own courses" ON assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND (teacher_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Teachers can manage grades for own courses" ON grades;
CREATE POLICY "Teachers can manage grades for own courses" ON grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id AND (teacher_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Teachers can read completed lessons for own courses" ON completed_lessons;
CREATE POLICY "Teachers can read completed lessons for own courses" ON completed_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_id AND (c.teacher_id = auth.uid() OR public.is_admin())
    )
  );

-- Criar função para adicionar role a um usuário
CREATE OR REPLACE FUNCTION public.add_user_role(user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles';
  END IF;
  
  -- Verificar se o role é válido
  IF new_role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Role inválido: %', new_role;
  END IF;
  
  -- Adicionar o role se não existir
  UPDATE users 
  SET role = array_append(role, new_role)
  WHERE id = user_id 
    AND NOT (new_role = ANY(role));
END;
$$;

-- Criar função para remover role de um usuário
CREATE OR REPLACE FUNCTION public.remove_user_role(user_id uuid, old_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles';
  END IF;
  
  -- Remover o role
  UPDATE users 
  SET role = array_remove(role, old_role)
  WHERE id = user_id;
  
  -- Garantir que sempre tenha pelo menos 'student'
  UPDATE users 
  SET role = ARRAY['student']
  WHERE id = user_id AND (role IS NULL OR array_length(role, 1) = 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid, text) TO authenticated;