import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, BarChart, Bell, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { motion } from 'framer-motion';
import { 
  CacheProvider 
} from '../../components/ui';
import { 
  useCache
} from '../../hooks';

interface Course {
  id: string;
  name: string;
  period?: string | null;
  description: string;
  progress: number;
  teacher_name: string;
  course_code: string;
  image_url?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  course_id: string;
  course_name: string;
  course_code: string;
  days_remaining: number;
}

// Componente interno con funcionalidad original + cache
const StudentDashboardContent = () => {
  const { user } = useAuth();
  const cache = useCache(); // Solo agregamos cache

  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [nextAssignment, setNextAssignment] = useState<Assignment | null>(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  
  // Estados de carga separados (mantenemos el comportamiento original)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    // Iniciar carga de cursos inmediatamente (contenido principal)
    fetchCourses();
    
    // Cargar otros datos con pequeños delays para priorizar cursos
    const timers = [
      setTimeout(() => fetchAnnouncements(), 150),
      setTimeout(() => fetchAssignments(), 300),
      setTimeout(() => fetchWithdrawals(), 450)
    ];

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [user?.id]);

  const fetchCourses = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingCourses(true);

      // Cache simple para cursos
      const cacheKey = `courses_${user.id}`;
      const cachedCourses = cache.get<Course[]>(cacheKey);
      if (cachedCourses) {
        setCourses(cachedCourses);
        setIsLoadingCourses(false);
        // Obtener períodos únicos del cache
        const uniquePeriods = [...new Set(cachedCourses
          .map(course => course.period)
          .filter((period): period is string => Boolean(period)))];
        setPeriods(uniquePeriods);
        return;
      }
      
      // Buscar cursos matriculados con consulta optimizada
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          status,
          course:courses(
            id,
            name,
            description,
            period,
            course_code,
            image_url,
            teacher:users!courses_teacher_id_fkey(name, first_name, last_name)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(20); // Limitar resultados

      if (enrollmentsError) throw enrollmentsError;

      // Extraer períodos únicos
      const uniquePeriods = [...new Set((enrollmentsData || [])
        .map((enrollment: any) => enrollment.course?.period)
        .filter((period): period is string => Boolean(period)))];
      setPeriods(uniquePeriods);

      // Obtener IDs de cursos para buscar lecciones
      const courseIds = (enrollmentsData || []).map((enrollment: any) => enrollment.course?.id).filter(Boolean);
      
      if (courseIds.length === 0) {
        setCourses([]);
        return;
      }

      // Buscar lecciones completadas por el usuario
      const { data: completedLessons, error: completedError } = await supabase
        .from('completed_lessons')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (completedError) throw completedError;

      const completedLessonIds = new Set((completedLessons || []).map(cl => cl.lesson_id));

      // Buscar todas las lecciones de los cursos matriculados
      const { data: allLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          module:modules!inner(
            course_id
          )
        `)
        .in('modules.course_id', courseIds);

      if (lessonsError) throw lessonsError;

      // Agrupar lecciones por curso
      const lessonsByCourse = (allLessons || []).reduce((acc: any, lesson: any) => {
        const courseId = lesson.module?.course_id;
        if (!acc[courseId]) acc[courseId] = [];
        acc[courseId].push(lesson);
        return acc;
      }, {});

      // Procesar cursos con progreso
      const coursesWithProgress = (enrollmentsData || []).map((enrollment: any) => {
        const course = enrollment.course;
        const courseLessons = lessonsByCourse[course.id] || [];
        const totalLessons = courseLessons.length;
        const completedLessonsCount = courseLessons.filter((lesson: any) =>
          completedLessonIds.has(lesson.id)
        ).length;

        const progress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

        return {
          id: course.id,
          name: course.name,
          description: course.description || '',
          progress,
          period: course.period,
          teacher_name: course.teacher?.name ||
            `${course.teacher?.first_name || ''} ${course.teacher?.last_name || ''}`.trim() ||
            'Professor',
          course_code: course.course_code || '',
          image_url: course.image_url
        };
      });

      setCourses(coursesWithProgress);
      // Cache por 2 minutos
      cache.set(cacheKey, coursesWithProgress, 2 * 60 * 1000);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setIsLoadingAnnouncements(true);

      // Cache para anuncios
      const cacheKey = 'announcements_recent';
      const cachedAnnouncements = cache.get<Announcement[]>(cacheKey);
      if (cachedAnnouncements) {
        setAnnouncements(cachedAnnouncements);
        setIsLoadingAnnouncements(false);
        return;
      }
      
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          created_at,
          author:users!announcements_created_by_fkey(name, first_name, last_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (announcementsError) throw announcementsError;

      const processedAnnouncements = (announcementsData || []).map((ann: any) => ({
        id: ann.id,
        title: ann.title,
        content: ann.content,
        date: ann.created_at,
        author: ann.author?.name ||
          `${ann.author?.first_name || ''} ${ann.author?.last_name || ''}`.trim() ||
          'Admin'
      }));

      setAnnouncements(processedAnnouncements);
      // Cache por 5 minutos
      cache.set(cacheKey, processedAnnouncements, 5 * 60 * 1000);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const fetchAssignments = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingAssignments(true);

      // Cache para tareas
      const cacheKey = `assignments_${user.id}`;
      const cachedAssignment = cache.get<Assignment | null>(cacheKey);
      if (cachedAssignment !== undefined) {
        setNextAssignment(cachedAssignment);
        setIsLoadingAssignments(false);
        return;
      }
      
      // Obtener IDs de cursos matriculados
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledCourseIds = (enrollmentsData || []).map((enrollment: any) => enrollment.course_id);
      
      if (enrolledCourseIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            course_id,
            course:courses(name, course_code)
          `)
          .in('course_id', enrolledCourseIds)
          .gte('due_date', new Date().toISOString())
          .eq('is_active', true)
          .order('due_date', { ascending: true })
          .limit(1);

        if (!assignmentsError && assignmentsData && assignmentsData.length > 0) {
          const assignment = assignmentsData[0];
          const dueDate = new Date(assignment.due_date);
          const today = new Date();
          const timeDiff = dueDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

          const nextAssignmentData = {
            id: assignment.id,
            title: assignment.title,
            due_date: assignment.due_date,
            course_id: assignment.course_id,
            course_name: (assignment.course as any)?.name || 'Curso sin nombre',
            course_code: (assignment.course as any)?.course_code || '',
            days_remaining: daysRemaining
          };

          setNextAssignment(nextAssignmentData);
          // Cache por 2 minutos
          cache.set(cacheKey, nextAssignmentData, 2 * 60 * 1000);
        } else {
          setNextAssignment(null);
          cache.set(cacheKey, null, 2 * 60 * 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setNextAssignment(null);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const fetchWithdrawals = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingWithdrawals(true);

      // Cache para desistencias
      const cacheKey = `withdrawals_${user.id}`;
      const cachedWithdrawals = cache.get<any[]>(cacheKey);
      if (cachedWithdrawals) {
        setRecentWithdrawals(cachedWithdrawals);
        setIsLoadingWithdrawals(false);
        return;
      }
      
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          completion_date,
          observations,
          course:courses(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'Desistido')
        .order('completion_date', { ascending: false })
        .limit(3);

      if (!withdrawalsError) {
        const withdrawals = withdrawalsData || [];
        setRecentWithdrawals(withdrawals);
        // Cache por 2 minutos
        cache.set(cacheKey, withdrawals, 2 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      setRecentWithdrawals([]);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  // Skeleton para cursos
  const CoursesSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden animate-pulse">
          <div className="h-32 bg-slate-200 dark:bg-slate-700"></div>
          <div className="p-6">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Skeleton para anuncios
  const AnnouncementsSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md">
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 animate-pulse">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Mostrar skeleton solo si los cursos están cargando
  if (isLoadingCourses) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-2"></div>
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-96"></div>
          </div>
          <div className="mt-4 md:mt-0 animate-pulse">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-40"></div>
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 animate-pulse">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="ml-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-8"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Courses skeleton */}
        <div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4 animate-pulse"></div>
          <CoursesSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Bienvenido, {user?.name || `${user?.first_name} ${user?.last_name}`}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Este es tu panel de estudiante. Aquí puedes ver tus cursos y anuncios importantes.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/student/courses"
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <BookOpen size={18} className="mr-2" />
            Ver todos los cursos
          </Link>
        </div>
      </div>      

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                Cursos activos
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {courses.length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
              <BarChart className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Progreso promedio
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {courses.length > 0 
                  ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length)
                  : 0
                }%
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
              <Clock className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Próximo examen
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {isLoadingAssignments ? (
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
                ) : (
                  nextAssignment 
                    ? nextAssignment.days_remaining > 0 
                      ? `${nextAssignment.days_remaining} días` 
                      : nextAssignment.days_remaining === 0 
                        ? 'Hoy' 
                        : 'Vencido'
                    : 'Sin exámenes'
                )}
              </p>
              {nextAssignment && !isLoadingAssignments && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {nextAssignment.title} - {nextAssignment.course_code ? `${nextAssignment.course_code} - ${nextAssignment.course_name}` : nextAssignment.course_name}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Filtro por período */}
      {periods.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Filtrar por período
              </label>
              <select
                title='Filtrar por período'
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
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
      )}

      {/* Recent Courses */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
          Mis cursos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses
            .filter(course => selectedPeriod === 'all' || course.period === selectedPeriod)
            .map((course) => (
              <motion.div
                key={course.id}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
              >
                <div className="h-32 bg-cover bg-center bg-gray-200 dark:bg-gray-700"
                  style={{
                    backgroundImage: `url(${course.image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'})`
                  }}>
                  <div className="h-full bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                    {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="mb-4 space-y-1">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium">Profesor:</span> {course.teacher_name}
                    </p>
                    {course.period && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span className="font-medium">Período:</span> {course.period}
                      </p>
                    )}                     
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Progreso</span>
                      <span className="font-medium text-slate-800 dark:text-white">{course.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 transition-all duration-300"
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <Link
                    to={`/student/courses/:${course.id}`}
                    className="mt-2 inline-block text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    Ver detalles
                  </Link>
                </div>
              </motion.div>
            ))}

          {courses.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                <BookOpen size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                No hay cursos matriculados
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Explora nuestros cursos disponibles y matricúlate en uno.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Announcements */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
          <Bell size={18} className="mr-2 text-sky-600 dark:text-sky-400" />
          Anuncios importantes
        </h2>
        
        {isLoadingAnnouncements ? (
          <AnnouncementsSkeleton />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md">
            {announcements.map((announcement, index) => (
              <div
                key={announcement.id}
                className={`p-6 ${index !== announcements.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}
              >
                <div className="flex items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                      {announcement.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      {announcement.content}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      {new Date(announcement.date).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {announcements.length === 0 && (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                  No hay anuncios disponibles
                </h3>
                <p>No hay anuncios recientes para mostrar.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desistencias Recientes */}
      {!isLoadingWithdrawals && recentWithdrawals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
            <LogOut size={18} className="mr-2 text-red-600 dark:text-red-400" />
            Desistencias recientes
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md">
            {recentWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="p-6 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="flex items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
                      {withdrawal.course?.name}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      {withdrawal.observations}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      {new Date(withdrawal.completion_date).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente principal con CacheProvider (única optimización visible)
const StudentDashboard = () => {
  return (
    <CacheProvider>
      <StudentDashboardContent />
    </CacheProvider>
  );
};

export default StudentDashboard;