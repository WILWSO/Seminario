import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Bell, User, PlusCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { motion } from 'framer-motion';

interface StatsData {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  recentAnnouncements: number;
}

interface RecentActivity {
  id: number;
  type: 'enrollment' | 'announcement' | 'user' | 'course';
  description: string;
  date: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    recentAnnouncements: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar estatísticas do sistema
        const [usersResult, coursesResult, announcementsResult] = await Promise.all([
          supabase.from('users').select('id, role', { count: 'exact' }),
          supabase.from('courses').select('id', { count: 'exact' }).eq('is_active', true),
          supabase.from('announcements').select('id', { count: 'exact' })
        ]);

        // Contar usuários por role
        const users = usersResult.data || [];
        const totalStudents = users.filter(user => user.role?.includes('student')).length;
        const totalTeachers = users.filter(user => user.role?.includes('teacher')).length;
        const totalCourses = coursesResult.count || 0;
        const recentAnnouncements = announcementsResult.count || 0;

        setStats({
          totalStudents,
          totalTeachers,
          totalCourses,
          recentAnnouncements
        });
        
        // Buscar atividades recentes reais
        const [recentEnrollments, fetchedAnnouncementsResult, recentUsers, recentCourses] = await Promise.all([
          supabase
            .from('enrollments')
            .select(`
              id,
              enrollment_date,
              course:courses(name),
              user:users(name, first_name, last_name)
            `)
            .order('enrollment_date', { ascending: false })
            .limit(2),
          
          supabase
            .from('announcements')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })
            .limit(2),
          
          supabase
            .from('users')
            .select('id, name, first_name, last_name, created_at, role')
            .order('created_at', { ascending: false })
            .limit(2),
          
          supabase
            .from('courses')
            .select('id, name, created_at')
            .order('created_at', { ascending: false })
            .limit(2)
        ]);

        // Processar atividades recentes
        const activities: RecentActivity[] = [];
        let activityId = 1;

        // Adicionar matrículas recentes
        (recentEnrollments.data || []).forEach(enrollment => {
          const user = enrollment.user as any;
          const course = enrollment.course as any;
          const userName = user?.name || 
                          `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 
                          'Usuario';
          const courseName = course?.name || 'Curso';
          
          activities.push({
            id: activityId++,
            type: 'enrollment',
            description: `${userName} se inscribió en ${courseName}`,
            date: enrollment.enrollment_date
          });
        });

        // Adicionar anúncios recentes
        (fetchedAnnouncementsResult.data || []).forEach(announcement => {
          activities.push({
            id: activityId++,
            type: 'announcement',
            description: `Anuncio publicado: ${announcement.title}`,
            date: announcement.created_at
          });
        });

        // Adicionar usuários recentes
        (recentUsers.data || []).forEach(user => {
          const userName = user.name || 
                          `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
                          'Usuario';
          const userRole = user.role?.includes('teacher') ? 'profesor' : 
                          user.role?.includes('admin') ? 'administrador' : 'estudiante';
          
          activities.push({
            id: activityId++,
            type: 'user',
            description: `Nuevo ${userRole} registrado: ${userName}`,
            date: user.created_at
          });
        });

        // Adicionar cursos recentes
        (recentCourses.data || []).forEach(course => {
          activities.push({
            id: activityId++,
            type: 'course',
            description: `Nuevo curso creado: ${course.name}`,
            date: course.created_at
          });
        });

        // Ordenar atividades por data (mais recentes primeiro)
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setRecentActivities(activities.slice(0, 5)); // Mostrar apenas as 5 mais recentes
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Em caso de erro, definir valores padrão
        setStats({
          totalStudents: 0,
          totalTeachers: 0,
          totalCourses: 0,
          recentAnnouncements: 0
        });
        setRecentActivities([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return <Users size={18} className="text-sky-600 dark:text-sky-400" />;
      case 'announcement':
        return <Bell size={18} className="text-amber-600 dark:text-amber-400" />;
      case 'user':
        return <User size={18} className="text-emerald-600 dark:text-emerald-400" />;
      case 'course':
        return <BookOpen size={18} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <Bell size={18} />;
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Panel de Administración
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Bienvenido, {user?.name}. Administre usuarios, cursos y anuncios.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link
            to="/admin/announcements/create"
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <PlusCircle size={18} className="mr-2" />
            Nuevo anuncio
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900 rounded-full flex items-center justify-center">
              <Users className="text-sky-600 dark:text-sky-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Estudiantes
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {stats.totalStudents}
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
              <User className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Profesores
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {stats.totalTeachers}
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
              <BookOpen className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cursos
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {stats.totalCourses}
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
              <Bell className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Anuncios recientes
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {stats.recentAnnouncements}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-md p-6 text-white"
        >
          <Users size={24} className="mb-4" />
          <h3 className="text-lg font-semibold mb-2">Administrar usuarios</h3>
          <p className="text-sm mb-4 opacity-90">
            Gestione estudiantes y profesores, edite perfiles y asigne roles.
          </p>
          <Link
            to="/admin/users"
            className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md transition"
          >
            Ver usuarios
          </Link>
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md p-6 text-white"
        >
          <BookOpen size={24} className="mb-4" />
          <h3 className="text-lg font-semibold mb-2">Administrar cursos</h3>
          <p className="text-sm mb-4 opacity-90">
            Cree, edite y administre cursos, módulos y lecciones.
          </p>
          <Link
            to="/admin/courses"
            className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md transition"
          >
            Ver cursos
          </Link>
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md p-6 text-white"
        >
          <Bell size={24} className="mb-4" />
          <h3 className="text-lg font-semibold mb-2">Publicar anuncios</h3>
          <p className="text-sm mb-4 opacity-90">
            Cree y publique anuncios importantes para toda la comunidad.
          </p>
          <Link
            to="/admin/announcements"
            className="inline-block px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md transition"
          >
            Ver anuncios
          </Link>
        </motion.div>
      </div>
      
      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
          Actividad reciente
        </h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-start">
                <div className="mr-4 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(activity.date).toLocaleString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {recentActivities.length === 0 && (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              No hay actividades recientes para mostrar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;