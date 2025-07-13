-- Actualizar el tipo de evaluación para incluir formularios externos
-- Esto permite tener formularios con URL externa que no requieren preguntas

-- Modificar la restricción CHECK para incluir el nuevo tipo
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
  CHECK (assignment_type IN ('form', 'file_upload', 'external_form'));

-- Comentario: 
-- 'form' = Formulario interno con preguntas y respuestas automáticas
-- 'external_form' = Formulario externo con URL, solo se registra puntaje final
-- 'file_upload' = Subida de archivo para ensayos/informes

-- Actualizar registros existentes con external_form_url para usar el nuevo tipo
UPDATE assignments 
SET assignment_type = 'external_form' 
WHERE assignment_type = 'form' 
  AND external_form_url IS NOT NULL 
  AND external_form_url != '';