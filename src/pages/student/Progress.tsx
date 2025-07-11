import { useState, useEffect } from 'react';
import { BookOpen, Award, Clock, CheckCircle, Circle, BarChart3, TrendingUp, Calendar, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface EnrolledCourse {
  id: string;
  name: string;
  description: string;
  credits: number;
  teacher_name: string;
  enrollment_date: string;
  image_url?: string;
  progress: {
    total_modules: number;
    completed_modules: number;
    total_lessons: number;
    completed_lessons: number;
    percentage: number;
  };
  grades: {
    assignment_id: string;
    assignment_title: string;
    grade: number;
    max_score: number;
    percentage: number;
    comment?: string;
    graded_at: string;
  }[];
  average_grade: number;
  status: 'in_progress' | 'completed' | 'not_started';
}

interface OverallStats {
  total_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  total_credits: number;
  completed_credits: number;
  overall_average: number;
  total_assignments: number;
  graded_assignments: number;
}

const Progress = () => {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    total_courses: 0,
    completed_courses: 0,
    in_progress_courses: 0,
    total_credits: 0,
    completed_credits: 0,
    overall_average: 0,
    total_assignments: 0,
    graded_assignments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchStudentProgress();
    }
  }, [user?.id]);

  const fetchStudentProgress = async () => {
    try {
      setIsLoading(true);

      // Buscar cursos matriculados
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          enrollment_date,
          course:courses(
            id,
            name,
            description,
            credits,
            image_url,
            teacher:users!courses_teacher_id_fkey(name, first_name, last_name),
            modules(
              id,
              lessons(
                id,
                title
              )
            ),
            assignments(
              id,
              title,
              max_score
            )
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (enrollmentsError) throw enrollmentsError;

      // Buscar lições completadas
      const { data: completedLessons, error: completedError } = await supabase
        .from('completed_lessons')
        .select('lesson_id')
        .eq('user_id', user?.id);

      if (completedError) throw completedError;

      const completedLessonIds = new Set(completedLessons?.map(cl => cl.lesson_id) || []);

      // Buscar notas
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          assignment_id,
          grade,
          comment,
          created_at,
          assignment:assignments(
            title,
            max_score,
            course_id
          )
        `)
        .eq('student_id', user?.id);

      if (gradesError) throw gradesError;

      // Processar dados dos cursos
      const processedCourses: EnrolledCourse[] = (enrollmentsData || []).map((enrollment: any) => {
        const course = enrollment.course;
        const modules = course.modules || [];
        const assignments = course.assignments || [];
        
        // Calcular progresso
        const totalLessons = modules.reduce((sum: number, module: any) => 
          sum + (module.lessons?.length || 0), 0);
        
        const completedLessonsCount = modules.reduce((sum: number, module: any) => {
          return sum + (module.lessons?.filter((lesson: any) => 
            completedLessonIds.has(lesson.id)).length || 0);
        }, 0);

        const completedModules = modules.filter((module: any) => {
          const moduleLessons = module.lessons || [];
          return moduleLessons.length > 0 && 
                 moduleLessons.every((lesson: any) => completedLessonIds.has(lesson.id));
        }).length;

        const progressPercentage = totalLessons > 0 ? 
          Math.round((completedLessonsCount / totalLessons) * 100) : 0;

        // Buscar notas do curso
        const courseGrades = (gradesData || [])
          .filter((grade: any) => grade.assignment?.course_id === course.id)
          .map((grade: any) => ({
            assignment_id: grade.assignment_id,
            assignment_title: grade.assignment?.title || 'Evaluación',
            grade: parseFloat(grade.grade),
            max_score: parseFloat(grade.assignment?.max_score || 100),
            percentage: Math.round((parseFloat(grade.grade) / parseFloat(grade.assignment?.max_score || 100)) * 100),
            comment: grade.comment,
            graded_at: grade.created_at
          }));

        // Calcular promedio del curso
        const averageGrade = courseGrades.length > 0 ? 
          courseGrades.reduce((sum, grade) => sum + grade.percentage, 0) / courseGrades.length : 0;

        // Determinar status
        let status: 'in_progress' | 'completed' | 'not_started' = 'not_started';
        if (completedLessonsCount > 0) {
          status = progressPercentage === 100 ? 'completed' : 'in_progress';
        }

        return {
          id: course.id,
          name: course.name,
          description: course.description || '',
          credits: course.credits,
          teacher_name: course.teacher?.name || 
                      `${course.teacher?.first_name || ''} ${course.teacher?.last_name || ''}`.trim() || 
                      'Profesor',
          enrollment_date: enrollment.enrollment_date,
          image_url: course.image_url,
          progress: {
            total_modules: modules.length,
            completed_modules: completedModules,
            total_lessons: totalLessons,
            completed_lessons: completedLessonsCount,
            percentage: progressPercentage
          },
          grades: courseGrades,
          average_grade: averageGrade,
          status
        };
      });

      setEnrolledCourses(processedCourses);

      // Calcular estatísticas gerais
      const totalCourses = processedCourses.length;
      const completedCourses = processedCourses.filter(c => c.status === 'completed').length;
      const inProgressCourses = processedCourses.filter(c => c.status === 'in_progress').length;
      const totalCredits = processedCourses.reduce((sum, course) => sum + course.credits, 0);
      const completedCredits = processedCourses
        .filter(c => c.status === 'completed')
        .reduce((sum, course) => sum + course.credits, 0);
      
      const allGrades = processedCourses.flatMap(course => course.grades);
      const overallAverage = allGrades.length > 0 ? 
        allGrades.reduce((sum, grade) => sum + grade.percentage, 0) / allGrades.length : 0;

      const totalAssignments = processedCourses.reduce((sum, course) => 
        sum + (course.course?.assignments?.length || 0), 0);

      setOverallStats({
        total_courses: totalCourses,
        completed_courses: completedCourses,
        in_progress_courses: inProgressCourses,
        total_credits: totalCredits,
        completed_credits: completedCredits,
        overall_average: overallAverage,
        total_assignments: totalAssignments,
        graded_assignments: allGrades.length
      });

    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En progreso';
      case 'not_started':
        return 'No iniciado';
      default:
        return 'Desconocido';
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Mi Progreso Académico
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Seguimiento detallado de tu rendimiento y avance en los cursos
        </p>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900 rounded-full flex items-center justify-center">
              <BookOpen className="text-sky-600 dark:text-sky-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cursos Matriculados
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {overallStats.total_courses}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cursos Completados
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {overallStats.completed_courses}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <Award className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Créditos Obtenidos
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {overallStats.completed_credits}/{overallStats.total_credits}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
              <TrendingUp className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Promedio General
              </h3>
              <p className={`text-2xl font-semibold ${getGradeColor(overallStats.overall_average)}`}>
                {overallStats.overall_average.toFixed(1)}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lista de Cursos */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Detalle por Curso
        </h2>

        {enrolledCourses.map((course) => (
          <motion.div
            key={course.id}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden mr-4">
                      <img
                        src={course.image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'}
                        alt={course.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">
                        {course.name}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        Profesor: {course.teacher_name} • {course.credits} créditos
                      </p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(course.status)}`}>
                        {getStatusText(course.status)}
                      </span>
                    </div>
                  </div>

                  {/* Progreso del Curso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400">Progreso del curso</span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        {course.progress.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300" 
                        style={{ width: `${course.progress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500 mt-1">
                      <span>
                        {course.progress.completed_lessons}/{course.progress.total_lessons} lecciones
                      </span>
                      <span>
                        {course.progress.completed_modules}/{course.progress.total_modules} módulos
                      </span>
                    </div>
                  </div>

                  {/* Información de Matrícula */}
                  <div className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                    <Calendar size={12} className="inline mr-1" />
                    Matriculado el {new Date(course.enrollment_date).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                {/* Calificaciones */}
                <div className="lg:ml-6 lg:w-80">
                  <div className="bg-slate-50 dark:bg-slate-750 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-800 dark:text-white flex items-center">
                        <BarChart3 size={16} className="mr-2" />
                        Calificaciones
                      </h4>
                      {course.average_grade > 0 && (
                        <span className={`text-lg font-bold ${getGradeColor(course.average_grade)}`}>
                          {course.average_grade.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {course.grades.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {course.grades.map((grade) => (
                          <div key={grade.assignment_id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-white">
                                {grade.assignment_title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                {new Date(grade.graded_at).toLocaleDateString('es-AR')}
                              </p>
                              {grade.comment && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {grade.comment}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-3">
                              <p className={`text-sm font-bold ${getGradeColor(grade.percentage)}`}>
                                {grade.grade}/{grade.max_score}
                              </p>
                              <p className={`text-xs ${getGradeColor(grade.percentage)}`}>
                                {grade.percentage}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          Sin calificaciones aún
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {enrolledCourses.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
              No hay cursos matriculados
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Dirígete a la sección de cursos para matricularte en tu primer curso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Progress;