/*
  # Add 'lesson' type to lesson_contents table

  1. Changes
    - Add 'lesson' as a valid type in the lesson_contents table
    - Update the CHECK constraint to include the new type
    - Maintain compatibility with existing types (document, link, video)

  2. Security
    - No changes to RLS policies needed
    - Existing permissions remain in place
*/

-- Update constraint to include 'lesson' type
ALTER TABLE lesson_contents DROP CONSTRAINT IF EXISTS lesson_contents_type_check;
ALTER TABLE lesson_contents ADD CONSTRAINT lesson_contents_type_check 
CHECK (type = ANY (ARRAY['document'::text, 'link'::text, 'video'::text, 'lesson'::text]));

-- Update comment to include new type
COMMENT ON COLUMN lesson_contents.type IS 'Tipo: document (archivo), link (URL externa), video (URL de video), lesson (lección)';