-- Migración: Normalizar periodos en enrollments usando period_id
-- Fecha: 2025-07-16

-- 1. Crear campo period_id en enrollments
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS period_id UUID;

-- 2. Insertar periodos únicos en la tabla periods desde enrollments.period
INSERT INTO periods (name)
SELECT DISTINCT period FROM enrollments
WHERE period IS NOT NULL AND period <> ''
  AND NOT EXISTS (SELECT 1 FROM periods WHERE periods.name = enrollments.period);

-- 3. Asignar period_id en enrollments según el nombre del periodo
UPDATE enrollments
SET period_id = p.id
FROM periods p
WHERE enrollments.period = p.name;

-- 4. Eliminar campo period de enrollments
ALTER TABLE enrollments DROP COLUMN IF EXISTS period;

-- NOTA: Si tienes datos previos en periods, este script no los sobrescribe, solo agrega los nuevos periodos únicos desde enrollments.
