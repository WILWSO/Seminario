-- Este archivo debe ejecutarse en la consola SQL de Supabase
-- para agregar el campo correct_answers a la tabla assignment_questions

-- Agregar campo correct_answers a la tabla assignment_questions
ALTER TABLE assignment_questions 
ADD COLUMN IF NOT EXISTS correct_answers INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Comentario para documentación
COMMENT ON COLUMN assignment_questions.correct_answers IS 'Índices de las respuestas correctas para preguntas de opción múltiple';

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'assignment_questions'
ORDER BY ordinal_position;
