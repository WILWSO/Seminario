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

// Sistema de caché simple
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Instancia global del caché
const courseCache = new SimpleCache();

const CourseDetails = () => {
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId?.replace(/^:/, '');
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  
  // Estados principales
  const [course, setCourse] = useState<Course | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  // Estados de carga separados
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  
  // NUEVO: Estado para controlar cuándo mostrar skeleton
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Estados para lazy loading
  const [loadedModules, setLoadedModules] = useState<Set<string>>(new Set());
  const [loadingModuleContents, setLoadingModuleContents] = useState<Set<string>>(new Set());

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

  // Función para cargar información básica del curso con caché
  const fetchCourseBasicInfo = useCallback(async () => {
    if (!courseId) {
      console.error('No course ID provided');
      setIsLoadingCourse(false);
      setIsInitialLoad(false);
      return;
    }

    try {
      // Verificar caché primero
      const cacheKey = `course-basic-${courseId}`;
      const cachedCourse = courseCache.get<any>(cacheKey);
      
      if (cachedCourse) {
        setCourse({
          ...cachedCourse,
          modules: [] // Inicialmente vacío
        });
        setIsLoadingCourse(false);
        setIsInitialLoad(false);
        return;
      }
      
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          description,
          course_code,
          credits,
          image_url,
          syllabus_url,
          users!courses_teacher_id_fkey(name)
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      const courseBasic = {
        ...courseData,
        teacher_name: courseData.users?.name || 'Profesor desconocido'
      };

      // Guardar en caché (2 minutos)
      courseCache.set(cacheKey, courseBasic, 2 * 60 * 1000);

      setCourse({
        ...courseBasic,
        modules: []
      });

    } catch (error) {
      console.error('Error fetching course basic info:', error);
      showError('Error al cargar la información del curso', 'error');
    } finally {
      setIsLoadingCourse(false);
      setIsInitialLoad(false);
    }
  }, [courseId, showError]);

  // Función para cargar progreso del usuario con caché
  const fetchUserProgress = useCallback(async () => {
    if (!user?.id || !courseId) return;

    try {
      // Verificar caché primero
      const cacheKey = `progress-${user.id}-${courseId}`;
      const cachedProgress = courseCache.get<string[]>(cacheKey);
      
      if (cachedProgress) {
        setCompletedLessons(new Set(cachedProgress));
        setIsLoadingProgress(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('completed_lessons')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const lessonIds = data.map(item => item.lesson_id);
      
      // Guardar en caché (1 minuto)
      courseCache.set(cacheKey, lessonIds, 60 * 1000);
      
      setCompletedLessons(new Set(lessonIds));
    } catch (error) {
      console.error('Error fetching user progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  }, [user?.id, courseId]);

  // Función para cargar módulos básicos (sin contenido detallado)
  const fetchCourseModules = useCallback(async () => {
    if (!courseId) return;

    try {
      // Verificar caché primero
      const cacheKey = `modules-${courseId}`;
      const cachedModules = courseCache.get<any[]>(cacheKey);
      
      if (cachedModules) {
        setCourse(prev => prev ? { ...prev, modules: cachedModules } : null);
        setIsLoadingModules(false);
        return;
      }
      
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          description,
          order,
          lessons(
            id,
            title,
            description,
            duration,
            order
          )
        `)
        .eq('course_id', courseId)
        .order('order');

      if (modulesError) throw modulesError;

      const processedModules = modulesData.map(module => ({
        ...module,
        lessons: module.lessons
          .sort((a: any, b: any) => a.order - b.order)
          .map((lesson: any) => ({
            ...lesson,
            completed: false,
            contents: [] // Inicialmente vacío para lazy loading
          }))
      }));

      // Guardar en caché (5 minutos)
      courseCache.set(cacheKey, processedModules, 5 * 60 * 1000);

      setCourse(prev => prev ? { ...prev, modules: processedModules } : null);

    } catch (error) {
      console.error('Error fetching course modules:', error);
      showError('Error al cargar el contenido del curso', 'error');
    } finally {
      setIsLoadingModules(false);
    }
  }, [courseId, showError]);

  // Función para cargar contenido detallado de un módulo (lazy loading)
  const fetchModuleContents = useCallback(async (moduleId: string) => {
    if (loadedModules.has(moduleId) || loadingModuleContents.has(moduleId)) return;

    try {
      setLoadingModuleContents(prev => new Set([...prev, moduleId]));
      
      // Verificar caché primero
      const cacheKey = `module-contents-${moduleId}`;
      const cachedContents = courseCache.get<any[]>(cacheKey);
      
      if (cachedContents) {
        setCourse(prev => {
          if (!prev) return null;
          return {
            ...prev,
            modules: prev.modules.map(module => 
              module.id === moduleId 
                ? { 
                    ...module, 
                    lessons: module.lessons.map(lesson => {
                      const lessonContent = cachedContents.find(l => l.id === lesson.id);
                      return lessonContent ? { ...lesson, contents: lessonContent.contents } : lesson;
                    })
                  }
                : module
            )
          };
        });
        setLoadedModules(prev => new Set([...prev, moduleId]));
        setLoadingModuleContents(prev => {
          const newSet = new Set(prev);
          newSet.delete(moduleId);
          return newSet;
        });
        return;
      }
      
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          lesson_contents(
            id,
            title,
            type,
            content_url,
            order
          )
        `)
        .eq('module_id', moduleId);

      if (lessonsError) throw lessonsError;

      const lessonsWithContents = lessonsData.map(lesson => ({
        ...lesson,
        contents: lesson.lesson_contents?.sort((a: any, b: any) => a.order - b.order) || []
      }));

      // Guardar en caché (10 minutos)
      courseCache.set(cacheKey, lessonsWithContents, 10 * 60 * 1000);

      setCourse(prev => {
        if (!prev) return null;
        return {
          ...prev,
          modules: prev.modules.map(module => 
            module.id === moduleId 
              ? { 
                  ...module, 
                  lessons: module.lessons.map(lesson => {
                    const lessonContent = lessonsWithContents.find(l => l.id === lesson.id);
                    return lessonContent ? { ...lesson, contents: lessonContent.contents } : lesson;
                  })
                }
              : module
          )
        };
      });

      setLoadedModules(prev => new Set([...prev, moduleId]));
      
    } catch (error) {
      console.error('Error fetching module contents:', error);
    } finally {
      setLoadingModuleContents(prev => {
        const newSet = new Set(prev);
        newSet.delete(moduleId);
        return newSet;
      });
    }
  }, [loadedModules, loadingModuleContents]);

  // Efectos de carga progresiva
  useEffect(() => {
    if (courseId && user?.id) {
      // Asegurar que isInitialLoad se mantenga en true inicialmente
      setIsInitialLoad(true);
      
      // Iniciar todas las cargas con un pequeño delay para mostrar skeleton
      const timers = [
        setTimeout(() => fetchCourseBasicInfo(), 100),      // 100ms para mostrar skeleton
        setTimeout(() => fetchUserProgress(), 300),         // 300ms
        setTimeout(() => fetchCourseModules(), 500)         // 500ms
      ];

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [courseId, user?.id, fetchCourseBasicInfo, fetchUserProgress, fetchCourseModules]);

  // Manejar clic en módulo con lazy loading
  const handleModuleClick = useCallback((moduleId: string) => {
    const newActiveModule = activeModule === moduleId ? null : moduleId;
    setActiveModule(newActiveModule);
    
    // Cargar contenido del módulo si se está expandiendo
    if (newActiveModule && !loadedModules.has(moduleId)) {
      fetchModuleContents(moduleId);
    }
  }, [activeModule, loadedModules, fetchModuleContents]);

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
      
      // Limpiar caché de progreso
      courseCache.clear(`progress-${user?.id}-${courseId}`);
      
      showSuccess('Lección marcada como completada', 'success');
    } catch (error) {
      console.error('Error marking lesson as complete:', error);
      showError('Error al marcar la lección como completada', 'error');
    }
  }, [user?.id, courseId, showSuccess, showError]);

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
        handleModuleClick(moduleWithLesson.id);
      }
    }
  }, [firstIncompleteLesson, course, handleModuleClick]);

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
      
      // Limpiar caché relacionado
      courseCache.clear();
      
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

  // Skeletons idénticos al dashboard
  const CourseHeaderSkeleton = () => (
    <div className="relative h-64 rounded-xl overflow-hidden animate-pulse">
      <div className="absolute inset-0 bg-slate-300 dark:bg-slate-600"></div>
      <div className="absolute bottom-0 left-0 p-6">
        <div className="h-8 bg-slate-400 dark:bg-slate-500 rounded w-64 mb-2"></div>
        <div className="h-4 bg-slate-400 dark:bg-slate-500 rounded w-48"></div>
      </div>
    </div>
  );

  const ProgressSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-40"></div>
        </div>
      </div>
    </div>
  );

  const DescriptionSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );

  const ModulesSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse"></div>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6">
            <div className="animate-pulse flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ModuleContentSkeleton = () => (
    <div className="px-6 pb-4">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="ml-4 border-l-2 border-slate-200 dark:border-slate-600 pl-4">
            <div className="animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full mr-2"></div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  </div>
                </div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24 ml-4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Renderizado condicional mejorado
  if (!courseId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Curso no encontrado
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            No se pudo encontrar el ID del curso
          </p>
          <Link
            to="/student/courses"
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver a cursos
          </Link>
        </div>
      </div>
    );
  }

  // Mostrar skeleton durante la carga inicial
  if (isInitialLoad || isLoadingCourse || !course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center mb-6">
              <div className="mr-4 flex items-center">
                <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded mr-2 animate-pulse"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div>
              </div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 animate-pulse"></div>
            </div>
            
            <CourseHeaderSkeleton />
            <ProgressSkeleton />
            <DescriptionSkeleton />
            <ModulesSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Renderizado normal del contenido
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-6">
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
              className="absolute inset-0 bg-cover bg-center bg-slate-300 dark:bg-slate-700" 
              style={{ 
                backgroundImage: course.image_url ? `url(${course.image_url})` : 'none'
              }}
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
          {isLoadingProgress ? (
            <ProgressSkeleton />
          ) : (
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
              <div className="flex justify-between flex-wrap gap-2">
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
                  disabled={isLoadingModules}
                >
                  <BookOpen size={16} className="mr-2" />
                  {isLoadingModules ? 'Cargando...' : 'Continuar aprendiendo'}
                </button>
              </div>
            </div>
          )}
          
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
              {isLoadingModules ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Cargando módulos...</p>
                </div>
              ) : course.modules.length === 0 ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
                    Sin contenido disponible
                  </h4>
                  <p>Este curso aún no tiene módulos o lecciones disponibles.</p>
                </div>
              ) : (
                course.modules.map((module) => (
                  <div key={module.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
                    <button
                      onClick={() => handleModuleClick(module.id)}
                      className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
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
                          {loadingModuleContents.has(module.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>
                          ) : (
                            <motion.div
                              animate={{ rotate: activeModule === module.id ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ArrowLeft size={16} className="transform rotate-90" />
                            </motion.div>
                          )}
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
                        {loadingModuleContents.has(module.id) ? (
                          <ModuleContentSkeleton />
                        ) : (
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
                        )}
                      </motion.div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <WithdrawModalDesistir
            isOpen={showWithdrawModal}
            onClose={handleCloseWithdrawModal}
            onConfirm={handleWithdrawFromCourse}
            courseName={course.name}
            isWithdrawing={isWithdrawing}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;