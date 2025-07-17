
UPDATE enrollments
SET period = c.period
FROM courses c
WHERE enrollments.course_id = c.id
  AND (enrollments.period IS NULL OR enrollments.period = '' OR enrollments.period = 'Sin periodo')
  AND c.period IS NOT NULL AND c.period <> '';

ALTER TABLE courses DROP COLUMN IF EXISTS period;

