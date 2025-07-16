import { useState, useEffect } from 'react';
import { BookOpen, Award, TrendingUp, FileText, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';

interface Course {
  id: string;
  name: string;
  description: string;
  credits: number;
  teacher_name: string;
  course_code: string;
  start_date: string;
  end_date: string;
}

interface Grade {
  id: string;
  assignment_id: string;
  assignment_title: string;
  assignment_type: 'form' | 'external_form' | 'file_upload';
  score: number;
  max_score: number;
  percentage: number;
  feedback: string;
  graded_at: string;
  due_date: string;
  course_id: string;
  course_name: string;
  course_code: string;
}

interface CourseStats {
  total_assignments: number;
  completed_assignments: number;
  average_score: number;
  total_points: number;
  max_points: number;
}

const Grades = () => {
  const { user } = useAuth();
  const { showError } = useNotifications();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      if (selectedCourse === 'all') {
        fetchAllGrades();
        fetchAllCoursesStats();
      } else {
        fetchGrades();
        fetchCourseStats();
      }
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses(
            id,
            name,
            description,
            credits,
            course_code,
            teacher_id
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true); // Cambiar de 'status' a 'is_active'

      if (error) throw error;

      // Buscar información dos professores separadamente
      const teacherIds = (data || []).map(enrollment => (enrollment as any).courses.teacher_id);

      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', teacherIds);

      if (teachersError) throw teachersError;

      const teachersMap = (teachersData || []).reduce((acc, teacher) => {
        acc[teacher.id] = teacher;
        return acc;
      }, {} as Record<string, any>);

      const coursesData = (data || []).map(enrollment => {
        const course = (enrollment as any).courses;
        const teacher = teachersMap[course.teacher_id];
        return {
          id: course.id,
          name: course.name,
          description: course.description,
          credits: course.credits || 0,
          teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Profesor no encontrado',
          course_code: course.course_code || '',
          start_date: '',
          end_date: ''
        };
      });

      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourse('all'); // Establecer "Todos los cursos" como predeterminado
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      showError(
        'Error al cargar cursos',
        'No fue posible cargar sus cursos.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllGrades = async () => {
    try {
      // Obtener todos los cursos del estudiante
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses(
            id,
            name,
            course_code
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (enrollmentsError) throw enrollmentsError;

      const courseIds = (enrollmentsData || []).map(enrollment => (enrollment as any).courses.id);
      
      if (courseIds.length === 0) {
        setGrades([]);
        return;
      }

      // Obtener todas las evaluaciones de todos los cursos
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, title, assignment_type, due_date, course_id, max_score')
        .in('course_id', courseIds);

      if (assignmentsError) throw assignmentsError;

      const assignmentIds = (assignmentsData || []).map(a => a.id);

      if (assignmentIds.length === 0) {
        setGrades([]);
        return;
      }

      // Buscar todas las calificaciones del estudiante
      const { data: gradesData, error: gradesError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user?.id)
        .in('assignment_id', assignmentIds)
        .not('grade', 'is', null)
        .order('graded_at', { ascending: false });

      if (gradesError) throw gradesError;

      // Crear mapas para assignments y courses
      const assignmentsMap = (assignmentsData || []).reduce((acc, assignment) => {
        acc[assignment.id] = assignment;
        return acc;
      }, {} as Record<string, any>);

      const coursesMap = (enrollmentsData || []).reduce((acc, enrollment) => {
        const course = (enrollment as any).courses;
        acc[course.id] = course;
        return acc;
      }, {} as Record<string, any>);

      // Procesar todas las notas
      const processedGrades = (gradesData || []).map(grade => {
        const assignment = assignmentsMap[grade.assignment_id];
        const course = coursesMap[assignment.course_id];
        const percentage = assignment.max_score > 0 ? (grade.grade / assignment.max_score) * 100 : 0;
        
        return {
          id: grade.id,
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          assignment_type: assignment.assignment_type,
          score: grade.grade,
          max_score: assignment.max_score,
          percentage: percentage,
          feedback: grade.feedback || '',
          graded_at: grade.graded_at,
          due_date: assignment.due_date,
          course_id: assignment.course_id,
          course_name: course.name,
          course_code: course.course_code || ''
        };
      });

      setGrades(processedGrades);
    } catch (error) {
      console.error('Error fetching all grades:', error);
      showError(
        'Error al cargar notas',
        'No fue posible cargar todas sus notas.',
        5000
      );
    }
  };

  const fetchAllCoursesStats = async () => {
    try {
      // Obtener todos los cursos del estudiante
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (enrollmentsError) throw enrollmentsError;

      const courseIds = (enrollmentsData || []).map(enrollment => enrollment.course_id);

      // Obtener todas las evaluaciones de todos los cursos
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, max_score, course_id')
        .in('course_id', courseIds);

      if (assignmentsError) throw assignmentsError;

      // Buscar todas las puntuaciones del estudiante
      const { data: scoresData, error: scoresError } = await supabase
        .from('assignment_submissions')
        .select('grade, assignment_id')
        .eq('student_id', user?.id)
        .in('assignment_id', assignmentsData?.map(a => a.id) || [])
        .not('grade', 'is', null);

      if (scoresError) throw scoresError;

      const totalAssignments = assignmentsData?.length || 0;
      const completedAssignments = scoresData?.length || 0;
      
      // Crear mapa de assignments para obtener max_score
      const assignmentsMap = (assignmentsData || []).reduce((acc, assignment) => {
        acc[assignment.id] = assignment;
        return acc;
      }, {} as Record<string, any>);

      // Calcular totales
      let totalPoints = 0;
      let maxPoints = 0;

      (scoresData || []).forEach(score => {
        const assignment = assignmentsMap[score.assignment_id];
        if (assignment) {
          totalPoints += score.grade;
          maxPoints += assignment.max_score;
        }
      });

      const averageScore = completedAssignments > 0 ? totalPoints / completedAssignments : 0;

      setCourseStats({
        total_assignments: totalAssignments,
        completed_assignments: completedAssignments,
        average_score: averageScore,
        total_points: totalPoints,
        max_points: maxPoints
      });
    } catch (error) {
      console.error('Error fetching all courses stats:', error);
    }
  };

  const fetchGrades = async () => {
    try {
      // Primero buscar las evaluaciones del curso seleccionado
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, title, assignment_type, due_date, course_id, max_score')
        .eq('course_id', selectedCourse);

      if (assignmentsError) throw assignmentsError;

      const assignmentIds = (assignmentsData || []).map(a => a.id);

      if (assignmentIds.length === 0) {
        setGrades([]);
        return;
      }

      // Buscar las calificaciones del estudiante en assignment_submissions
      const { data: gradesData, error: gradesError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user?.id)
        .in('assignment_id', assignmentIds)
        .not('grade', 'is', null) // Solo las que tienen calificación
        .order('graded_at', { ascending: false });

      if (gradesError) throw gradesError;

      // Buscar información del curso
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, name, course_code')
        .eq('id', selectedCourse)
        .single();

      if (courseError) throw courseError;

      // Crear mapa de assignments
      const assignmentsMap = (assignmentsData || []).reduce((acc, assignment) => {
        acc[assignment.id] = assignment;
        return acc;
      }, {} as Record<string, any>);

      // Procesar datos de las notas
      const processedGrades = (gradesData || []).map(grade => {
        const assignment = assignmentsMap[grade.assignment_id];
        const percentage = assignment.max_score > 0 ? (grade.grade / assignment.max_score) * 100 : 0;
        
        return {
          id: grade.id,
          assignment_id: assignment.id,
          assignment_title: assignment.title,
          assignment_type: assignment.assignment_type,
          score: grade.grade,
          max_score: assignment.max_score,
          percentage: percentage,
          feedback: grade.feedback || '',
          graded_at: grade.graded_at,
          due_date: assignment.due_date,
          course_id: assignment.course_id,
          course_name: courseData.name,
          course_code: courseData.course_code || ''
        };
      });

      setGrades(processedGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      showError(
        'Error al cargar notas',
        'No fue posible cargar sus notas.',
        5000
      );
    }
  };

  const fetchCourseStats = async () => {
    try {
      // Buscar todas las evaluaciones del curso
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, max_score')
        .eq('course_id', selectedCourse);

      if (assignmentsError) throw assignmentsError;

      // Buscar puntuaciones del estudiante en assignment_submissions
      const { data: scoresData, error: scoresError } = await supabase
        .from('assignment_submissions')
        .select('grade, assignment_id')
        .eq('student_id', user?.id)
        .in('assignment_id', assignmentsData?.map(a => a.id) || [])
        .not('grade', 'is', null); // Solo las que tienen calificación

      if (scoresError) throw scoresError;

      const totalAssignments = assignmentsData?.length || 0;
      const completedAssignments = scoresData?.length || 0;
      
      // Crear mapa de assignments para obtener max_score
      const assignmentsMap = (assignmentsData || []).reduce((acc, assignment) => {
        acc[assignment.id] = assignment;
        return acc;
      }, {} as Record<string, any>);

      // Calcular totales considerando el max_score de cada assignment
      let totalPoints = 0;
      let maxPoints = 0;

      (scoresData || []).forEach(score => {
        const assignment = assignmentsMap[score.assignment_id];
        if (assignment) {
          totalPoints += score.grade;
          maxPoints += assignment.max_score;
        }
      });

      const averageScore = completedAssignments > 0 ? totalPoints / completedAssignments : 0;

      setCourseStats({
        total_assignments: totalAssignments,
        completed_assignments: completedAssignments,
        average_score: averageScore,
        total_points: totalPoints,
        max_points: maxPoints
      });
    } catch (error) {
      console.error('Error fetching course stats:', error);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCourseColor = (courseCode: string) => {
    if (!courseCode) return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300';
    
    // Generar color basado en el código del curso
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
      hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getGradeBadge = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (percentage >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'form': return <FileText className="h-4 w-4" />;
      case 'external_form': return <Award className="h-4 w-4" />;
      case 'file_upload': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getAssignmentTypeName = (type: string) => {
    switch (type) {
      case 'form': return 'Formulario';
      case 'external_form': return 'Formulario Externo';
      case 'file_upload': return 'Archivo';
      default: return 'Desconocido';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Mis Notas
        </h1>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-sky-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Progreso Académico
          </span>
        </div>
      </div>

      {/* Course Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Seleccionar Curso
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            title="Seleccionar curso"
          >
            <option value="all">📊 Todos los cursos</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.course_code ? `${course.course_code} - ${course.name}` : course.name} - {course.teacher_name}
              </option>
            ))}
          </select>
        </div>

        {/* Course Stats */}
        {courseStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-sky-50 dark:bg-sky-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sky-600 dark:text-sky-400">Total de Evaluaciones</p>
                  <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                    {courseStats.total_assignments}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-sky-500" />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Completadas</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {courseStats.completed_assignments}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Promedio</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {courseStats.average_score.toFixed(1)}
                  </p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Puntaje</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {courseStats.total_points}/{courseStats.max_points}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grades List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {selectedCourse === 'all' ? 'Historial Completo de Notas' : 'Historial de Notas'}
          </h2>
          {selectedCourse === 'all' && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Mostrando todas las evaluaciones calificadas de todos sus cursos
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Evaluación
                </th>
                {selectedCourse === 'all' && (
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Curso
                  </th>
                )}
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tipo
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Puntuación
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nota
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Fecha
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Comentarios
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {grades.map((grade) => (
                <motion.tr
                  key={grade.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {grade.assignment_title}
                    </div>
                    {selectedCourse !== 'all' && (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {grade.course_name}
                      </div>
                    )}
                  </td>
                  {selectedCourse === 'all' && (
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCourseColor(grade.course_code)}`}>
                          {grade.course_code || 'N/A'}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {grade.course_name}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      {getAssignmentTypeIcon(grade.assignment_type)}
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {getAssignmentTypeName(grade.assignment_type)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${getGradeColor(grade.percentage)}`}>
                        {grade.score}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        / {grade.max_score}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGradeBadge(grade.percentage)}`}>
                        {grade.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(grade.graded_at).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {grade.feedback || 'Sin comentarios'}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {grades.length === 0 && (
          <div className="text-center py-12">
            <XCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Ninguna nota encontrada
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Aún no tienes notas registradas para este curso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Grades;
