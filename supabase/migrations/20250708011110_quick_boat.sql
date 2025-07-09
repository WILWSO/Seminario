/*
  # Sistema de avaliações e submissões

  1. Novos campos na tabela assignments
    - assignment_type: tipo de avaliação (form ou file_upload)
    - form_questions: perguntas do formulário em JSON
    - file_instructions: instruções para upload
    - allowed_file_types: tipos de arquivo permitidos
    - max_file_size_mb: tamanho máximo do arquivo
    - is_active: se a avaliação está ativa

  2. Nova tabela assignment_submissions
    - Armazena respostas dos estudantes
    - Suporte para formulários e uploads de arquivo
    - Sistema de notas e feedback

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

-- Criar tabela para respostas de avaliações se não existir
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

-- Habilitar RLS se a tabela foi criada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignment_submissions') THEN
    ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at);

-- Remover políticas existentes se existirem e recriar
DO $$
BEGIN
  -- Remover políticas existentes
  DROP POLICY IF EXISTS "Students can read own submissions" ON assignment_submissions;
  DROP POLICY IF EXISTS "Students can create own submissions" ON assignment_submissions;
  DROP POLICY IF EXISTS "Students can update own submissions before grading" ON assignment_submissions;
  DROP POLICY IF EXISTS "Teachers can read submissions for own courses" ON assignment_submissions;
  DROP POLICY IF EXISTS "Teachers can grade submissions for own courses" ON assignment_submissions;
  
  -- Criar políticas apenas se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignment_submissions') THEN
    -- Políticas para estudantes
    EXECUTE 'CREATE POLICY "Students can read own submissions" ON assignment_submissions
      FOR SELECT USING (student_id = auth.uid())';
    
    EXECUTE 'CREATE POLICY "Students can create own submissions" ON assignment_submissions
      FOR INSERT WITH CHECK (student_id = auth.uid())';
    
    EXECUTE 'CREATE POLICY "Students can update own submissions before grading" ON assignment_submissions
      FOR UPDATE USING (student_id = auth.uid() AND grade IS NULL)';
    
    -- Políticas para professores
    EXECUTE 'CREATE POLICY "Teachers can read submissions for own courses" ON assignment_submissions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM assignments a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = assignment_submissions.assignment_id 
            AND (c.teacher_id = auth.uid() OR public.is_admin())
        )
      )';
    
    EXECUTE 'CREATE POLICY "Teachers can grade submissions for own courses" ON assignment_submissions
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM assignments a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = assignment_submissions.assignment_id 
            AND (c.teacher_id = auth.uid() OR public.is_admin())
        )
      )';
  END IF;
END $$;

-- Criar trigger para updated_at se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_assignment_submissions_updated_at'
  ) THEN
    CREATE TRIGGER update_assignment_submissions_updated_at 
      BEFORE UPDATE ON assignment_submissions
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Atualizar assignments existentes para ter o tipo padrão
UPDATE assignments 
SET assignment_type = 'form' 
WHERE assignment_type IS NULL;

-- Adicionar comentários para documentação
DO $$
BEGIN
  -- Comentários para assignments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'assignment_type'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN assignments.assignment_type IS ''Tipo de avaliação: form (formulário) ou file_upload (upload de arquivo)''';
    EXECUTE 'COMMENT ON COLUMN assignments.form_questions IS ''Perguntas do formulário em formato JSON''';
    EXECUTE 'COMMENT ON COLUMN assignments.file_instructions IS ''Instruções para upload de arquivo''';
    EXECUTE 'COMMENT ON COLUMN assignments.allowed_file_types IS ''Tipos de arquivo permitidos para upload''';
    EXECUTE 'COMMENT ON COLUMN assignments.max_file_size_mb IS ''Tamanho máximo do arquivo em MB''';
    EXECUTE 'COMMENT ON COLUMN assignments.is_active IS ''Se a avaliação está ativa e visível para estudantes''';
  END IF;

  -- Comentários para assignment_submissions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignment_submissions') THEN
    EXECUTE 'COMMENT ON TABLE assignment_submissions IS ''Respostas dos estudantes às avaliações''';
    EXECUTE 'COMMENT ON COLUMN assignment_submissions.submission_type IS ''Tipo de resposta: form ou file''';
    EXECUTE 'COMMENT ON COLUMN assignment_submissions.form_answers IS ''Respostas do formulário em formato JSON''';
    EXECUTE 'COMMENT ON COLUMN assignment_submissions.file_url IS ''URL do arquivo enviado''';
  END IF;
END $$;