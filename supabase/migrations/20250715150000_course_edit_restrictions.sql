-- ============================================
-- MIGRACIÓN: Sin Restricciones de Edición de Cursos
-- Fecha: 15 de Julio, 2025
-- Descripción: PROFESORES y ADMINISTRADORES pueden editar cursos sin restricciones
-- NOTA: Los profesores SIEMPRE pueden editar todo (datos y contenido)
-- NOTA: Los administradores SIEMPRE pueden editar todo (datos y contenido)
-- ============================================

-- Primero eliminar objetos dependientes para evitar errores
DROP VIEW IF EXISTS course_edit_permissions CASCADE;
DROP POLICY IF EXISTS "Prevent course editing with enrolled students" ON courses;

-- Eliminar funciones existentes con CASCADE
DROP FUNCTION IF EXISTS has_enrolled_students(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_edit_course(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_enrolled_students_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_course_edit_permission(UUID, UUID, text) CASCADE;

-- Función para verificar si un curso tiene estudiantes matriculados
CREATE FUNCTION has_enrolled_students(course_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM enrollments 
    WHERE course_id = course_id_param 
    AND is_active = true
  );
END;
$$;

-- Función para verificar si un usuario puede editar datos iniciales de un curso
CREATE FUNCTION can_edit_course(course_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_roles text[];
  is_teacher boolean;
  has_students boolean;
BEGIN
  -- Obtener el rol del usuario (array)
  SELECT u.role INTO user_roles
  FROM users u
  WHERE u.id = user_id_param;
  
  -- Verificar si es el profesor del curso
  SELECT EXISTS (
    SELECT 1 
    FROM courses 
    WHERE id = course_id_param 
    AND teacher_id = user_id_param
  ) INTO is_teacher;
  
  -- Si no es el profesor ni administrador, no puede editar
  IF NOT is_teacher AND NOT ('admin' = ANY(user_roles)) THEN
    RETURN false;
  END IF;
  
  -- Los profesores SIEMPRE pueden editar (sin restricciones)
  IF is_teacher THEN
    RETURN true;
  END IF;
  
  -- Para administradores, verificar si hay estudiantes matriculados
  SELECT has_enrolled_students(course_id_param) INTO has_students;
  
  -- Los administradores pueden editar siempre (incluso con estudiantes matriculados)
  IF 'admin' = ANY(user_roles) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Función para obtener el conteo de estudiantes matriculados
CREATE FUNCTION get_enrolled_students_count(course_id_param UUID)
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM enrollments
    WHERE course_id = course_id_param
    AND is_active = true
  );
END;
$$;

-- Función para verificar permisos específicos por tipo de operación
CREATE FUNCTION check_course_edit_permission(
  course_id_param UUID, 
  user_id_param UUID, 
  operation_type text DEFAULT 'edit_course_data'
)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_roles text[];
  is_teacher boolean;
  enrolled_count integer;
  course_name text;
  result json;
BEGIN
  -- Obtener información del usuario (array de roles)
  SELECT u.role INTO user_roles
  FROM users u
  WHERE u.id = user_id_param;
  
  -- Obtener información del curso
  SELECT c.name, (c.teacher_id = user_id_param)
  INTO course_name, is_teacher
  FROM courses c
  WHERE c.id = course_id_param;
  
  -- Obtener conteo de estudiantes matriculados
  SELECT get_enrolled_students_count(course_id_param) INTO enrolled_count;
  
  -- Construir resultado basado en el tipo de operación
  result := json_build_object(
    'can_edit', 
    CASE 
      WHEN operation_type = 'edit_course_data' THEN
        -- Para datos iniciales del curso: 
        -- - Profesores: SIEMPRE pueden editar (sin restricciones)
        -- - Administradores: SIEMPRE pueden editar
        CASE 
          WHEN is_teacher THEN true
          WHEN 'admin' = ANY(user_roles) THEN true
          ELSE false
        END
      WHEN operation_type = 'edit_course_content' THEN
        -- Para contenido del curso: siempre si es profesor o admin
        CASE 
          WHEN is_teacher OR 'admin' = ANY(user_roles) THEN true
          ELSE false
        END
      WHEN operation_type = 'edit_description_only' THEN
        -- Para editar solo descripción: profesor o admin siempre
        CASE 
          WHEN is_teacher OR 'admin' = ANY(user_roles) THEN true
          ELSE false
        END
      ELSE false
    END,
    'enrolled_count', enrolled_count,
    'is_teacher', is_teacher,
    'is_admin', ('admin' = ANY(user_roles)),
    'course_name', course_name,
    'operation_type', operation_type,
    'can_edit_description_only', (is_teacher OR 'admin' = ANY(user_roles)),
    'restriction_reason', 
    CASE 
      WHEN operation_type = 'edit_course_data' THEN
        CASE 
          WHEN NOT is_teacher AND NOT ('admin' = ANY(user_roles)) THEN 'not_authorized'
          ELSE null
        END
      WHEN operation_type = 'edit_course_content' THEN
        CASE 
          WHEN NOT is_teacher AND NOT ('admin' = ANY(user_roles)) THEN 'not_authorized'
          ELSE null
        END
      WHEN operation_type = 'edit_description_only' THEN
        CASE 
          WHEN NOT is_teacher AND NOT ('admin' = ANY(user_roles)) THEN 'not_authorized'
          ELSE null
        END
      ELSE 'invalid_operation'
    END
  );
  
  RETURN result;
END;
$$;

-- Política adicional para proteger edición de cursos con estudiantes matriculados
-- Nota: Esta política se aplica a nivel de fila para operaciones UPDATE
CREATE POLICY "Prevent course editing with enrolled students" ON courses
  FOR UPDATE 
  USING (
    -- Permitir edición si:
    -- 1. Es profesor del curso (SIN restricciones)
    -- 2. Es administrador (SIN restricciones)
    teacher_id = auth.uid() OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND 'admin' = ANY(role)
    )
  );

-- Vista para facilitar consultas de permisos de edición
CREATE VIEW course_edit_permissions AS
SELECT 
  c.id as course_id,
  c.name as course_name,
  c.teacher_id,
  u.name as teacher_name,
  get_enrolled_students_count(c.id) as enrolled_students_count,
  has_enrolled_students(c.id) as has_enrolled_students,
  c.is_active,
  c.created_at,
  c.updated_at
FROM courses c
JOIN users u ON u.id = c.teacher_id;

-- Conceder permisos para usar las funciones
GRANT EXECUTE ON FUNCTION has_enrolled_students(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_course(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_enrolled_students_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_course_edit_permission(UUID, UUID, text) TO authenticated;
GRANT SELECT ON course_edit_permissions TO authenticated;

-- Comentarios para documentación
COMMENT ON FUNCTION has_enrolled_students(UUID) IS 'Verifica si un curso tiene estudiantes matriculados activos';
COMMENT ON FUNCTION can_edit_course(UUID, UUID) IS 'Verifica si un usuario puede editar un curso - Profesores SIN restricciones, Administradores SIN restricciones';
COMMENT ON FUNCTION get_enrolled_students_count(UUID) IS 'Obtiene el número de estudiantes matriculados activos en un curso';
COMMENT ON FUNCTION check_course_edit_permission(UUID, UUID, text) IS 'Verifica permisos de edición diferenciando entre datos iniciales y contenido del curso';
COMMENT ON VIEW course_edit_permissions IS 'Vista con información de permisos de edición de datos iniciales de cursos';
