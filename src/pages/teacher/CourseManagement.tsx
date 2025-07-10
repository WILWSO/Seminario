import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, Edit, Trash, Play, FileText, Save, X, RectangleHorizontal as DragHandleHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import LessonContentManager from '../../components/LessonContentManager';

interface Course {
  id: string;
  name: string;
  description: string;
  credits: number;
  is_active: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'document' | 'quiz';
  content_url: string;
  duration: string;
  order: number;
}

const CourseManagement = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    duration: '',
  });

  useEffect(() => {
    if (id && user?.id) {
      fetchCourseData();
    }
  }, [id, user?.id]);

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules with lessons
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons(*)
        `)
        .eq('course_id', id)
        .order('order');

      if (modulesError) throw modulesError;

      // Sort lessons by order within each module
      const sortedModules = (modulesData || []).map(module => ({
        ...module,
        lessons: (module.lessons || []).sort((a: any, b: any) => a.order - b.order)
      }));

      setModules(sortedModules);
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const moduleData = {
        ...moduleForm,
        course_id: id,
        order: editingModule ? editingModule.order : modules.length + 1
      };

      if (editingModule) {
        const { data, error } = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', editingModule.id)
          .select()
          .single();

        if (error) throw error;
        console.log('Módulo actualizado:', data);
      } else {
        const { data, error } = await supabase
          .from('modules')
          .insert([moduleData])
          .select()
          .single();

        if (error) throw error;
        console.log('Módulo creado:', data);
      }

      setModuleForm({ title: '', description: '' });
      setIsCreatingModule(false);
      setEditingModule(null);
      await fetchCourseData();
      
      // Mostrar mensaje de éxito para módulos
      const successMessage = editingModule ? 'Módulo actualizado con éxito!' : 'Módulo creado con éxito!';
      
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          ${successMessage}
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving module:', error);
      
      // Mostrar error para módulos
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      errorNotification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Error al guardar el módulo: ${errorMessage}
        </div>
      `;
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        errorNotification.style.opacity = '0';
        errorNotification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(errorNotification)) {
            document.body.removeChild(errorNotification);
          }
        }, 300);
      }, 5000);
    }
  };

  const handleLessonSubmit = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!lessonForm.title.trim()) {
      alert('El título de la lección es obligatorio');
      return;
    }


    try {
      const module = modules.find(m => m.id === moduleId);
      const lessonData = {
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim() || null,
        type: 'lesson', // Tipo padrão para lições
        duration: lessonForm.duration.trim() || null,
        module_id: moduleId,
        order: editingLesson ? editingLesson.order : (module?.lessons.length || 0) + 1
      };

      console.log('Datos de la lección a guardar:', lessonData);
      
      if (editingLesson) {
        const { data, error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', editingLesson.id)
          .select()
          .single();

        if (error) throw error;
        console.log('Lección actualizada:', data);
      } else {
        const { data, error } = await supabase
          .from('lessons')
          .insert([lessonData])
          .select()
          .single();

        if (error) throw error;
        console.log('Lección creada:', data);
      }

      // Limpiar formulario y cerrar modal
      setLessonForm({ title: '', description: '', duration: '' });
      setIsCreatingLesson(null);
      setEditingLesson(null);
      
      // Recargar datos del curso
      await fetchCourseData();
      
      // Mostrar mensaje de éxito
      const successMessage = editingLesson ? 'Lección actualizada con éxito!' : 'Lección creada con éxito!';
      
      // Usar una notificación más elegante
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          ${successMessage}
        </div>
      `;
      document.body.appendChild(notification);
      
      // Remover notificação após 5 segundos
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 5000);
      
    } catch (error) {
      console.error('Error saving lesson:', error);
      
      // Mejor tratamiento de errores
      let errorMessage = 'Error desconocido';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message;
      }
      
      // Mostrar error con notificación
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      errorNotification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Error al guardar la lección: ${errorMessage}
        </div>
      `;
      document.body.appendChild(errorNotification);
      
      // Remover notificación de error después de 5 segundos
      setTimeout(() => {
        errorNotification.style.opacity = '0';
        errorNotification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(errorNotification)) {
            document.body.removeChild(errorNotification);
          }
        }, 300);
      }, 5000);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este módulo? Se eliminarán también todas las lecciones asociadas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      await fetchCourseData();
      
      // Mostrar mensaje de éxito para eliminación de módulo
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Módulo eliminado con éxito!
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error('Error deleting module:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      errorNotification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Error al eliminar el módulo: ${errorMessage}
        </div>
      `;
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        errorNotification.style.opacity = '0';
        errorNotification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(errorNotification)) {
            document.body.removeChild(errorNotification);
          }
        }, 300);
      }, 5000);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta lección?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      await fetchCourseData();
      
      // Mostrar mensaje de éxito para eliminación de lección
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Lección eliminada con éxito!
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
      
    } catch (error) {
      console.error('Error deleting lesson:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorNotification = document.createElement('div');
      errorNotification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      errorNotification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          Error al eliminar la lección: ${errorMessage}
        </div>
      `;
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        errorNotification.style.opacity = '0';
        errorNotification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(errorNotification)) {
            document.body.removeChild(errorNotification);
          }
        }, 300);
      }, 5000);
    }
  };

  const handleEditModule = (module: Module) => {
    setModuleForm({
      title: module.title,
      description: module.description
    });
    setEditingModule(module);
    setIsCreatingModule(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setLessonForm({
      title: lesson.title,
      description: lesson.description,
      duration: lesson.duration
    });
    setEditingLesson(lesson);
    setIsCreatingLesson(lesson.module_id);
  };

  const cancelModuleForm = () => {
    setModuleForm({ title: '', description: '' });
    setIsCreatingModule(false);
    setEditingModule(null);
  };

  const cancelLessonForm = () => {
    setLessonForm({ title: '', description: '', duration: '' });
    setIsCreatingLesson(null);
    setEditingLesson(null);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play size={16} className="text-sky-600 dark:text-sky-400" />;
      case 'document':
        return <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case 'quiz':
        return <FileText size={16} className="text-amber-600 dark:text-amber-400" />;
      default:
        return <FileText size={16} />;
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
            Administrar: {course.name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestione los módulos y lecciones de su curso
          </p>
        </div>
        <button
          onClick={() => setIsCreatingModule(true)}
          className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
        >
          <Plus size={18} className="mr-2" />
          Nuevo módulo
        </button>
      </div>

      {/* Course Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
              {course.name}
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
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">
              {modules.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Módulos
            </div>
          </div>
        </div>
      </div>

      {/* Create Module Form */}
      {isCreatingModule && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingModule ? 'Editar módulo' : 'Crear nuevo módulo'}
            </h3>
            <button
              onClick={cancelModuleForm}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleModuleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título del módulo *
              </label>
              <input
                type="text"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descripción
              </label>
              <textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelModuleForm}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
              >
                {editingModule ? 'Actualizar' : 'Crear'} módulo
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Modules List */}
      <div className="space-y-4">
        {modules.map((module, moduleIndex) => (
          <div key={module.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <DragHandleHorizontal size={16} className="text-slate-400 mr-2" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                      Módulo {moduleIndex + 1}: {module.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {module.description}
                  </p>
                  <div className="mt-2 text-sm text-slate-500 dark:text-slate-500">
                    {module.lessons.length} lecciones
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsCreatingLesson(module.id)}
                    className="p-2 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition"
                    title="Agregar lección"
                  >
                    <Plus size={18} />
                  </button>
                  <button
                    onClick={() => handleEditModule(module)}
                    className="p-2 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700 rounded-md transition"
                    title="Editar módulo"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteModule(module.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition"
                    title="Eliminar módulo"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Create Lesson Form */}
            {isCreatingLesson === module.id && (
              <div className="p-6 bg-slate-50 dark:bg-slate-750 border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-md font-semibold text-slate-800 dark:text-white mb-4">
                  {editingLesson ? 'Editar lección' : 'Crear nueva lección'}
                </h4>
                
                <form onSubmit={(e) => handleLessonSubmit(e, module.id)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Título de la lección *
                      </label>
                      <input
                        type="text"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Duración estimada
                    </label>
                    <input
                      type="text"
                      value={lessonForm.duration}
                      onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                      placeholder="ej: 45 min, 1h 30min"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={cancelLessonForm}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
                    >
                      {editingLesson ? 'Actualizar' : 'Crear'} lección
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lessons List */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {module.lessons.map((lesson, lessonIndex) => (
                <div key={lesson.id} className="space-y-4">
                  <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3">
                            {getLessonIcon(lesson.type)}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-slate-800 dark:text-white">
                              Lección {lessonIndex + 1}: {lesson.title}
                            </h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {lesson.description}
                            </p>
                            <div className="flex items-center mt-1 text-xs text-slate-500 dark:text-slate-500">
                              {lesson.duration && (
                                <span>{lesson.duration}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditLesson(lesson)}
                            className="p-1 text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition"
                            title="Editar lección"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="p-1 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition"
                            title="Eliminar lección"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lesson Content Manager */}
                    <div className="mt-4 pl-11">
                      <LessonContentManager 
                        lessonId={lesson.id}
                        onContentChange={() => {
                          // Opcional: recarregar dados se necessário
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {module.lessons.length === 0 && (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                  No hay lecciones en este módulo. Haga clic en el botón "+" para agregar la primera lección.
                </div>
              )}
            </div>
          </div>
        ))}

        {modules.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
              No hay módulos creados
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Cree el primer módulo de su curso haciendo clic en "Nuevo módulo".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseManagement;