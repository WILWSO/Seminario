-- Add course_code column to courses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'course_code'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_code VARCHAR(5) NOT NULL DEFAULT '';
    
    -- Add unique constraint to prevent duplicate course codes
    ALTER TABLE courses ADD CONSTRAINT unique_course_code UNIQUE (course_code);
    
    -- Add check constraint to ensure course_code length is between 2 and 5 characters
    ALTER TABLE courses ADD CONSTRAINT check_course_code_length 
    CHECK (LENGTH(course_code) >= 2 AND LENGTH(course_code) <= 5);
    
    -- Add comment to the column
    COMMENT ON COLUMN courses.course_code IS 'Unique course code (2-5 alphanumeric characters)';
    
    RAISE NOTICE 'Column course_code added to courses table with constraints';
  ELSE
    RAISE NOTICE 'Column course_code already exists in courses table';
  END IF;
END $$;
