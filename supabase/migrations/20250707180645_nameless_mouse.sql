/*
  # Sistema de conteúdo de lições com múltiplos arquivos

  1. Novas tabelas
    - `lesson_contents`: Para armazenar múltiplos conteúdos por lição
    - Suporte a documentos, links e videos

  2. Estrutura
    - Uma lição pode ter múltiplos conteúdos
    - Cada conteúdo tem tipo (document, link, video)
    - Documentos são armazenados no Supabase Storage
    - Videos apenas com URLs
    - Links externos opcionais

  3. Segurança
    - RLS habilitado
    - Professores podem gerenciar conteúdo de suas lições
*/

-- Criar tabela para conteúdos de lições
CREATE TABLE IF NOT EXISTS lesson_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('document', 'link', 'video')),
  title text NOT NULL,
  description text,
  content_url text,
  file_name text,
  file_size bigint,
  file_type text,
  "order" integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE lesson_contents ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lesson_contents_lesson_id ON lesson_contents(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_type ON lesson_contents(type);
CREATE INDEX IF NOT EXISTS idx_lesson_contents_order ON lesson_contents(lesson_id, "order");

-- Políticas de segurança
CREATE POLICY "Anyone can read lesson contents of active courses" ON lesson_contents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_contents.lesson_id AND c.is_active = true
    )
  );

CREATE POLICY "Teachers can manage lesson contents of own courses" ON lesson_contents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = lesson_contents.lesson_id AND (c.teacher_id = auth.uid() OR public.is_admin())
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_lesson_contents_updated_at 
  BEFORE UPDATE ON lesson_contents
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Migrar dados existentes das lições
INSERT INTO lesson_contents (lesson_id, type, title, content_url, file_name, "order")
SELECT 
  id as lesson_id,
  CASE 
    WHEN type = 'video' THEN 'video'
    WHEN type = 'document' THEN 'document'
    ELSE 'document'
  END as type,
  COALESCE(title, 'Conteúdo principal') as title,
  content_url,
  file_name,
  1 as "order"
FROM lessons 
WHERE content_url IS NOT NULL AND content_url != ''
ON CONFLICT DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE lesson_contents IS 'Conteúdos de lições (documentos, links, videos)';
COMMENT ON COLUMN lesson_contents.type IS 'Tipo: document (arquivo), link (URL externa), video (URL de video)';
COMMENT ON COLUMN lesson_contents.content_url IS 'URL do conteúdo (Supabase Storage para documentos, URL externa para videos/links)';
COMMENT ON COLUMN lesson_contents.file_name IS 'Nome original do arquivo (apenas para documentos)';
COMMENT ON COLUMN lesson_contents.file_size IS 'Tamanho do arquivo em bytes (apenas para documentos)';
COMMENT ON COLUMN lesson_contents.file_type IS 'Tipo MIME do arquivo (apenas para documentos)';