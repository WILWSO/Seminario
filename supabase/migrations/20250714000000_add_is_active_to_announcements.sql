-- Add is_active field to announcements table
-- This allows for soft deletes and better content management

-- Add the is_active column with default value true
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update all existing announcements to be active
UPDATE announcements 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_announcements_is_active 
ON announcements(is_active, created_at DESC);

-- Add comment to document the field
COMMENT ON COLUMN announcements.is_active IS 'Indicates if the announcement is active and should be displayed. Used for soft deletes.';
