import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, Clock, CheckCircle, BarChart3, TrendingUp, Calendar, FileText, CheckSquare, XSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface EnrolledCourse {
  id: string;
  name: string;
  description: string;
  credits: number;
  period?: string | null;
  course_code: string;
  teacher_name: string;
  enrollment_date: string;
  status: 'in_progress' | 'completed' | 'not_started';
  final_grade?: number | null;
  observations?: string | null;
  completion_date?: string | null;
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
}

interface OverallStats {
  total_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  total_credits: number;
  completed_credits: number;
  approved_credits: number;
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
    approved_credits: 0,
    overall_average: 0,
    total_assignments: 0,
    graded_assignments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [periods, setPeriods] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchStudentProgress();
    }
  }, [user?.id]);

  const fetchStudentProgress = async () => {
    try {
      setIsLoading(true);

      // Buscar cursos matriculados com informações detalhadas
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          enrollment_date,
          status,
          final_grade,
          observations,
          completion_date,
          course:courses(
            id,
            name,
            description,
            credits,
            image_url,
            period,
            course_code,
            teacher:users!courses_teacher_id_fkey(name, first_name, last_name),
            modules(
              id,
              lessons(
                id,
                title,
                lesson_contents(id)
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

      // Buscar lições completadas pelo usuário
      // Obtener IDs de cursos para filtrar lecciones completadas
      const enrolledCourseIds = (enrollmentsData || []).map((enrollment: any) => enrollment.course?.id).filter(Boolean);
      
      // Buscar lecciones completadas por el usuario SOLO para los cursos matriculados
      const { data: completedLessons, error: completedError } = await supabase
        .from('completed_lessons')
        .select(`
          lesson_id,
          lessons!inner(
            id,
            modules!inner(
              course_id
            )
          )
        `)
        .eq('user_id', user?.id)
        .in('lessons.modules.course_id', enrolledCourseIds);

      if (completedError) throw completedError;

      const completedLessonIds = new Set(completedLessons?.map(cl => cl.lesson_id) || []);

      // Buscar notas do estudante
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

      // Extrair períodos únicos para filtro
      const uniquePeriods = [...new Set((enrollmentsData || [])
        .map((enrollment: any) => enrollment.course?.period)
        .filter(Boolean))];
      
      setPeriods(uniquePeriods);

      // Processar dados dos cursos com progresso detalhado
      const processedCourses: EnrolledCourse[] = (enrollmentsData || []).map((enrollment: any) => {
        const course = enrollment.course;
        const modules = course.modules || [];
        
        // Calcular progresso baseado em lições completadas
        const totalLessons = modules.reduce((sum: number, module: any) => 
          sum + (module.lessons?.length || 0), 0);
        
        const completedLessonsCount = modules.reduce((sum: number, module: any) => {
          return sum + (module.lessons?.filter((lesson: any) => 
            completedLessonIds.has(lesson.id)).length || 0);
        }, 0);

        // Calcular módulos completados (módulo é considerado completo se todas as lições foram completadas)
        const completedModules = modules.filter((module: any) => {
          const moduleLessons = module.lessons || [];
          return moduleLessons.length > 0 && 
                 moduleLessons.every((lesson: any) => completedLessonIds.has(lesson.id));
        }).length;

        const progressPercentage = totalLessons > 0 ? 
          Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100)) : 0;

        // Filtrar notas específicas do curso
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

        // Calcular promedio geral do curso
        const averageGrade = courseGrades.length > 0 ? 
          courseGrades.reduce((sum, grade) => sum + grade.percentage, 0) / courseGrades.length : 0;

        // Determinar status do curso
        let status: 'in_progress' | 'completed' | 'not_started' = 'not_started';
        if (enrollment.status === 'Approved' || enrollment.status === 'Failed' || enrollment.status === 'Auditing') {
          status = 'completed';
        } else if (completedLessonsCount > 0) {
          status = 'in_progress';
        }

        return {
          id: course.id,
          name: course.name,
          description: course.description || '',
          credits: course.credits,
          period: course.period,
          course_code: course.course_code || '',
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
          status: enrollment.status === 'In Progress' ? 'in_progress' : status,
          final_grade: enrollment.final_grade,
          observations: enrollment.observations,
          completion_date: enrollment.completion_date
        };
      });

      setEnrolledCourses(processedCourses);

      // Calcular estatísticas gerais do estudante
      const totalCourses = processedCourses.length;
      const completedCourses = processedCourses.filter(c => c.status === 'completed').length;
      const inProgressCourses = processedCourses.filter(c => c.status === 'in_progress').length;
      const totalCredits = processedCourses.reduce((sum, course) => sum + course.credits, 0);
      const completedCredits = processedCourses
        .filter(c => c.status === 'completed')
        .reduce((sum, course) => sum + course.credits, 0);
      const approvedCredits = processedCourses
        .filter(c => c.status === 'completed' && c.final_grade && c.final_grade >= 60)
        .reduce((sum, course) => sum + course.credits, 0);
      
      const allGrades = processedCourses.flatMap(course => course.grades);
      const overallAverage = allGrades.length > 0 ? 
        allGrades.reduce((sum, grade) => sum + grade.percentage, 0) / allGrades.length : 0;

      // Contar total de avaliações disponíveis
      const { count: totalAssignments, error: assignmentsCountError } = await supabase
        .from('assignments')
        .select('id', { count: 'exact' })
        .in('course_id', processedCourses.map(c => c.id));

      if (assignmentsCountError) throw assignmentsCountError;

      setOverallStats({
        total_courses: totalCourses,
        completed_courses: completedCourses,
        in_progress_courses: inProgressCourses,
        total_credits: totalCredits,
        completed_credits: completedCredits,
        approved_credits: approvedCredits,
        overall_average: overallAverage,
        total_assignments: totalAssignments || 0,
        graded_assignments: allGrades.length
      });

    } catch (error) {
      console.error('Error fetching student progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEnrollmentStatusIcon = (course: EnrolledCourse) => {
    if (course.status === 'completed') {
      if (course.final_grade && course.final_grade >= 60) {
        return <CheckSquare size={18} className="text-green-600 dark:text-green-400" />; 
      } else if (course.final_grade) {
        return <XSquare size={18} className="text-red-600 dark:text-red-400" />;
      } else {
        return <BookOpen size={18} className="text-purple-600 dark:text-purple-400" />;
      }
    }
    return <Clock size={18} className="text-blue-600 dark:text-blue-400" />;
  };

  const getEnrollmentStatusText = (course: EnrolledCourse) => {
    if (course.status === 'completed') {
      if (course.final_grade && course.final_grade >= 60) {
        return 'Aprobado'; 
      } else if (course.final_grade) {
        return 'Reprobado';
      } else {
        return 'Oyente';
      }
    }
    return 'En Progreso';
  };

  const getEnrollmentStatusColor = (course: EnrolledCourse) => {
    if (course.status === 'completed') {
      if (course.final_grade && course.final_grade >= 60) {
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; 
      } else if (course.final_grade) {
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      } else {
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      }
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Filter courses by period
  const filteredCourses = selectedPeriod === 'all' 
    ? enrolledCourses 
    : enrolledCourses.filter(course => course.period === selectedPeriod);

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
                Créditos Aprobados
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {overallStats.approved_credits}/{overallStats.total_credits}
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

      {/* Filtro por período */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Filtrar por período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
              title="Filtrar por período"
            >
              <option value="all">Todos los períodos</option>
              {periods.map(period => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Cursos */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Detalle por Curso
        </h2>

        {filteredCourses.map((course) => (
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
                      <Link 
                        to={`/student/courses/${course.id}`}
                        className="block group"
                        title={`Ir a los detalles del curso ${course.name}`}
                      >
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-200 cursor-pointer">
                          {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
                        </h3>
                      </Link>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                        <span className="font-medium">Profesor:</span> {course.teacher_name} • 
                        <span className="font-medium"> {course.credits} créditos</span>
                        {course.period && <span> • <span className="font-medium">Período:</span> {course.period}</span>}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${getEnrollmentStatusColor(course)}`}>
                          {getEnrollmentStatusIcon(course)}
                          <span className="ml-1">{getEnrollmentStatusText(course)}</span>
                        </span>
                        {course.final_grade && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(course.final_grade)}`}>
                            {course.final_grade}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progreso del Curso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Progreso del curso</span>
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {course.progress.percentage}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500" 
                        style={{ width: `${course.progress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500 mt-2">
                      <span className="flex items-center">
                        <CheckCircle size={12} className="mr-1" />
                        {course.progress.completed_lessons}/{course.progress.total_lessons} lecciones completadas
                      </span>
                      <span className="flex items-center">
                        <BookOpen size={12} className="mr-1" />
                        {course.progress.completed_modules}/{course.progress.total_modules} módulos completados
                      </span>
                    </div>
                  </div>

                  {/* Información de Matrícula */}
                  <div className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                    <div className="flex items-center mb-1">
                      <Calendar size={12} className="mr-1" />
                      <span>Matriculado el {new Date(course.enrollment_date).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </div>
                    {course.completion_date && (
                      <div className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        <span>Completado el {new Date(course.completion_date).toLocaleDateString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                    )}
                  </div>

                  {/* Botón de acceso rápido */}
                  <div className="mb-4">
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="inline-flex items-center px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 transition-colors duration-200"
                    >
                      <BookOpen size={16} className="mr-2" />
                      {course.status === 'completed' ? 'Revisar curso' : 'Continuar aprendiendo'}
                    </Link>
                  </div>

                  {/* Observaciones del profesor */}
                  {course.observations && (
                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-750 rounded-lg">
                      <h4 className="text-sm font-medium text-slate-800 dark:text-white mb-1">
                        Observaciones del profesor:
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {course.observations}
                      </p>
                    </div>
                  )}
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

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
              No hay cursos matriculados
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {selectedPeriod !== 'all' 
                ? `No hay cursos para el período ${selectedPeriod}`
                : 'Dirígete a la sección de cursos para matricularte en tu primer curso.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Progress;