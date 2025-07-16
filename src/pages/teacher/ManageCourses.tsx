import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, FileText, Eye, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface Course {
  id: string;
  name: string;
  course_code: string;
  description: string;
  students_count: number;
  modules_count: number;
  lessons_count: number;
  is_active: boolean;
  credits: number;
  image_url?: string;
  syllabus_url?: string;
}

const ManageCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    // Apply search filter
    if (searchTerm) {
      const filtered = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [courses, searchTerm]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);

      // Primero obtenemos los cursos básicos
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules(
            id,
            lessons(id)
          )
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!coursesData || coursesData.length === 0) {
        setCourses([]);
        return;
      }

      // Obtener conteos de estudiantes matriculados
      const coursesWithCounts = await Promise.all(
        coursesData.map(async (course) => {
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('id')
            .eq('course_id', course.id)
            .eq('is_active', true);

          return {
            ...course,
            students_count: enrollmentError ? 0 : enrollmentData?.length || 0,
            modules_count: course.modules?.length || 0,
            lessons_count: course.modules?.reduce((acc: number, module: any) => acc + (module.lessons?.length || 0), 0) || 0
          };
        })
      );

      // Transformamos los datos incluyendo los conteos correctos
      const transformedCourses = coursesWithCounts.map(course => ({
        id: course.id,
        name: course.name,
        course_code: course.course_code || '',
        description: course.description || '',
        students_count: course.students_count || 0,
        modules_count: course.modules?.length || 0,
        lessons_count: course.modules?.reduce((total: number, module: any) => 
          total + (module.lessons?.length || 0), 0) || 0,
        is_active: course.is_active,
        credits: course.credits,
        image_url: course.image_url,
        syllabus_url: course.syllabus_url
      }));

      setCourses(transformedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && courses.length === 0) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Mis cursos asignados
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Administre el contenido de los cursos que le han sido asignados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {searchTerm ? 'No se encontraron cursos' : 'No hay cursos asignados'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm
                ? 'Intente con diferentes términos de búsqueda'
                : 'Contacte al administrador para que le asigne cursos'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredCourses.map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                        {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {course.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {course.credits} créditos
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          course.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {course.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{course.students_count} estudiantes</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{course.modules_count} módulos</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/teacher/students/${course.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-800 transition-colors"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Ver estudiantes
                      </Link>
                      
                      <Link
                        to={`/teacher/courses/${course.id}`}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900 dark:text-sky-300 dark:hover:bg-sky-800 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Administrar contenido
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Gestión de contenido
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Como profesor, puede administrar el contenido de los cursos que le han sido asignados: 
              módulos, lecciones, materiales y evaluaciones. Para crear nuevos cursos o modificar 
              información básica, contacte al administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageCourses;