-- ============================================
-- MIGRACIÓN: Rollback - Eliminar restricciones de edición de cursos
-- Fecha: 15 de Julio, 2025
-- Descripción: Elimina todas las funciones y políticas relacionadas con restricciones de edición
-- ============================================

-- Eliminar vista
DROP VIEW IF EXISTS course_edit_permissions CASCADE;

-- Eliminar política
DROP POLICY IF EXISTS "Prevent course editing with enrolled students" ON courses;

-- Eliminar funciones
DROP FUNCTION IF EXISTS has_enrolled_students(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_edit_course(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_enrolled_students_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_course_edit_permission(UUID, UUID, text) CASCADE;

-- Listo, sistema regresado al estado inicial sin restricciones
