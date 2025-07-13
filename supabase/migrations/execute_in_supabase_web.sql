-- =========================================
-- EJECUTAR ESTE SQL EN LA INTERFAZ WEB DE SUPABASE
-- =========================================

-- Paso 1: Crear la tabla evaluation_scores
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score numeric NOT NULL CHECK (score >= 0),
  max_score numeric NOT NULL CHECK (max_score > 0),
  percentage numeric GENERATED ALWAYS AS (ROUND((score / NULLIF(max_score, 0)) * 100, 2)) STORED,
  feedback text,
  graded_at timestamptz DEFAULT now(),
  graded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Paso 2: Habilitar Row Level Security
ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Paso 3: Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_assignment_id ON evaluation_scores(assignment_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_student_id ON evaluation_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_graded_at ON evaluation_scores(graded_at);

-- Paso 4: Crear políticas de seguridad
CREATE POLICY "Teachers can manage scores for their assignments" ON evaluation_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a 
      JOIN courses c ON a.course_id = c.id 
      WHERE a.id = assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own scores" ON evaluation_scores
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can view all scores" ON evaluation_scores
  FOR ALL USING (
    public.user_has_role('admin')
  );

-- Paso 5: Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_evaluation_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 6: Crear trigger
CREATE TRIGGER update_evaluation_scores_updated_at
  BEFORE UPDATE ON evaluation_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_evaluation_scores_updated_at();

-- =========================================
-- EJECUTAR ESTE SQL EN LA INTERFAZ WEB DE SUPABASE
-- =========================================
