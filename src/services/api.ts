import { supabase, isAuthError, handleAuthError } from '../config/supabase';
import type { User, Course, Announcement } from '../config/supabase';

// Wrapper for Supabase calls with automatic auth error handling
export const withAuthErrorHandling = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isAuthError(error)) {
      await handleAuthError(error);
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
    throw error;
  }
};

// Auth services
export const authService = {
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, userData: { name: string; role?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            name: userData.name,
            role: [userData.role || 'student'],
          },
        ]);

      if (profileError) throw profileError;
    }

    return data;
  },
};

// Course services
export const courseService = {
  async getCourses(userId?: string) {
    try {
      let query = supabase
        .from('courses')
        .select(`
          *,
          teacher:users!courses_teacher_id_fkey(id, name, email)
        `)
        .eq('is_active', true);

      if (userId) {
        query = query.select(`
          *,
          teacher:users!courses_teacher_id_fkey(id, name, email),
          enrollments!inner(user_id)
        `).eq('enrollments.user_id', userId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching courses:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching courses:', err);
      return [];
    }
  },

  async getCourseById(courseId: string, userId?: string) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
        *,
        teacher:users!courses_teacher_id_fkey(id, name, email),
        modules(
          *,
          lessons(*)
        )
      `)
        .eq('id', courseId)
        .single();

      if (error) {
        console.error('Error fetching course:', error);
        return null;
      }

      // Check if user is enrolled
      if (userId && data) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single();

        data.enrolled = !!enrollment;

        // Get completed lessons
        if (data.modules) {
          for (const module of data.modules) {
            if (module.lessons) {
              for (const lesson of module.lessons) {
                const { data: completion } = await supabase
                  .from('completed_lessons')
                  .select('*')
                  .eq('user_id', userId)
                  .eq('lesson_id', lesson.id)
                  .single();

                lesson.completed = !!completion;
              }
            }
          }
        }
      }

      return data;
    } catch (err) {
      console.error('Unexpected error fetching course:', err);
      return null;
    }
  },

  async enrollInCourse(userId: string, courseId: string) {
    const { data, error } = await supabase
      .from('enrollments')
      .insert([
        {
          user_id: userId,
          course_id: courseId,
        },
      ]);

    if (error) throw error;
    return data;
  },
};

// Announcement services
export const announcementService = {
  async getAnnouncements(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:users!announcements_created_by_fkey(id, name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching announcements:', err);
      return [];
    }
  },

  async createAnnouncement(title: string, content: string, createdBy: string) {
    const { data, error } = await supabase
      .from('announcements')
      .insert([
        {
          title,
          content,
          created_by: createdBy,
          is_active: true
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAnnouncement(id: string, title: string, content: string) {
    const { data, error } = await supabase
      .from('announcements')
      .update({ title, content })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAnnouncement(id: string) {
    // Soft delete: just deactivate the announcement
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async permanentDeleteAnnouncement(id: string) {
    // Hard delete: permanently remove from database
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reactivateAnnouncement(id: string) {
    // Reactivate a soft-deleted announcement
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
  },
};

// Student services
export const studentService = {
  async getEnrolledCourses(userId: string) {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(
            *,
            teacher:users!courses_teacher_id_fkey(id, name)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching enrolled courses:', error);
        return [];
      }
      return (data || []).map((enrollment: any) => enrollment.course).filter(Boolean);
    } catch (err) {
      console.error('Unexpected error fetching enrolled courses:', err);
      return [];
    }
  },

  async markLessonComplete(userId: string, lessonId: string) {
    const { data, error } = await supabase
      .from('completed_lessons')
      .upsert([
        {
          user_id: userId,
          lesson_id: lessonId,
        },
      ]);

    if (error) throw error;
    return data;
  },
};

// Teacher services
export const teacherService = {
  async getTeacherCourses(teacherId: string) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments(count),
          modules(
            id,
            lessons(id)
          )
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching teacher courses:', err);
      return [];
    }
  },

  async getStudentsInCourse(courseId: string) {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          student:users!enrollments_user_id_fkey(id, name, first_name, last_name, email)
        `)
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map(enrollment => enrollment.student).filter(Boolean);
    } catch (err) {
      console.error('Error fetching students in course:', err);
      return [];
    }
  },

  async getCourseAssignments(courseId: string) {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching course assignments:', err);
      return [];
    }
  },

  async getAssignmentGrades(assignmentId: string) {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('assignment_id', assignmentId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching assignment grades:', err);
      return [];
    }
  },

  async saveGrade(gradeData: {
    student_id: string;
    assignment_id: string;
    course_id: string;
    grade: number;
    comment?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('grades')
        .upsert(gradeData, {
          onConflict: 'student_id,assignment_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error saving grade:', err);
      throw err;
    }
  },
};

// Admin services
export const adminService = {
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching users:', err);
      return [];
    }
  },

  async updateUserRole(userId: string, role: string) {
    const { data, error } = await supabase
      .from('users')
      .update({ role: [role] })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUser(userId: string) {
    try {
      // Primeiro deletar o usuário da tabela users (isso vai cascatear para outras tabelas)
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) throw userError;

      // Depois deletar da auth (isso requer privilégios de admin)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      // Se não conseguir deletar da auth, não é um erro crítico
      if (authError) {
        console.warn('Could not delete user from auth:', authError);
      }
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  },

  async getSystemStats() {
    try {
      const [studentsResult, teachersResult, coursesResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }).cs('role', ['student']),
        supabase.from('users').select('id', { count: 'exact' }).cs('role', ['teacher']),
        supabase.from('courses').select('id', { count: 'exact' }).eq('is_active', true),
      ]);

      return {
        totalStudents: studentsResult.count || 0,
        totalTeachers: teachersResult.count || 0,
        totalCourses: coursesResult.count || 0,
      };
    } catch (err) {
      console.error('Error fetching system stats:', err);
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalCourses: 0,
      };
    }
  },
};