-- =========================================
-- ACTUALIZAR TABLA ASSIGNMENTS - EJECUTAR EN SUPABASE WEB
-- =========================================

-- Paso 1: Actualizar la restricción CHECK para incluir el nuevo tipo external_form
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
  CHECK (assignment_type IN ('form', 'file_upload', 'external_form'));

-- Paso 2: Actualizar registros existentes que tienen external_form_url
UPDATE assignments 
SET assignment_type = 'external_form' 
WHERE assignment_type = 'form' 
  AND external_form_url IS NOT NULL 
  AND external_form_url != '';

-- =========================================
-- ACTUALIZAR TABLA ASSIGNMENTS - EJECUTAR EN SUPABASE WEB
-- =========================================
