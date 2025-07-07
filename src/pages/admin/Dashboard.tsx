import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Bell, User, PlusCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminService } from '../../services/api';
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
        try {
          const statsData = await adminService.getSystemStats();
          setStats({
            ...statsData,
            recentAnnouncements: 3 // Mock for now
          });
        } catch (statsError) {
          console.error('Error fetching stats:', statsError);
          // Use mock data if API fails
          setStats({
            totalStudents: 0,
            totalTeachers: 0,
            totalCourses: 0,
            recentAnnouncements: 0
          });
        }
        
        // Mock activities for now
        const mockActivities = [
          { id: 1, type: 'enrollment', description: 'Nuevo estudiante inscrito en Teología Sistemática I', date: '2025-06-28T14:30:00' },
          { id: 2, type: 'announcement', description: 'Anuncio publicado: Fechas de exámenes finales', date: '2025-06-27T10:15:00' },
          { id: 3, type: 'user', description: 'Nuevo profesor registrado: Dr. Roberto Sánchez', date: '2025-06-26T16:45:00' },
          { id: 4, type: 'course', description: 'Nuevo curso creado: Historia de la Iglesia II', date: '2025-06-25T09:20:00' },
          { id: 5, type: 'announcement', description: 'Anuncio publicado: Conferencia especial', date: '2025-06-24T13:10:00' },
        ];
        
        setRecentActivities(mockActivities);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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