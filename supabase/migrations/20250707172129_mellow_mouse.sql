/*
  # Sistema de configurações do sistema

  1. Nova tabela
    - `system_settings` para armazenar configurações do sistema
    - Campos: id, key, value (jsonb), description, timestamps

  2. Segurança
    - RLS habilitado
    - Apenas admins podem gerenciar configurações

  3. Funções auxiliares
    - get_system_setting() para buscar configurações
    - set_system_setting() para definir configurações

  4. Configurações padrão
    - Configurações iniciais do SEMBRAR
*/

-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Remover política existente se houver
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;

-- Criar política de segurança - apenas admins
CREATE POLICY "Admins can manage system settings" ON system_settings
  FOR ALL USING (public.is_admin());

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para buscar configuração específica
CREATE OR REPLACE FUNCTION get_system_setting(setting_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  setting_value jsonb;
BEGIN
  SELECT value INTO setting_value 
  FROM system_settings 
  WHERE key = setting_key;
  
  RETURN COALESCE(setting_value, 'null'::jsonb);
END;
$$;

-- Função para definir configuração
CREATE OR REPLACE FUNCTION set_system_setting(setting_key text, setting_value jsonb, setting_description text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar configurações do sistema';
  END IF;
  
  INSERT INTO system_settings (key, value, description)
  VALUES (setting_key, setting_value, setting_description)
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, system_settings.description),
    updated_at = now();
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_system_setting(text) TO authenticated;
GRANT EXECUTE ON FUNCTION set_system_setting(text, jsonb, text) TO authenticated;

-- Inserir configurações padrão apenas se não existirem
DO $$
BEGIN
  -- Inserir cada configuração individualmente para evitar problemas de tipo
  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'site_name') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('site_name', '"SEMBRAR"'::jsonb, 'Nome do site');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'site_description') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('site_description', '"Seminário Bíblico Reformado da Argentina"'::jsonb, 'Descrição do site');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'contact_email') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('contact_email', '"info@sembrar.edu.ar"'::jsonb, 'Email de contato principal');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'contact_phone') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('contact_phone', '"+54 11 2601 1240"'::jsonb, 'Telefone de contato');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'address') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('address', '"Buenos Aires, Argentina"'::jsonb, 'Endereço da instituição');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'allow_registration') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('allow_registration', 'true'::jsonb, 'Permitir registro de novos usuários');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'require_email_verification') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('require_email_verification', 'false'::jsonb, 'Exigir verificação de email');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'default_user_role') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('default_user_role', '"student"'::jsonb, 'Role padrão para novos usuários');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'max_file_size_mb') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('max_file_size_mb', '10'::jsonb, 'Tamanho máximo de arquivo em MB');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'supported_file_types') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('supported_file_types', '["pdf", "doc", "docx", "mp4", "mp3"]'::jsonb, 'Tipos de arquivo suportados');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'email_notifications') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('email_notifications', 'true'::jsonb, 'Habilitar notificações por email');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'sms_notifications') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('sms_notifications', 'false'::jsonb, 'Habilitar notificações por SMS');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'maintenance_mode') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('maintenance_mode', 'false'::jsonb, 'Modo de manutenção');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'announcement_banner') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('announcement_banner', '""'::jsonb, 'Banner de anúncios');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'social_links') THEN
    INSERT INTO system_settings (key, value, description) 
    VALUES ('social_links', '{"facebook": "", "twitter": "", "instagram": "", "youtube": ""}'::jsonb, 'Links das redes sociais');
  END IF;
END $$;