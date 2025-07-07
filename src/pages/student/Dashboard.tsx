import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, BarChart, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { courseService, announcementService, studentService } from '../../services/api';
import { motion } from 'framer-motion';

interface Course {
  id: number;
  name: string;
  description: string;
  progress: number;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        const [enrolledCourses, latestAnnouncements] = await Promise.all([
          studentService.getEnrolledCourses(user.id),
          announcementService.getAnnouncements(5)
        ]);
        
        // Transform courses data to include progress (mock for now)
        const coursesWithProgress = (enrolledCourses || []).map((course: any) => ({
          id: course.id,
          name: course.name,
          description: course.description,
          progress: Math.floor(Math.random() * 100) // Mock progress
        }));
        
        setCourses(coursesWithProgress);
        setAnnouncements((latestAnnouncements || []).map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          date: ann.created_at
        })));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty arrays on error to prevent crashes
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
            Bienvenido, {user?.name}
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
          {courses.map((course) => (
            <motion.div
              key={course.id}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
            >
              <div className="h-3 bg-gradient-to-r from-sky-500 to-blue-600"></div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  {course.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {course.description}
                </p>
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
              No hay anuncios disponibles en este momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;