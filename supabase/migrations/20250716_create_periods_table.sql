-- Migración: Crear tabla periods para gestión de periodos académicos
-- Fecha: 2025-07-16

CREATE TABLE IF NOT EXISTS periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  start_date DATE,
  end_date DATE
);

-- Puedes agregar más campos según la lógica de tu aplicación.
-- Ejemplo de relación en enrollments:
-- ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id);

-- NOTA: Si ya tienes el campo 'period' en enrollments como texto, puedes migrar a 'period_id' para usar la relación, o mantener ambos según tu necesidad.
