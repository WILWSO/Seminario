-- Agregar campo correct_answers a la tabla assignment_questions
ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS correct_answers INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Comentario para documentación
COMMENT ON COLUMN assignment_questions.correct_answers IS 'Índices de las respuestas correctas para preguntas de opción múltiple';

-- Actualizar las políticas existentes (si es necesario)
-- Las políticas existentes ya cubren este campo ya que usan FOR ALL
