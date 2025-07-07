/*
  # Adicionar campos de perfil completo para usuários

  1. Novos campos na tabela users
    - Campos de identificação pessoal
    - Informações de contato
    - Endereço completo
    - Foto de perfil

  2. Segurança
    - Manter RLS habilitado
    - Políticas para usuários gerenciarem próprios perfis
*/

-- Adicionar novos campos à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_type text CHECK (document_type IN ('dni', 'passport', 'cedula', 'other'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_networks jsonb DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locality text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country text DEFAULT 'Argentina';

-- Atualizar a coluna name para ser opcional (já que agora temos first_name e last_name)
ALTER TABLE users ALTER COLUMN name DROP NOT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_document ON users(document_type, document_number);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(province, locality);

-- Adicionar política para usuários atualizarem próprios perfis com novos campos
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Adicionar política para inserção de novos usuários
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);