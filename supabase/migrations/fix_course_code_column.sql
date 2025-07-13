-- Alternative migration to fix the course_code column issue
-- Use this if you need to clean up and start fresh

-- First, remove the column if it exists with issues
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'course_code'
  ) THEN
    -- Drop constraints if they exist
    ALTER TABLE courses DROP CONSTRAINT IF EXISTS unique_course_code;
    ALTER TABLE courses DROP CONSTRAINT IF EXISTS check_course_code_length;
    
    -- Drop the column
    ALTER TABLE courses DROP COLUMN course_code;
    
    RAISE NOTICE 'Existing course_code column and constraints removed';
  END IF;
END $$;

-- Now add the column properly
DO $$
BEGIN
  -- Add the column without NOT NULL constraint first
  ALTER TABLE courses ADD COLUMN course_code VARCHAR(5);
  
  -- Update existing records with temporary unique codes using a subquery
  UPDATE courses 
  SET course_code = subquery.new_code
  FROM (
    SELECT id, 'TMP' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::text, 2, '0') as new_code
    FROM courses
    WHERE course_code IS NULL
  ) AS subquery
  WHERE courses.id = subquery.id;
  
  -- Now add the NOT NULL constraint
  ALTER TABLE courses ALTER COLUMN course_code SET NOT NULL;
  
  -- Add unique constraint to prevent duplicate course codes
  ALTER TABLE courses ADD CONSTRAINT unique_course_code UNIQUE (course_code);
  
  -- Add check constraint to ensure course_code length is between 2 and 5 characters
  ALTER TABLE courses ADD CONSTRAINT check_course_code_length 
  CHECK (LENGTH(course_code) >= 2 AND LENGTH(course_code) <= 5);
  
  -- Add comment to the column
  COMMENT ON COLUMN courses.course_code IS 'Unique course code (2-5 alphanumeric characters)';
  
  RAISE NOTICE 'Column course_code added successfully with constraints';
  RAISE NOTICE 'Existing courses have been assigned temporary codes (TMP01, TMP02, etc.)';
  RAISE NOTICE 'Please update these codes to meaningful values through the admin interface';
END $$;
