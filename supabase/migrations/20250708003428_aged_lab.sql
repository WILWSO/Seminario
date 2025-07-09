/*
  # Atualizar tipos de lição para incluir 'lesson'

  1. Mudanças
    - Adicionar 'lesson' como tipo válido para lições
    - Atualizar constraint de verificação
    - Manter compatibilidade com tipos existentes

  2. Segurança
    - Manter RLS habilitado
    - Não alterar políticas existentes
*/

-- Atualizar constraint de tipo para incluir 'lesson'
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_type_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_type_check 
CHECK (type = ANY (ARRAY['video'::text, 'document'::text, 'quiz'::text, 'image'::text, 'presentation'::text, 'lesson'::text]));

-- Atualizar lições existentes que podem ter tipos inválidos
UPDATE lessons 
SET type = 'lesson' 
WHERE type NOT IN ('video', 'document', 'quiz', 'image', 'presentation', 'lesson');

-- Comentário atualizado
COMMENT ON COLUMN lessons.type IS 'Tipo da lição: video, document, quiz, image, presentation, lesson';