/*
  # Traducir textos al español

  1. Cambios
    - Actualizar valores de estado en enrollments
    - Actualizar comentarios en columnas
    - Actualizar constraint para usar valores en español

  2. Seguridad
    - Mantener RLS habilitado
    - No modificar políticas existentes
*/

-- Actualizar constraint para valores en español
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check 
CHECK (status IS NULL OR status IN ('Aprobado', 'Reprobado', 'Oyente', 'En Progreso'));

-- Actualizar valores existentes de inglés a español
UPDATE enrollments SET status = 'Aprobado' WHERE status = 'Approved';
UPDATE enrollments SET status = 'Reprobado' WHERE status = 'Failed';
UPDATE enrollments SET status = 'Oyente' WHERE status = 'Auditing';
UPDATE enrollments SET status = 'En Progreso' WHERE status = 'In Progress';

-- Actualizar comentarios para usar español
COMMENT ON COLUMN enrollments.status IS 'Estado del estudiante en el curso (Aprobado, Reprobado, Oyente, En Progreso)';
COMMENT ON COLUMN enrollments.final_grade IS 'Calificación final del curso';
COMMENT ON COLUMN enrollments.observations IS 'Observaciones del profesor sobre el desempeño del estudiante';
COMMENT ON COLUMN enrollments.completion_date IS 'Fecha en que el estudiante completó el curso';

COMMENT ON COLUMN courses.period IS 'Período académico (ej., 1-Cuatri/2025, 2-Cuatri/2024, Verano)';

-- Actualizar valores en Progress.tsx
-- Nota: Esto es solo un recordatorio, ya que los cambios en el código frontend
-- deben hacerse directamente en los archivos .tsx, no en SQL