import { supabase } from '../config/supabase';

export interface CourseEditPermission {
  can_edit: boolean;
  enrolled_count: number;
  is_teacher: boolean;
  is_admin: boolean;
  course_name: string;
  restriction_reason: 'not_authorized' | 'has_enrolled_students' | null;
}

export interface CourseEditInfo {
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  enrolledStudentsCount: number;
  hasEnrolledStudents: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class CourseEditService {
  /**
   * Verifica si un usuario puede editar un curso específico
   */
  async checkEditPermission(courseId: string, userId: string): Promise<CourseEditPermission> {
    try {
      const { data, error } = await supabase
        .rpc('check_course_edit_permission', {
          course_id_param: courseId,
          user_id_param: userId
        });

      if (error) {
        console.error('Error checking course edit permission:', error);
        throw error;
      }

      return data as CourseEditPermission;
    } catch (error) {
      console.error('Error in checkEditPermission:', error);
      throw new Error('Error al verificar permisos de edición');
    }
  }

  /**
   * Obtiene información detallada sobre permisos de edición de un curso
   */
  async getCourseEditInfo(courseId: string): Promise<CourseEditInfo> {
    try {
      const { data, error } = await supabase
        .from('course_edit_permissions')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (error) {
        console.error('Error fetching course edit info:', error);
        throw error;
      }

      return {
        courseId: data.course_id,
        courseName: data.course_name,
        teacherId: data.teacher_id,
        teacherName: data.teacher_name,
        enrolledStudentsCount: data.enrolled_students_count,
        hasEnrolledStudents: data.has_enrolled_students,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in getCourseEditInfo:', error);
      throw new Error('Error al obtener información del curso');
    }
  }

  /**
   * Verifica si un curso tiene estudiantes matriculados
   */
  async hasEnrolledStudents(courseId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_enrolled_students', {
          course_id_param: courseId
        });

      if (error) {
        console.error('Error checking enrolled students:', error);
        throw error;
      }

      return data as boolean;
    } catch (error) {
      console.error('Error in hasEnrolledStudents:', error);
      throw new Error('Error al verificar estudiantes matriculados');
    }
  }

  /**
   * Obtiene el número de estudiantes matriculados en un curso
   */
  async getEnrolledStudentsCount(courseId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_enrolled_students_count', {
          course_id_param: courseId
        });

      if (error) {
        console.error('Error getting enrolled students count:', error);
        throw error;
      }

      return data as number;
    } catch (error) {
      console.error('Error in getEnrolledStudentsCount:', error);
      throw new Error('Error al obtener conteo de estudiantes');
    }
  }

  /**
   * Verifica múltiples cursos y sus permisos de edición
   */
  async checkMultipleCoursesEditPermission(
    courseIds: string[], 
    userId: string
  ): Promise<Record<string, CourseEditPermission>> {
    try {
      const promises = courseIds.map(courseId => 
        this.checkEditPermission(courseId, userId)
      );

      const results = await Promise.allSettled(promises);
      const permissions: Record<string, CourseEditPermission> = {};

      results.forEach((result, index) => {
        const courseId = courseIds[index];
        if (result.status === 'fulfilled') {
          permissions[courseId] = result.value;
        } else {
          console.error(`Error checking permission for course ${courseId}:`, result.reason);
          permissions[courseId] = {
            can_edit: false,
            enrolled_count: 0,
            is_teacher: false,
            is_admin: false,
            course_name: 'Error',
            restriction_reason: 'not_authorized'
          };
        }
      });

      return permissions;
    } catch (error) {
      console.error('Error in checkMultipleCoursesEditPermission:', error);
      throw new Error('Error al verificar permisos múltiples');
    }
  }

  /**
   * Obtiene todos los cursos con su información de permisos de edición
   */
  async getAllCoursesWithEditInfo(): Promise<CourseEditInfo[]> {
    try {
      const { data, error } = await supabase
        .from('course_edit_permissions')
        .select('*')
        .order('course_name');

      if (error) {
        console.error('Error fetching all courses edit info:', error);
        throw error;
      }

      return data.map(item => ({
        courseId: item.course_id,
        courseName: item.course_name,
        teacherId: item.teacher_id,
        teacherName: item.teacher_name,
        enrolledStudentsCount: item.enrolled_students_count,
        hasEnrolledStudents: item.has_enrolled_students,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getAllCoursesWithEditInfo:', error);
      throw new Error('Error al obtener información de cursos');
    }
  }

  /**
   * Obtiene mensaje de restricción amigable para el usuario
   */
  getRestrictionMessage(permission: CourseEditPermission): string {
    if (permission.can_edit) {
      return '';
    }

    switch (permission.restriction_reason) {
      case 'not_authorized':
        return 'No tienes permisos para editar este curso';
      case 'has_enrolled_students':
        return `No puedes editar este curso porque tiene ${permission.enrolled_count} estudiante${permission.enrolled_count === 1 ? '' : 's'} matriculado${permission.enrolled_count === 1 ? '' : 's'}`;
      default:
        return 'No puedes editar este curso';
    }
  }

  /**
   * Valida si se puede realizar una operación específica en un curso
   */
  async validateCourseOperation(
    courseId: string, 
    userId: string, 
    operation: 'edit' | 'delete' | 'deactivate'
  ): Promise<{ canProceed: boolean; message: string }> {
    try {
      const permission = await this.checkEditPermission(courseId, userId);
      
      if (permission.can_edit) {
        return { canProceed: true, message: '' };
      }

      let message = '';
      switch (operation) {
        case 'edit':
          message = this.getRestrictionMessage(permission);
          break;
        case 'delete':
          message = permission.restriction_reason === 'has_enrolled_students' 
            ? `No puedes eliminar este curso porque tiene ${permission.enrolled_count} estudiante${permission.enrolled_count === 1 ? '' : 's'} matriculado${permission.enrolled_count === 1 ? '' : 's'}`
            : 'No tienes permisos para eliminar este curso';
          break;
        case 'deactivate':
          message = permission.restriction_reason === 'has_enrolled_students'
            ? `No puedes desactivar este curso porque tiene ${permission.enrolled_count} estudiante${permission.enrolled_count === 1 ? '' : 's'} matriculado${permission.enrolled_count === 1 ? '' : 's'}`
            : 'No tienes permisos para desactivar este curso';
          break;
      }

      return { canProceed: false, message };
    } catch (error) {
      console.error('Error in validateCourseOperation:', error);
      return { 
        canProceed: false, 
        message: 'Error al validar la operación' 
      };
    }
  }
}

export const courseEditService = new CourseEditService();
export default courseEditService;
