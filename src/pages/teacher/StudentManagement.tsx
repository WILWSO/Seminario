import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, BookOpen, FileText, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import StudentList from '../../components/StudentList';

interface Course {
  id: string;
  name: string;
  course_code: string;
  description: string;
  credits: number;
  students_count: number;
  modules_count: number;
  lessons_count: number;
  is_active: boolean;
}

const StudentManagement = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showError } = useNotifications();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && user?.id) {
      fetchCourseData();
    }
  }, [id, user?.id]);

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);

      // Buscar detalhes do curso
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments(count),
          modules(
            id,
            lessons(id)
          )
        `)
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .single();

      if (courseError) throw courseError;

      // Processar dados do curso
      setCourse({
        id: courseData.id,
        name: courseData.name,
        course_code: courseData.course_code || '',
        description: courseData.description || '',
        credits: courseData.credits,
        students_count: courseData.enrollments?.length || 0,
        modules_count: courseData.modules?.length || 0,
        lessons_count: courseData.modules?.reduce((total: number, module: any) => 
          total + (module.lessons?.length || 0), 0) || 0,
        is_active: courseData.is_active
      });

    } catch (error) {
      console.error('Error fetching course data:', error);
      showError(
        'Error al cargar datos',
        'No se pudo cargar la información del curso.',
        5000
      );
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

  if (!course) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            Curso no encontrado
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            El curso que está buscando no existe o no tiene permisos para administrarlo.
          </p>
          <Link
            to="/teacher/courses"
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver a mis cursos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
     {/* NotificationContext es aplicado globalmente sin necesidad de agregar codigo acá*/}
      
      <div className="flex items-center mb-6">
        <Link
          to="/teacher/courses"
          className="mr-4 flex items-center text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition"
        >
          <ArrowLeft size={20} className="mr-1" />
          Volver
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Estudiantes: {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestione los estudiantes y calificaciones de su curso
          </p>
        </div>
      </div>

      {/* Course Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {course.description}
            </p>
            <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
              <span>Créditos: {course.credits}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                course.is_active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {course.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          <div className="flex space-x-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">
                {course.students_count}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Estudiantes
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">
                {course.modules_count}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Módulos
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">
                {course.lessons_count}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Lecciones
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student List Component */}
      <StudentList courseId={course.id} />
    </div>
  );
};

export default StudentManagement;