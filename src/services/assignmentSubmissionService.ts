import { supabase } from '../config/supabase';

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_type: 'form' | 'file';
  form_answers?: any;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  graded_at?: string;
  graded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubmissionData {
  assignment_id: string;
  student_id: string;
  submission_type: 'form' | 'file';
  form_answers?: any;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
}

export interface UpdateSubmissionData {
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  form_answers?: any;
}

class AssignmentSubmissionService {
  /**
   * Crea una nueva entrega de evaluación
   */
  static async createSubmission(data: CreateSubmissionData): Promise<AssignmentSubmission | null> {
    try {
      const { data: submission, error } = await supabase
        .from('assignment_submissions')
        .insert([{
          assignment_id: data.assignment_id,
          student_id: data.student_id,
          submission_type: data.submission_type,
          form_answers: data.form_answers,
          file_url: data.file_url,
          file_name: data.file_name,
          file_size: data.file_size,
          file_type: data.file_type,
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating submission:', error);
        return null;
      }

      return submission;
    } catch (error) {
      console.error('Error in createSubmission:', error);
      return null;
    }
  }

  /**
   * Actualiza una entrega existente
   */
  static async updateSubmission(
    assignmentId: string, 
    studentId: string, 
    data: UpdateSubmissionData
  ): Promise<AssignmentSubmission | null> {
    try {
      const { data: submission, error } = await supabase
        .from('assignment_submissions')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating submission:', error);
        return null;
      }

      return submission;
    } catch (error) {
      console.error('Error in updateSubmission:', error);
      return null;
    }
  }

  /**
   * Obtiene la entrega de un estudiante para una evaluación específica
   */
  static async getSubmission(
    assignmentId: string, 
    studentId: string
  ): Promise<AssignmentSubmission | null> {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró la entrega, es normal
          return null;
        }
        console.error('Error getting submission:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSubmission:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las entregas de un estudiante
   */
  static async getStudentSubmissions(studentId: string): Promise<AssignmentSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error getting student submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStudentSubmissions:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las entregas de una evaluación específica
   */
  static async getAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          student:users!student_id(
            id,
            name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error getting assignment submissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAssignmentSubmissions:', error);
      return [];
    }
  }

  /**
   * Verifica si existe una entrega para una evaluación y estudiante específicos
   */
  static async hasSubmission(assignmentId: string, studentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No se encontró la entrega
        }
        console.error('Error checking submission:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in hasSubmission:', error);
      return false;
    }
  }

  /**
   * Elimina una entrega (solo antes de ser calificada)
   */
  static async deleteSubmission(assignmentId: string, studentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .is('grade', null); // Solo si no está calificada

      if (error) {
        console.error('Error deleting submission:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSubmission:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de entregas para el dashboard
   */
  static async getSubmissionStats(studentId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    graded: number;
    averageGrade: number;
  }> {
    try {
      const submissions = await this.getStudentSubmissions(studentId);
      
      const stats = {
        total: submissions.length,
        completed: submissions.length,
        pending: 0, // Se calculará desde assignments
        graded: submissions.filter(s => s.grade !== null).length,
        averageGrade: 0
      };

      // Calcular promedio de calificaciones
      const gradedSubmissions = submissions.filter(s => s.grade !== null);
      if (gradedSubmissions.length > 0) {
        const totalGrade = gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);
        stats.averageGrade = totalGrade / gradedSubmissions.length;
      }

      return stats;
    } catch (error) {
      console.error('Error in getSubmissionStats:', error);
      return {
        total: 0,
        completed: 0,
        pending: 0,
        graded: 0,
        averageGrade: 0
      };
    }
  }
}

export default AssignmentSubmissionService;
