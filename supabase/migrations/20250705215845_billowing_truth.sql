/*
  # Simplificar sistema de matrículas

  1. Mudanças
    - Manter apenas o campo enrollment_open para controle simples
    - Remover campos de data e limite de estudantes
    - Simplificar função de verificação
    
  2. Segurança
    - Manter RLS nas tabelas existentes
    - Atualizar função para lógica simplificada
*/

-- Remover campos desnecessários se existirem
DO $$
BEGIN
  -- Remover campos de data e limite se existirem
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'enrollment_start_date'
  ) THEN
    ALTER TABLE courses DROP COLUMN enrollment_start_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'enrollment_end_date'
  ) THEN
    ALTER TABLE courses DROP COLUMN enrollment_end_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'max_students'
  ) THEN
    ALTER TABLE courses DROP COLUMN max_students;
  END IF;
END $$;

-- Garantir que o campo enrollment_open existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'enrollment_open'
  ) THEN
    ALTER TABLE courses ADD COLUMN enrollment_open boolean DEFAULT false;
  END IF;
END $$;

-- Remover índice antigo se existir
DROP INDEX IF EXISTS idx_courses_enrollment_availability;

-- Criar índice simples para consultas de matrícula
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_simple 
ON courses (enrollment_open, is_active);

-- Função simplificada para verificar se um curso está disponível para matrícula
CREATE OR REPLACE FUNCTION is_enrollment_available(course_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  course_record RECORD;
BEGIN
  -- Buscar informações do curso
  SELECT 
    enrollment_open,
    is_active
  INTO course_record
  FROM courses
  WHERE id = course_id;

  -- Se o curso não existe ou não está ativo
  IF NOT FOUND OR NOT course_record.is_active THEN
    RETURN false;
  END IF;

  -- Retornar se as matrículas estão abertas
  RETURN course_record.enrollment_open;
END;
$$;

-- Atualizar alguns cursos existentes para teste
UPDATE courses 
SET enrollment_open = true
WHERE is_active = true
  AND id IN (
    SELECT id 
    FROM courses 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    FETCH FIRST 2 ROWS ONLY
  );