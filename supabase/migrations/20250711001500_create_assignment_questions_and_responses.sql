-- Crear tabla para preguntas de evaluaciones
CREATE TABLE IF NOT EXISTS assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('text', 'multiple_choice', 'essay')),
    options TEXT[], -- Para preguntas de opción múltiple
    is_required BOOLEAN DEFAULT true,
    max_points INTEGER DEFAULT 1,
    order_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_assignment_questions_assignment_id ON assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_questions_order ON assignment_questions(assignment_id, order_number);

-- Configurar RLS (Row Level Security)
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;

-- Políticas para assignment_questions
CREATE POLICY "Teachers can manage questions for their assignments" ON assignment_questions
    FOR ALL USING (
        assignment_id IN (
            SELECT a.id FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view questions for their enrolled courses" ON assignment_questions
    FOR SELECT USING (
        assignment_id IN (
            SELECT a.id FROM assignments a
            JOIN courses c ON a.course_id = c.id
            JOIN enrollments e ON c.id = e.course_id
            WHERE e.user_id = auth.uid() AND e.status = 'active'
        )
    );

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_assignment_questions_updated_at
    BEFORE UPDATE ON assignment_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE assignment_questions IS 'Preguntas de las evaluaciones';
COMMENT ON COLUMN assignment_questions.question_type IS 'Tipo de pregunta: text, multiple_choice, essay';
COMMENT ON COLUMN assignment_questions.options IS 'Opciones para preguntas de opción múltiple';
COMMENT ON COLUMN assignment_questions.is_required IS 'Si la pregunta es obligatoria';
COMMENT ON COLUMN assignment_questions.max_points IS 'Puntos máximos por pregunta';
COMMENT ON COLUMN assignment_questions.order_number IS 'Orden de la pregunta en la evaluación';
