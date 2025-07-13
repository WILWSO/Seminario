-- Migración para estandarizar todas las foreign keys con políticas de eliminación adecuadas
-- Fecha: 2025-07-12
-- Propósito: Garantizar consistencia en las eliminaciones en cascada

-- 1. ENROLLMENTS - Los estudiantes pueden ser eliminados, las matrículas deben eliminarse en cascada
-- Verificar si la constraint ya existe y eliminarla si es necesario
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'enrollments_user_id_fkey' 
        AND table_name = 'enrollments'
    ) THEN
        ALTER TABLE enrollments DROP CONSTRAINT enrollments_user_id_fkey;
    END IF;
END $$;

-- Agregar constraint con CASCADE para user_id
ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. COURSES - Los profesores no deben eliminarse si tienen cursos activos
-- Verificar si la constraint ya existe y eliminarla si es necesario
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'courses_teacher_id_fkey' 
        AND table_name = 'courses'
    ) THEN
        ALTER TABLE courses DROP CONSTRAINT courses_teacher_id_fkey;
    END IF;
END $$;

-- Agregar constraint con RESTRICT para teacher_id (previene eliminación accidental)
ALTER TABLE courses 
ADD CONSTRAINT courses_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT;

-- 3. ASSIGNMENTS - Deben eliminarse cuando se elimina el curso
-- Verificar si la constraint ya existe y eliminarla si es necesario
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignments_course_id_fkey' 
        AND table_name = 'assignments'
    ) THEN
        ALTER TABLE assignments DROP CONSTRAINT assignments_course_id_fkey;
    END IF;
END $$;

-- Agregar constraint con CASCADE para course_id
ALTER TABLE assignments 
ADD CONSTRAINT assignments_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 4. ASSIGNMENT_SUBMISSIONS - Ya tienen CASCADE configurado correctamente
-- Verificar y mantener la configuración existente
DO $$
BEGIN
    -- Verificar student_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignment_submissions_student_id_fkey' 
        AND table_name = 'assignment_submissions'
    ) THEN
        ALTER TABLE assignment_submissions DROP CONSTRAINT assignment_submissions_student_id_fkey;
    END IF;
    
    -- Verificar graded_by constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignment_submissions_graded_by_fkey' 
        AND table_name = 'assignment_submissions'
    ) THEN
        ALTER TABLE assignment_submissions DROP CONSTRAINT assignment_submissions_graded_by_fkey;
    END IF;
END $$;

-- Recrear constraints para assignment_submissions
ALTER TABLE assignment_submissions 
ADD CONSTRAINT assignment_submissions_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE assignment_submissions 
ADD CONSTRAINT assignment_submissions_graded_by_fkey 
FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5. EVALUATION_SCORES - Ya tienen CASCADE configurado correctamente
-- Verificar y mantener la configuración existente
DO $$
BEGIN
    -- Verificar student_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'evaluation_scores_student_id_fkey' 
        AND table_name = 'evaluation_scores'
    ) THEN
        ALTER TABLE evaluation_scores DROP CONSTRAINT evaluation_scores_student_id_fkey;
    END IF;
    
    -- Verificar graded_by constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'evaluation_scores_graded_by_fkey' 
        AND table_name = 'evaluation_scores'
    ) THEN
        ALTER TABLE evaluation_scores DROP CONSTRAINT evaluation_scores_graded_by_fkey;
    END IF;
END $$;

-- Recrear constraints para evaluation_scores
ALTER TABLE evaluation_scores 
ADD CONSTRAINT evaluation_scores_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE evaluation_scores 
ADD CONSTRAINT evaluation_scores_graded_by_fkey 
FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL;

-- 6. ANNOUNCEMENTS - Mantener referencia al creador pero permitir eliminación
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'announcements_created_by_fkey' 
        AND table_name = 'announcements'
    ) THEN
        ALTER TABLE announcements DROP CONSTRAINT announcements_created_by_fkey;
    END IF;
END $$;

-- Agregar constraint con SET NULL para created_by
ALTER TABLE announcements 
ADD CONSTRAINT announcements_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 7. ASSIGNMENT_QUESTIONS - Eliminar cuando se elimina la tarea
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assignment_questions_assignment_id_fkey' 
        AND table_name = 'assignment_questions'
    ) THEN
        ALTER TABLE assignment_questions DROP CONSTRAINT assignment_questions_assignment_id_fkey;
    END IF;
END $$;

-- Agregar constraint con CASCADE para assignment_id
ALTER TABLE assignment_questions 
ADD CONSTRAINT assignment_questions_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;

-- 8. MÓDULOS - Eliminar cuando se elimina el curso
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'modules_course_id_fkey' 
        AND table_name = 'modules'
    ) THEN
        ALTER TABLE modules DROP CONSTRAINT modules_course_id_fkey;
    END IF;
END $$;

-- Agregar constraint con CASCADE para course_id
ALTER TABLE modules 
ADD CONSTRAINT modules_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- 9. LESSONS - Eliminar cuando se elimina el módulo
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lessons_module_id_fkey' 
        AND table_name = 'lessons'
    ) THEN
        ALTER TABLE lessons DROP CONSTRAINT lessons_module_id_fkey;
    END IF;
END $$;

-- Agregar constraint con CASCADE para module_id
ALTER TABLE lessons 
ADD CONSTRAINT lessons_module_id_fkey 
FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;

-- 10. PROGRESS - Eliminar cuando se elimina el usuario o la lección
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'progress_user_id_fkey' 
        AND table_name = 'progress'
    ) THEN
        ALTER TABLE progress DROP CONSTRAINT progress_user_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'progress_lesson_id_fkey' 
        AND table_name = 'progress'
    ) THEN
        ALTER TABLE progress DROP CONSTRAINT progress_lesson_id_fkey;
    END IF;
END $$;

-- Agregar constraints con CASCADE para progress
ALTER TABLE progress 
ADD CONSTRAINT progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE progress 
ADD CONSTRAINT progress_lesson_id_fkey 
FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;

-- Crear índices para mejorar performance en las eliminaciones
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions(graded_by);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_student_id ON evaluation_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_graded_by ON evaluation_scores(graded_by);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);

-- Función para verificar las constraints actuales
CREATE OR REPLACE FUNCTION check_foreign_key_constraints()
RETURNS TABLE (
    table_name text,
    column_name text,
    referenced_table text,
    referenced_column text,
    delete_rule text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.table_name::text,
        kcu.column_name::text,
        ccu.table_name::text AS referenced_table,
        ccu.column_name::text AS referenced_column,
        rc.delete_rule::text
    FROM 
        information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
            ON rc.constraint_name = tc.constraint_name
    WHERE 
        tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'users'
        AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
END;
$$ LANGUAGE plpgsql;

-- Comentarios explicativos sobre las políticas de eliminación aplicadas:
/*
POLÍTICAS DE ELIMINACIÓN APLICADAS:

1. ON DELETE CASCADE (Eliminación automática):
   - enrollments.user_id → users.id (Las matrículas se eliminan con el estudiante)
   - assignment_submissions.student_id → users.id (Las entregas se eliminan con el estudiante)
   - evaluation_scores.student_id → users.id (Las calificaciones se eliminan con el estudiante)
   - assignments.course_id → courses.id (Las tareas se eliminan con el curso)
   - modules.course_id → courses.id (Los módulos se eliminan con el curso)
   - lessons.module_id → modules.id (Las lecciones se eliminan con el módulo)
   - progress.user_id → users.id (El progreso se elimina con el usuario)
   - progress.lesson_id → lessons.id (El progreso se elimina con la lección)

2. ON DELETE SET NULL (Preservar registro, limpiar referencia):
   - assignment_submissions.graded_by → users.id (Preservar entrega, limpiar calificador)
   - evaluation_scores.graded_by → users.id (Preservar calificación, limpiar calificador)
   - announcements.created_by → users.id (Preservar anuncio, limpiar creador)

3. ON DELETE RESTRICT (Prevenir eliminación):
   - courses.teacher_id → users.id (No permitir eliminar profesor con cursos activos)

Esta configuración garantiza:
- Integridad referencial
- Prevención de eliminaciones accidentales críticas
- Eliminación automática de datos dependientes
- Preservación del historial cuando es apropiado
*/
