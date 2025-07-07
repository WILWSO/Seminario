/*
  # Sistema de matrícula com controle de disponibilidade

  1. Novos campos na tabela courses
    - `enrollment_open` (boolean): Se as matrículas estão abertas
    - `enrollment_start_date` (timestamptz): Data de início das matrículas
    - `enrollment_end_date` (timestamptz): Data de fim das matrículas
    - `max_students` (integer): Número máximo de estudantes

  2. Função para verificar disponibilidade
    - `is_enrollment_available()`: Verifica se um curso está disponível para matrícula

  3. Índices para otimização
    - Índice para consultas de disponibilidade de matrícula

  4. Dados de exemplo
    - Configurar alguns cursos para teste
*/

-- Adicionar campos de controle de matrícula na tabela courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'enrollment_open'
  ) THEN
    ALTER TABLE courses ADD COLUMN enrollment_open boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'enrollment_start_date'
  ) THEN
    ALTER TABLE courses ADD COLUMN enrollment_start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'enrollment_end_date'
  ) THEN
    ALTER TABLE courses ADD COLUMN enrollment_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'max_students'
  ) THEN
    ALTER TABLE courses ADD COLUMN max_students integer DEFAULT 50;
  END IF;
END $$;

-- Criar índice para consultas de disponibilidade de matrícula
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_availability 
ON courses (enrollment_open, enrollment_start_date, enrollment_end_date, is_active);

-- Função para verificar se um curso está disponível para matrícula
CREATE OR REPLACE FUNCTION is_enrollment_available(course_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  course_record RECORD;
  current_enrollments INTEGER;
BEGIN
  -- Buscar informações do curso
  SELECT 
    enrollment_open,
    enrollment_start_date,
    enrollment_end_date,
    max_students,
    is_active
  INTO course_record
  FROM courses
  WHERE id = course_id;

  -- Se o curso não existe ou não está ativo
  IF NOT FOUND OR NOT course_record.is_active THEN
    RETURN false;
  END IF;

  -- Se as matrículas não estão abertas
  IF NOT course_record.enrollment_open THEN
    RETURN false;
  END IF;

  -- Verificar datas de matrícula
  IF course_record.enrollment_start_date IS NOT NULL 
     AND now() < course_record.enrollment_start_date THEN
    RETURN false;
  END IF;

  IF course_record.enrollment_end_date IS NOT NULL 
     AND now() > course_record.enrollment_end_date THEN
    RETURN false;
  END IF;

  -- Verificar limite de estudantes
  IF course_record.max_students IS NOT NULL THEN
    SELECT COUNT(*)
    INTO current_enrollments
    FROM enrollments
    WHERE course_id = is_enrollment_available.course_id 
      AND is_active = true;

    IF current_enrollments >= course_record.max_students THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Atualizar alguns cursos existentes para teste usando WHERE com subquery
UPDATE courses 
SET enrollment_open = true,
    enrollment_start_date = now() - interval '1 day',
    enrollment_end_date = now() + interval '30 days',
    max_students = 30
WHERE is_active = true
  AND id IN (
    SELECT id 
    FROM courses 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    FETCH FIRST 2 ROWS ONLY
  );