/*
  # Agregar estado de desistencia para estudiantes

  1. Cambios
    - Actualizar constraint para incluir 'Desistido' como estado válido
    - Actualizar comentario para incluir el nuevo estado
    - Asegurar que todo esté en español
*/

-- Actualizar constraint para incluir 'Desistido'
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check 
CHECK (
  status IS NULL OR 
  status IN ('Aprobado', 'Reprobado', 'Oyente', 'En Progreso', 'Desistido')
);

-- Actualizar comentario para incluir el nuevo estado
COMMENT ON COLUMN enrollments.status IS 'Estado del estudiante en el curso (Aprobado, Reprobado, Oyente, En Progreso, Desistido)';