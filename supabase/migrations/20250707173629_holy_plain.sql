/*
  # Adicionar suporte a arquivos nas lições

  1. Novos campos
    - `file_name` na tabela lessons para armazenar nome original do arquivo
    - Manter `content_url` para URLs de arquivos ou links externos

  2. Índices
    - Índice para busca por tipo de lição e arquivos
*/

-- Adicionar campo para nome do arquivo nas lições
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE lessons ADD COLUMN file_name text;
  END IF;
END $$;

-- Criar índice para otimizar consultas por tipo e arquivos
CREATE INDEX IF NOT EXISTS idx_lessons_type_content 
ON lessons (type, content_url) 
WHERE content_url IS NOT NULL;

-- Atualizar constraint de tipo para incluir mais opções
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_type_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_type_check 
CHECK (type = ANY (ARRAY['video'::text, 'document'::text, 'quiz'::text, 'image'::text, 'presentation'::text]));

-- Comentários para documentação
COMMENT ON COLUMN lessons.content_url IS 'URL do conteúdo da lição (arquivo uploadado ou link externo)';
COMMENT ON COLUMN lessons.file_name IS 'Nome original do arquivo quando uploadado';
COMMENT ON COLUMN lessons.type IS 'Tipo da lição: video, document, quiz, image, presentation';