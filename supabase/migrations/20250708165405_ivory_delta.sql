/*
  # Add course period tracking and student history
  
  1. New Fields
    - Add `period` field to courses table to track academic periods
    - Add `status` field to enrollments to track student results (Approved, Failed, Auditing)
    - Add `final_grade` field to enrollments for final course grade
    - Add `observations` field to enrollments for teacher comments
  
  2. Indexes
    - Add index on course period for efficient filtering
    - Add index on enrollment status for reporting
*/

-- Add period field to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS period text;
COMMENT ON COLUMN courses.period IS 'Academic period (e.g., 1-Cuatri/2025, 2-Cuatri/2024, Summer)';

-- Add status, final_grade and observations to enrollments
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status text;
COMMENT ON COLUMN enrollments.status IS 'Student status in course (Approved, Failed, Auditing)';

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS final_grade numeric;
COMMENT ON COLUMN enrollments.final_grade IS 'Final grade for the course';

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS observations text;
COMMENT ON COLUMN enrollments.observations IS 'Teacher observations about student performance';

-- Add completion_date to enrollments
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completion_date timestamptz;
COMMENT ON COLUMN enrollments.completion_date IS 'Date when the student completed the course';

-- Create index for efficient period filtering
CREATE INDEX IF NOT EXISTS idx_courses_period ON courses(period);

-- Create index for enrollment status reporting
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Create index for completed courses
CREATE INDEX IF NOT EXISTS idx_enrollments_completion ON enrollments(user_id, completion_date) 
WHERE completion_date IS NOT NULL;

-- Add constraint to validate status values
ALTER TABLE enrollments ADD CONSTRAINT IF NOT EXISTS enrollments_status_check 
CHECK (status IS NULL OR status IN ('Approved', 'Failed', 'Auditing', 'In Progress'));

-- Update existing enrollments to 'In Progress' status
UPDATE enrollments SET status = 'In Progress' WHERE status IS NULL;