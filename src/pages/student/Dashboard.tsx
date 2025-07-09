import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, BarChart, Bell, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { motion } from 'framer-motion';

interface Course {
  id: string;
  name: string;
  period?: string;
  description: string;
  progress: number;
  teacher_name: string;
  period: string | null;
  image_url?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        // Buscar cursos matriculados
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('enrollments') 
          .select(`
            *,
            status,
            course:courses(
              *,
              teacher:users!courses_teacher_id_fkey(name, first_name, last_name)
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (enrollmentsError) throw enrollmentsError;

        // Extraer períodos únicos para filtro
        const uniquePeriods = [...new Set((enrollmentsData || [])
          .map((enrollment: any) => enrollment.course?.period)
          .filter(Boolean))];
        
        setPeriods(uniquePeriods);

        // Buscar desistencias recientes
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
          setRecentWithdrawals(withdrawalsData || []);
        }

        // Buscar lições completadas para calcular progresso
        const { data: completedLessons, error: completedError } = await supabase
          .from('completed_lessons')
          .select('lesson_id')
          .eq('user_id', user.id);

        if (completedError) throw completedError;

        const completedLessonIds = new Set((completedLessons || []).map(cl => cl.lesson_id));

        // Processar cursos com progresso
        const coursesWithProgress = await Promise.all(
          (enrollmentsData || []).map(async (enrollment: any) => {
            const course = enrollment.course;
            
            // Buscar total de lições do curso
            const { data: lessonsData, error: lessonsError } = await supabase
              .from('lessons')
              .select(`
                id,
                module:modules!inner(
                  course_id
                )
              `)
              .eq('modules.course_id', course.id);

            if (lessonsError) throw lessonsError;

            const totalLessons = lessonsData?.length || 0;
            const completedLessonsCount = (lessonsData || []).filter(lesson => 
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
              image_url: course.image_url
            };
          })
        );

        setCourses(coursesWithProgress);

        // Buscar anúncios recentes
        const { data: announcementsData, error: announcementsError } = await supabase
          .from('announcements')
          .select(`
            *,
            author:users!announcements_created_by_fkey(name, first_name, last_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (announcementsError) throw announcementsError;
        
        setAnnouncements((announcementsData || []).map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          date: ann.created_at,
          author: ann.author?.name || 
                 `${ann.author?.first_name || ''} ${ann.author?.last_name || ''}`.trim() || 
                 'Admin'
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setCourses([]);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
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
      
      {/* Filtro por período */}
      {periods.length > 0 && (
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
                {Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length)}%
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
                15 días
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
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
              <div className="h-32 bg-cover bg-center" 
                   style={{ 
                     backgroundImage: `url(${course.image_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'})` 
                   }}>
                <div className="h-full bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  {course.name}
                </h3>
                {course.period && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">
                    Período: {course.period}
                  </p>
                )}
                <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {course.description}
                </p>
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Profesor: {course.teacher_name}
                  </p>
                  {course.period && (
                    <p className="text-sm text-slate-500 dark:text-slate-500 flex items-center">
                      <Calendar size={14} className="mr-1" />
                      Período: {course.period}
                    </p>
                  )}
                </div>
                {course.period && (
                  <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                    Periodo: {course.period}
                  </p>
                )}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Progreso</span>
                    <span className="font-medium text-slate-800 dark:text-white">{course.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500" 
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
                <Link
                  to={`/student/courses/${course.id}`}
                  className="mt-2 inline-block text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Ver detalles
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Announcements */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center">
          <Bell size={18} className="mr-2 text-sky-600 dark:text-sky-400" />
          Anuncios importantes
        </h2>
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
      </div>
      
      {/* Desistencias Recientes */}
      {recentWithdrawals.length > 0 && (
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

export default StudentDashboard;