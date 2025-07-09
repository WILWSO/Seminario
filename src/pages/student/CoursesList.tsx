import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, BookOpen, UserPlus, Check, Clock, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { courseService, studentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationSystem from '../../components/NotificationSystem';
import { supabase } from '../../config/supabase';

interface Course {
  id: string;
  name: string;
  description: string;
  professor: string;
  credits: number;
  enrolled: boolean;
  enrollment_available: boolean;
  enrollment_open: boolean;
  enrollment_start_date?: string;
  period?: string;
  enrollment_end_date?: string;
  max_students?: number;
  current_enrollments: number;
  image: string;
}

const CoursesList = () => {
  const { user } = useAuth();
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [unavailableCourses, setUnavailableCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false); 
  const [periods, setPeriods] = useState<string[]>([]);
  const [filter, setFilter] = useState({
    enrolled: 'all', // 'all', 'enrolled', 'available', 'unavailable'
    period: 'all'
  });

  const fetchAndProcessCourses = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Buscar todos os cursos ativos
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id, name, description, teacher_id, credits, image_url, syllabus_url, is_active, enrollment_open, period,
          teacher:users!courses_teacher_id_fkey(id, name, first_name, last_name),
          enrollments(count)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Extraer períodos únicos para filtro
      const uniquePeriods = [...new Set((coursesData || [])
        .map((course: any) => course.period)
        .filter(Boolean))];
      
      setPeriods(uniquePeriods);

      // Verificar matrículas do usuário
      const { data: userEnrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (enrollmentError) throw enrollmentError;

      const enrolledCourseIds = new Set(userEnrollments?.map(e => e.course_id) || []);

      // Verificar disponibilidade de matrícula para cada curso
      const coursesWithAvailability = await Promise.all(
        (coursesData || []).map(async (course: any) => {
          const { data: availabilityData, error: availabilityError } = await supabase
            .rpc('is_enrollment_available', { course_id: course.id });

          const isEnrolled = enrolledCourseIds.has(course.id);
          const enrollmentAvailable = !availabilityError && availabilityData && !isEnrolled;

          return {
            id: course.id,
            name: course.name,
            description: course.description || '',
            professor: course.teacher?.name || `${course.teacher?.first_name} ${course.teacher?.last_name}` || 'Professor',
            credits: course.credits,
            enrolled: isEnrolled,
            enrollment_available: enrollmentAvailable,
            enrollment_open: course.enrollment_open,
            enrollment_start_date: course.enrollment_start_date,
            period: course.period,
            enrollment_end_date: course.enrollment_end_date,
            max_students: course.max_students,
            current_enrollments: course.enrollments?.length || 0,
            image: course.image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'
          };
        })
      );
      
      setAllCourses(coursesWithAvailability);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setAllCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchAndProcessCourses();
  }, [fetchAndProcessCourses]);

  // Filter and categorize courses based on state changes
  useEffect(() => {
    const filterCourses = (courses: Course[]) => {
      return courses.filter(course => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return course.name.toLowerCase().includes(term) || 
               course.description.toLowerCase().includes(term) ||
               course.professor.toLowerCase().includes(term);
      });
    };

    // Separar cursos disponíveis e não disponíveis
    const available = allCourses.filter(course => course.enrollment_available && !course.enrolled);
    const unavailable = allCourses.filter(course => !course.enrollment_available && !course.enrolled);
    
    setAvailableCourses(filterCourses(available));
    setUnavailableCourses(filterCourses(unavailable));
    
    // Apply filters and search
    let result: Course[] = [];
    
    if (filter.enrolled === 'all') {
      result = filterCourses(allCourses);
    } else if (filter.enrolled === 'enrolled') {
      result = filterCourses(allCourses.filter(course => course.enrolled));
    } else if (filter.enrolled === 'available') {
      result = filterCourses(allCourses.filter(course => course.enrollment_available && !course.enrolled));
    } else if (filter.enrolled === 'unavailable') {
      result = filterCourses(allCourses.filter(course => !course.enrollment_available && !course.enrolled));
    }

    // Aplicar filtro de período
    if (filter.period !== 'all') {
      result = result.filter(course => course.period === filter.period);
    }
    
    setFilteredCourses(result);
  }, [allCourses, searchTerm, filter.enrolled, filter.period]);

  const handleEnrollment = async (courseId: string) => {
    if (!user?.id) return;
    
    setEnrollingCourseId(courseId);
    
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([{
          user_id: user.id,
          course_id: courseId,
          enrollment_date: new Date().toISOString(),
          is_active: true
        }]);

      if (error) throw error;

      // Atualizar a lista de cursos
      await fetchAndProcessCourses();
      
      // Encontrar o nome do curso para a notificação
      const course = allCourses.find(c => c.id === courseId);
      showSuccess(
        '¡Matrícula realizada con éxito!',
        `Te has matriculado en el curso "${course?.name || 'Curso'}". Ahora puedes acceder a todo el contenido.`,
        4000
      );
    } catch (error: any) {
      console.error('Error enrolling in course:', error);
      
      if (error.code === '23505') {
        showError(
          'Ya estás matriculado',
          'Ya tienes una matrícula activa en este curso.',
          3000
        );
      } else {
        showError(
          'Error en la matrícula',
          'No se pudo completar la matrícula. Por favor, intenta nuevamente.',
          4000
        );
      }
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const getEnrollmentStatus = (course: Course) => {
    if (course.enrolled) {
      return {
        text: 'Matriculado',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <Check size={16} />
      };
    }
    
    if (!course.enrollment_open) {
      return {
        text: 'Matrículas cerradas',
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: <Clock size={16} />
      };
    }
    
    if (course.enrollment_available) {
      return {
        text: 'Disponible para matrícula',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: <UserPlus size={16} />
      };
    }
    
    return {
      text: 'No disponible',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      icon: <Clock size={16} />
    };
  };

  const renderCourseCard = (course: Course) => {
    const status = getEnrollmentStatus(course);
    
    return (
      <motion.div
        key={course.id}
        whileHover={{ y: -5 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
      >
        <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${course.image})` }}></div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {course.name}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${status.color}`}>
              <span className="mr-1">{status.icon}</span>
              {status.text}
            </span>
          </div>
          
          <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
            {course.description}
          </p>
          
          <div className="mb-4 space-y-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Profesor:</span> {course.professor}
            </p>
            {course.period && (
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                <Calendar size={14} className="mr-1" />
                <span className="font-medium">Período:</span> {course.period}
              </p>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Créditos:</span> {course.credits}
            </p>
            {course.max_students && (
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                <Users size={14} className="mr-1" />
                <span className="font-medium">Cupos:</span> {course.current_enrollments}/{course.max_students}
              </p>
            )}
            {course.enrollment_end_date && course.enrollment_open && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium">Matrícula hasta:</span> {new Date(course.enrollment_end_date).toLocaleDateString('es-AR')}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Link
              to={`/student/courses/${course.id}`}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm"
            >
              <BookOpen size={16} className="mr-2" />
              Ver detalles
            </Link>
            
            {course.enrollment_available && !course.enrolled && (
              <button
                onClick={() => handleEnrollment(course.id)}
                disabled={enrollingCourseId === course.id}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrollingCourseId === course.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                ) : (
                  <UserPlus size={16} className="mr-2" />
                )}
                {enrollingCourseId === course.id ? 'Matriculando...' : 'Matricularse'}
              </button>
            )}
            
            {course.enrolled && (
              <Link
                to={`/student/courses/${course.id}`}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
              >
                <BookOpen size={16} className="mr-2" />
                Continuar curso
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    );
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
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Cursos disponibles
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Explora todos los cursos ofrecidos por SEMBRAR
          </p>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full md:w-auto px-4 py-2 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <Filter size={18} className="mr-2" />
              Filtros
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="mt-4 p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estado de inscripción
                </label>
                <select
                  value={filter.enrolled}
                  onChange={(e) => setFilter({ ...filter, enrolled: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="all">Todos los cursos</option>
                  <option value="enrolled">Cursos inscritos</option>
                  <option value="available">Cursos disponibles</option>
                  <option value="unavailable">Cursos no disponibles</option>
                </select>
              </div>
              
              {periods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Período académico
                  </label>
                  <select
                    value={filter.period}
                    onChange={(e) => setFilter({ ...filter, period: e.target.value })}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="all">Todos los períodos</option>
                    {periods.map(period => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Courses Grid */}
      {filter.enrolled === 'all' ? (
        <div className="space-y-8">
          {/* Cursos matriculados */}
          {allCourses.filter(c => c.enrolled).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
                <Check size={20} className="mr-2 text-green-600" />
                Mis cursos ({allCourses.filter(c => c.enrolled).length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCourses
                  .filter(course => course.enrolled)
                  .filter(course => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return course.name.toLowerCase().includes(term) || 
                           course.description.toLowerCase().includes(term) ||
                           course.professor.toLowerCase().includes(term);
                  })
                  .map(renderCourseCard)}
              </div>
            </div>
          )}
          
          {/* Cursos disponibles para matrícula */}
          {availableCourses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
                <UserPlus size={20} className="mr-2 text-green-600" />
                Cursos disponibles para matrícula ({availableCourses.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map(renderCourseCard)}
              </div>
            </div>
          )}
          
          {/* Cursos no disponibles */}
          {unavailableCourses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
                <Clock size={20} className="mr-2 text-amber-600" />
                Cursos no disponibles para matrícula ({unavailableCourses.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unavailableCourses.map(renderCourseCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length > 0 ? (
            filteredCourses.map(renderCourseCard)
          ) : (
            <div className="col-span-full py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                <Search size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                No se encontraron cursos
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Intenta ajustar tus filtros o términos de búsqueda
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Empty state when no courses at all */}
      {allCourses.length === 0 && !isLoading && (
        <div className="col-span-full py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
            <BookOpen size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
            No hay cursos disponibles
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            No hay cursos activos en este momento
          </p>
        </div>
      )}
    </div>
  );
};

export default CoursesList;