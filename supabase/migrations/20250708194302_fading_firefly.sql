/*
  # Agregar soporte para formularios externos de Google

  1. Nuevos campos
    - `external_form_url` en la tabla assignments para almacenar URL de formularios de Google
    - Permite integración con Google Forms en lugar de formularios propios

  2. Seguridad
    - Mantener RLS habilitado
    - No alterar políticas existentes
*/

-- Agregar campo para URL de formulario externo
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS external_form_url text;

-- Agregar comentario para documentación
COMMENT ON COLUMN assignments.external_form_url IS 'URL de formulario externo (Google Forms, etc.)';