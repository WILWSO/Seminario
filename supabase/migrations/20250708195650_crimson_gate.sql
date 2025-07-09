/*
  # Agregar estado de desistencia a matrículas

  1. Cambios
    - Agregar 'Desistido' como estado válido para matrículas
    - Actualizar constraint para incluir el nuevo estado
    - Mantener compatibilidad con datos existentes

  2. Seguridad
    - Mantener RLS habilitado
    - No alterar políticas existentes
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