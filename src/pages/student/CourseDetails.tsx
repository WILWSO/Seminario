import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Download, Video, LinkIcon, LogOut, Check, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import WithdrawModalDesistir from '../../components/WithdrawModalDesistir';
import LessonItem from '../../components/LessonItem';
import { Course, Module, Lesson, LessonContent } from '../../types/course';


const CourseDetails = () => {
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId?.replace(/^:/, ''); // Remove leading colon if present
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Memoized calculations
  const progress = useMemo(() => {
    if (!course) return 0;
    const totalLessons = course.modules.reduce((acc, module) => acc + module.lessons.length, 0);
    if (totalLessons === 0) return 0;
    return Math.round((completedLessons.size / totalLessons) * 100);
  }, [course, completedLessons]);

  const firstIncompleteLesson = useMemo(() => {
    if (!course) return null;
    return course.modules
      .flatMap(m => m.lessons)
      .find(l => !completedLessons.has(l.id));
  }, [course, completedLessons]);

  const fetchCourseDetails = useCallback(async () => {
    if (!courseId) {
      console.error('No course ID provided');
      setLoading(false);
      return;
    }

    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          users!courses_teacher_id_fkey(name)
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons(
            *,
            lesson_contents(*)
          )
        `)
        .eq('course_id', courseId)
        .order('order');

      if (modulesError) throw modulesError;

      const courseWithModules = {
        ...courseData,
        teacher_name: courseData.users?.name || 'Profesor desconocido',
        modules: modulesData.map(module => ({
          ...module,
          lessons: module.lessons
            .sort((a: any, b: any) => a.order - b.order)
            .map((lesson: any) => ({
              ...lesson,
              completed: false,
              contents: lesson.lesson_contents?.sort((a: any, b: any) => a.order - b.order) || []
            }))
        }))
      };

      setCourse(courseWithModules);
    } catch (error) {
      console.error('Error fetching course details:', error);
      showError('Error al cargar los detalles del curso', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId, showError]);

  const fetchCompletedLessons = useCallback(async () => {
    if (!user?.id || !courseId) return;

    try {
      const { data, error } = await supabase
        .from('completed_lessons')
        .select('lesson_id')
        .eq('user_id', user?.id);

      if (error) throw error;

      setCompletedLessons(new Set(data.map(item => item.lesson_id)));
    } catch (error) {
      console.error('Error fetching completed lessons:', error);
    }
  }, [user?.id, courseId]);

  useEffect(() => {
    if (courseId && user?.id) {
      fetchCourseDetails();
      fetchCompletedLessons();
    }
  }, [courseId, user?.id, fetchCourseDetails, fetchCompletedLessons]);

  const markLessonComplete = useCallback(async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('completed_lessons')
        .upsert({
          user_id: user?.id,
          lesson_id: lessonId,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      setCompletedLessons(prev => new Set([...prev, lessonId]));
      showSuccess('Lección marcada como completada', 'success');
    } catch (error) {
      console.error('Error marking lesson as complete:', error);
      showError('Error al marcar la lección como completada', 'error');
    }
  }, [user?.id, showSuccess, showError]);

  const handleContentClick = useCallback((content: LessonContent) => {
    if (content.content_url) {
      window.open(content.content_url, '_blank');
    }
  }, []);

  const handleContinueLearning = useCallback(() => {
    if (firstIncompleteLesson && course) {
      const moduleWithLesson = course.modules.find(m => 
        m.lessons.some(l => l.id === firstIncompleteLesson.id)
      );
      if (moduleWithLesson) {
        setActiveModule(moduleWithLesson.id);
      }
    }
  }, [firstIncompleteLesson, course]);

  const handleCloseWithdrawModal = useCallback(() => {
    setShowWithdrawModal(false);
  }, []);

  const handleOpenWithdrawModal = useCallback(() => {
    setShowWithdrawModal(true);
  }, []);

  const handleWithdrawFromCourse = useCallback(async (reason: string) => {
    if (!user?.id || !courseId) return;
    
    try {
      setIsWithdrawing(true);
      
      // Actualizar la matrícula a inactiva
      const { error } = await supabase
        .from('enrollments')
        .update({ 
          is_active: false,
          status: 'Desistido',
          observations: `Desistió del curso. Motivo: ${reason}`,
          completion_date: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
      
      showSuccess('Has desistido del curso correctamente', 'success');
      setTimeout(() => {
        window.location.href = '/student/courses';
      }, 2000);
    } catch (error) {
      console.error('Error al desistir del curso:', error);
      showError('Error al desistir del curso', 'error');
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawModal(false);
    }
  }, [user?.id, courseId, showSuccess, showError]);

  const getContentIcon = useCallback((type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} className="text-red-500" />;
      case 'document':
        return <FileText size={16} className="text-blue-500" />;
      case 'link':
        return <LinkIcon size={16} className="text-green-500" />;
      case 'lesson':
        return <BookOpen size={16} className="text-purple-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600 dark:text-slate-400">Curso no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NotificationContext es aplicado globalmente sin necesidad de agregar codigo acá*/}
      <div className="flex items-center mb-6">
        <Link
          to="/student/courses"
          className="mr-4 flex items-center text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition"
        >
          <ArrowLeft size={20} className="mr-1" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {course.name}
        </h1>
      </div>
      
      {/* Course Header */}
      <div className="relative h-64 rounded-xl overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${course.image_url})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
          </h2>
          <div className="flex items-center">
            <p className="mr-4">Profesor: {course.teacher_name}</p>
            <p>Créditos: {course.credits}</p>
          </div>
        </div>
      </div>
      
      {/* Course Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
          Tu progreso
        </h3>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Completado</span>
          <span className="font-medium text-slate-800 dark:text-white">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-sky-500 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between">
          {course.syllabus_url && (
            <a 
              href={course.syllabus_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              <Download size={16} className="mr-1" />
              Descargar programa
            </a>
          )}
          <button
            onClick={handleOpenWithdrawModal}
            className="inline-flex items-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <LogOut size={16} className="mr-1" />
            Desistir del curso
          </button>
          <button 
            onClick={handleContinueLearning}
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <BookOpen size={16} className="mr-2" />
            Continuar aprendiendo
          </button>
        </div>
      </div>
      
      {/* Course Description */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
          Acerca del curso
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {course.description}
        </p>
      </div>
      
      {/* Course Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white p-6">
            Contenido del curso
          </h3>
        </div>
        
        <div>
          {course.modules.map((module) => (
            <div key={module.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
              <button
                onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
                className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-white">
                      {module.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
                      {module.lessons.filter(l => completedLessons.has(l.id)).length}/{module.lessons.length}
                    </span>
                    <motion.div
                      animate={{ rotate: activeModule === module.id ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowLeft size={16} className="transform rotate-90" />
                    </motion.div>
                  </div>
                </div>
              </button>
              
              {activeModule === module.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="ml-4 border-l-2 border-slate-200 dark:border-slate-600 pl-4 pb-4 last:pb-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {completedLessons.has(lesson.id) ? (
                                <Check size={16} className="text-green-500 mr-2" />
                              ) : (
                                <Clock size={16} className="text-slate-400 mr-2" />
                              )}
                              <h5 className="font-medium text-slate-800 dark:text-white">
                                {lesson.title}
                              </h5>
                              {lesson.duration && (
                                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                  {lesson.duration}
                                </span>
                              )}
                            </div>
                            {lesson.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                {lesson.description}
                              </p>
                            )}
                            
                            {/* Lesson Contents */}
                            {lesson.contents && lesson.contents.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {lesson.contents.map((content) => (
                                  <div
                                    key={content.id}
                                    className="flex items-center p-2 bg-slate-50 dark:bg-slate-700 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                                    onClick={() => handleContentClick(content)}
                                  >
                                    {getContentIcon(content.type)}
                                    <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                                      {content.title}
                                    </span>
                                    {content.type === 'link' && (
                                      <ExternalLink size={12} className="ml-auto text-slate-400" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center ml-4">
                            {!completedLessons.has(lesson.id) && (
                              <button
                                onClick={() => markLessonComplete(lesson.id)}
                                className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 transition"
                              >
                                Marcar como completada
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Modal de desistencia */}
      <WithdrawModalDesistir
        isOpen={showWithdrawModal}
        onClose={handleCloseWithdrawModal}
        onConfirm={handleWithdrawFromCourse}
        courseName={course.name}
        isWithdrawing={isWithdrawing}
      />
    </div>
  );
};

export default CourseDetails;