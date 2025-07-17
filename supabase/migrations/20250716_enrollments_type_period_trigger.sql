-- Migración: Modificaciones en enrollments para tipo de cursada, periodo y trigger de is_active
-- Fecha: 2025-07-16

-- 1. Agregar campo 'type_coursed' (tipo de cursada)
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS type_coursed VARCHAR(20) NOT NULL DEFAULT 'Regular'; -- Opciones: 'Regular', 'Oyente'

-- 2. Agregar campo 'period' para diferenciar la matrícula por periodo
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS period VARCHAR(50) NOT NULL DEFAULT 'Sin periodo';

-- 3. Trigger y función para actualizar 'is_active' a false cuando se rellena 'completion_date'
CREATE OR REPLACE FUNCTION set_enrollment_inactive_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completion_date IS NOT NULL AND (OLD.completion_date IS NULL OR OLD.completion_date <> NEW.completion_date) THEN
    NEW.is_active := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_enrollment_inactive ON enrollments;

CREATE TRIGGER trg_set_enrollment_inactive
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION set_enrollment_inactive_on_completion();
