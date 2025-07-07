import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, FileText, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { motion } from 'framer-motion';

interface Course {
  id: string;
  name: string;
  description: string;
  students_count: number;
  modules_count: number;
  lessons_count: number;
  is_active: boolean;
}

interface Assignment {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  pending_grades: number;
  course_id: string;
}

interface TeacherStats {
  totalCourses: number;
  totalStudents: number;
  pendingGrades: number;
  activeCourses: number;
}

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<TeacherStats>({
    totalCourses: 0,
    totalStudents: 0,
    pendingGrades: 0,
    activeCourses: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTeacherData();
    }
  }, [user?.id]);

  const fetchTeacherData = async () => {
    try {
      setIsLoading(true);

      // Fetch courses taught by this teacher
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments(count),
          modules(
            id,
            lessons(id)
          )
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Transform courses data
      const transformedCourses = (coursesData || []).map(course => ({
        id: course.id,
        name: course.name,
        description: course.description || '',
        students_count: course.enrollments?.length || 0,
        modules_count: course.modules?.length || 0,
        lessons_count: course.modules?.reduce((total: number, module: any) => 
          total + (module.lessons?.length || 0), 0) || 0,
        is_active: course.is_active
      }));

      setCourses(transformedCourses);

      // Fetch assignments for teacher's courses
      const courseIds = transformedCourses.map(course => course.id);
      
      if (courseIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            *,
            course:courses(name),
            grades(count)
          `)
          .in('course_id', courseIds)
          .gte('due_date', new Date().toISOString())
          .order('due_date', { ascending: true })
          .limit(5);

        if (assignmentsError) throw assignmentsError;

        // Transform assignments data
        const transformedAssignments = (assignmentsData || []).map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          course_name: assignment.course?.name || 'Curso desconocido',
          due_date: assignment.due_date,
          pending_grades: Math.max(0, (transformedCourses.find(c => c.id === assignment.course_id)?.students_count || 0) - (assignment.grades?.length || 0)),
          course_id: assignment.course_id
        }));

        setUpcomingAssignments(transformedAssignments);
      }

      // Calculate stats
      const totalStudents = transformedCourses.reduce((sum, course) => sum + course.students_count, 0);
      const activeCourses = transformedCourses.filter(course => course.is_active).length;
      const pendingGrades = upcomingAssignments.reduce((sum, assignment) => sum + assignment.pending_grades, 0);

      setStats({
        totalCourses: transformedCourses.length,
        totalStudents,
        pendingGrades,
        activeCourses
      });

    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setIsLoading(false);
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
            Bienvenido, Profesor {user?.name || `${user?.first_name} ${user?.last_name}`}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Este es su panel de profesor. Aquí puede administrar sus cursos y calificaciones.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/teacher/courses"
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <BookOpen size={18} className="mr-2" />
            Administrar cursos
          </Link>
        </div>
      </div>
      
      {/* Upcoming Assignments */}
      {upcomingAssignments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
            Próximas evaluaciones
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Evaluación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Curso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Fecha límite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pendientes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {upcomingAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
                      {assignment.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {assignment.course_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-2 text-amber-500" />
                        {new Date(assignment.due_date).toLocaleDateString('es-AR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {assignment.pending_grades} pendientes
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/teacher/grades?course=${assignment.course_id}&assignment=${assignment.id}`}
                        className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        Calificar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
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
                Cursos totales
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
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
              <TrendingUp className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cursos totales
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
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center">
              <TrendingUp className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Cursos activos
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {stats.activeCourses}
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
              <Users className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Total de estudiantes
              </h3>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {stats.totalStudents}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Courses Section */}
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    {course.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    course.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {course.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm">
                    <Users size={16} className="mr-2" />
                    <span>{course.students_count} estudiantes</span>
                  </div>
                  <div className="flex items-center text-slate-600 dark:text-slate-400 text-sm">
                    <BookOpen size={16} className="mr-2" />
                    <span>{course.modules_count} módulos, {course.lessons_count} lecciones</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    to={`/teacher/courses/${course.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition text-sm"
                  >
                    <BookOpen size={14} className="mr-1" />
                    Administrar
                  </Link>
                  <Link
                    to={`/teacher/grades?course=${course.id}`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition text-sm"
                  >
                    <FileText size={14} className="mr-1" />
                    Calificaciones
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
          
          {courses.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                <BookOpen size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                No hay cursos asignados
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Contacte al administrador para que le asigne cursos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;