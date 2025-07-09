/*
  # Sistema de evaluaciones mejorado

  1. Nuevos campos na tabela assignments
    - assignment_type: tipo de avaliação (form ou file_upload)
    - form_questions: perguntas do formulário (JSON)
    - file_instructions: instruções para upload de arquivo
    - allowed_file_types: tipos de arquivo permitidos
    - max_file_size_mb: tamanho máximo do arquivo
    - is_active: se a avaliação está ativa

  2. Nova tabela assignment_submissions
    - Para armazenar respostas dos estudantes
    - Suporte para formulários e uploads de arquivo

  3. Segurança
    - RLS habilitado
    - Políticas para estudantes e professores
*/

-- Adicionar novos campos à tabela assignments
DO $$
BEGIN
  -- assignment_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'assignment_type'
  ) THEN
    ALTER TABLE assignments ADD COLUMN assignment_type text DEFAULT 'form' CHECK (assignment_type IN ('form', 'file_upload'));
  END IF;

  -- form_questions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'form_questions'
  ) THEN
    ALTER TABLE assignments ADD COLUMN form_questions jsonb;
  END IF;

  -- file_instructions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'file_instructions'
  ) THEN
    ALTER TABLE assignments ADD COLUMN file_instructions text;
  END IF;

  -- allowed_file_types
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'allowed_file_types'
  ) THEN
    ALTER TABLE assignments ADD COLUMN allowed_file_types text[] DEFAULT ARRAY['pdf', 'doc', 'docx'];
  END IF;

  -- max_file_size_mb
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'max_file_size_mb'
  ) THEN
    ALTER TABLE assignments ADD COLUMN max_file_size_mb integer DEFAULT 10;
  END IF;

  -- is_active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE assignments ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Criar tabela para respostas de avaliações
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_type text NOT NULL CHECK (submission_type IN ('form', 'file')),
  form_answers jsonb, -- Para respostas de formulário
  file_url text, -- Para arquivos enviados
  file_name text, -- Nome original do arquivo
  file_size bigint, -- Tamanho do arquivo em bytes
  file_type text, -- Tipo MIME do arquivo
  submitted_at timestamptz DEFAULT now(),
  grade numeric, -- Nota atribuída
  feedback text, -- Comentário do professor
  graded_at timestamptz,
  graded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Habilitar RLS
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at);

-- Políticas de segurança para assignment_submissions
CREATE POLICY "Students can read own submissions" ON assignment_submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create own submissions" ON assignment_submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own submissions before grading" ON assignment_submissions
  FOR UPDATE USING (student_id = auth.uid() AND grade IS NULL);

CREATE POLICY "Teachers can read submissions for own courses" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_submissions.assignment_id 
        AND (c.teacher_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Teachers can grade submissions for own courses" ON assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = assignment_submissions.assignment_id 
        AND (c.teacher_id = auth.uid() OR public.is_admin())
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_assignment_submissions_updated_at 
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Atualizar assignments existentes para ter o tipo padrão
UPDATE assignments 
SET assignment_type = 'form' 
WHERE assignment_type IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN assignments.assignment_type IS 'Tipo de avaliação: form (formulário) ou file_upload (upload de arquivo)';
COMMENT ON COLUMN assignments.form_questions IS 'Perguntas do formulário em formato JSON';
COMMENT ON COLUMN assignments.file_instructions IS 'Instruções para upload de arquivo';
COMMENT ON COLUMN assignments.allowed_file_types IS 'Tipos de arquivo permitidos para upload';
COMMENT ON COLUMN assignments.max_file_size_mb IS 'Tamanho máximo do arquivo em MB';
COMMENT ON COLUMN assignments.is_active IS 'Se a avaliação está ativa e visível para estudantes';

COMMENT ON TABLE assignment_submissions IS 'Respostas dos estudantes às avaliações';
COMMENT ON COLUMN assignment_submissions.submission_type IS 'Tipo de resposta: form ou file';
COMMENT ON COLUMN assignment_submissions.form_answers IS 'Respostas do formulário em formato JSON';
COMMENT ON COLUMN assignment_submissions.file_url IS 'URL do arquivo enviado';