/*
  # Corrección de traducciones al español

  1. Cambios
    - Actualizar estados de matrícula de inglés a español
    - Corregir constraint para permitir solo valores en español
    - Actualizar comentarios para usar español
    
  2. Proceso seguro
    - Primero modificar constraint para permitir ambos idiomas
    - Luego actualizar datos existentes
    - Finalmente restringir constraint a solo español
*/

-- Primero, modificar temporalmente la constraint para permitir ambos conjuntos de valores
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check 
CHECK (
  status IS NULL OR 
  status IN ('Approved', 'Failed', 'Auditing', 'In Progress', 'Aprobado', 'Reprobado', 'Oyente', 'En Progreso')
);

-- Actualizar valores existentes de inglés a español
UPDATE enrollments SET status = 'Aprobado' WHERE status = 'Approved';
UPDATE enrollments SET status = 'Reprobado' WHERE status = 'Failed';
UPDATE enrollments SET status = 'Oyente' WHERE status = 'Auditing';
UPDATE enrollments SET status = 'En Progreso' WHERE status = 'In Progress';

-- Ahora que los datos están actualizados, modificar la constraint para permitir solo valores en español
ALTER TABLE enrollments DROP CONSTRAINT enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check 
CHECK (
  status IS NULL OR 
  status IN ('Aprobado', 'Reprobado', 'Oyente', 'En Progreso')
);

-- Actualizar comentarios para usar español
COMMENT ON COLUMN enrollments.status IS 'Estado del estudiante en el curso (Aprobado, Reprobado, Oyente, En Progreso)';
COMMENT ON COLUMN enrollments.final_grade IS 'Calificación final del curso';
COMMENT ON COLUMN enrollments.observations IS 'Observaciones del profesor sobre el desempeño del estudiante';
COMMENT ON COLUMN enrollments.completion_date IS 'Fecha en que el estudiante completó el curso';

COMMENT ON COLUMN courses.period IS 'Período académico (ej., 1-Cuatri/2025, 2-Cuatri/2024, Verano)';