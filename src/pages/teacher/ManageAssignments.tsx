import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save, X, FileText, Link as LinkIcon, Upload, Eye, Calendar, Users, Clock, BookOpen, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationSystem from '../../components/NotificationSystem';

interface Course {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  external_form_url?: string;
  course_name: string;
  assignment_type: 'form' | 'file_upload';
  due_date: string;
  max_score: number;
  form_questions?: FormQuestion[];
  file_instructions?: string;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
  is_active: boolean;
  created_at: string;
  submissions_count: number;
}

interface FormQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'multiple_choice' | 'single_choice';
  options?: string[];
  required: boolean;
  points: number;
}

const ManageAssignments = () => {
  const { user } = useAuth();
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    assignment_type: 'form',
    external_form_url: '',
    due_date: '',
    max_score: 100,
    form_questions: [] as FormQuestion[],
    file_instructions: '',
    allowed_file_types: ['pdf', 'doc', 'docx'],
    max_file_size_mb: 10,
    is_active: true
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Buscar cursos del profesor
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name')
        .eq('teacher_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Buscar avaliaciones
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses(name),
          grades(count)
        `)
        .in('course_id', (coursesData || []).map(c => c.id))
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const processedAssignments = (assignmentsData || []).map(assignment => ({
        ...assignment,
        course_name: assignment.course?.name || 'Curso desconocido',
        submissions_count: assignment.grades?.length || 0,
        form_questions: assignment.form_questions || [],
        allowed_file_types: assignment.allowed_file_types || ['pdf', 'doc', 'docx'],
        max_file_size_mb: assignment.max_file_size_mb || 10
      }));

      setAssignments(processedAssignments);

    } catch (error) {
      console.error('Error fetching data:', error);
      showError(
        'Error al cargar datos',
        'No se pudieron cargar las evaluaciones. Por favor, intente nuevamente.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.course_id) {
      showError('Campos requeridos', 'Por favor complete todos los campos obligatorios.', 3000);
      return;
    }

    if (formData.assignment_type === 'form' && formData.form_questions.length === 0) {
      showError('Preguntas requeridas', 'Debe agregar al menos una pregunta para el formulario.', 3000);
      return;
    }

    try {
      setIsLoading(true);

      const assignmentData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        external_form_url: formData.external_form_url.trim() || null,
        course_id: formData.course_id,
        assignment_type: formData.assignment_type,
        due_date: formData.due_date || null,
        max_score: formData.max_score,
        form_questions: formData.assignment_type === 'form' ? formData.form_questions : null,
        file_instructions: formData.assignment_type === 'file_upload' ? formData.file_instructions : null,
        allowed_file_types: formData.assignment_type === 'file_upload' ? formData.allowed_file_types : null,
        max_file_size_mb: formData.assignment_type === 'file_upload' ? formData.max_file_size_mb : null,
        is_active: formData.is_active
      };

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', editingAssignment.id);

        if (error) throw error;

        showSuccess(
          'Evaluación actualizada',
          'La evaluación se ha actualizado correctamente.',
          3000
        );
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert([assignmentData]);

        if (error) throw error;

        showSuccess(
          'Evaluación creada',
          'La evaluación se ha creado correctamente.',
          3000
        );
      }

      resetForm();
      await fetchData();

    } catch (error) {
      console.error('Error saving assignment:', error);
      showError(
        'Error al guardar',
        'No se pudo guardar la evaluación. Por favor, intente nuevamente.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (assignment: Assignment) => {
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      course_id: assignment.course_id,
      external_form_url: assignment.external_form_url || '',
      assignment_type: assignment.assignment_type,
      due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '',
      max_score: assignment.max_score,
      form_questions: assignment.form_questions || [],
      file_instructions: assignment.file_instructions || '',
      allowed_file_types: assignment.allowed_file_types || ['pdf', 'doc', 'docx'],
      max_file_size_mb: assignment.max_file_size_mb || 10,
      is_active: assignment.is_active
    });
    setEditingAssignment(assignment);
    setIsCreating(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta evaluación? Esta acción eliminará también todas las respuestas asociadas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      showSuccess(
        'Evaluación eliminada',
        'La evaluación se ha eliminado correctamente.',
        3000
      );

      await fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showError(
        'Error al eliminar',
        'No se pudo eliminar la evaluación. Por favor, intente nuevamente.',
        5000
      );
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course_id: '',
      external_form_url: '',
      assignment_type: 'form',
      due_date: '',
      max_score: 100,
      form_questions: [],
      file_instructions: '',
      allowed_file_types: ['pdf', 'doc', 'docx'],
      max_file_size_mb: 10,
      is_active: true
    });
    setIsCreating(false);
    setEditingAssignment(null);
  };

  const addQuestion = () => {
    const newQuestion: FormQuestion = {
      id: Date.now().toString(),
      question: '',
      type: 'text',
      required: true,
      points: 10
    };
    setFormData({
      ...formData,
      form_questions: [...formData.form_questions, newQuestion]
    });
  };

  const updateQuestion = (questionId: string, updates: Partial<FormQuestion>) => {
    setFormData({
      ...formData,
      form_questions: formData.form_questions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const removeQuestion = (questionId: string) => {
    setFormData({
      ...formData,
      form_questions: formData.form_questions.filter(q => q.id !== questionId)
    });
  };

  const filteredAssignments = selectedCourse
    ? assignments.filter(a => a.course_id === selectedCourse)
    : assignments;

  if (isLoading && assignments.length === 0) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Administrar evaluaciones
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Cree y gestione evaluaciones para sus cursos
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <Plus size={18} className="mr-2" />
            Nueva evaluación
          </button>
        )}
      </div>

      {/* Filtro por curso */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Filtrar por curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Todos los cursos</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulario de creación/edición */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editingAssignment ? 'Editar evaluación' : 'Crear nueva evaluación'}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Curso *
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">Seleccionar curso</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de evaluación *
                  </label>
                  <select
                    value={formData.assignment_type}
                    onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="form">Formulario (respuesta automática)</option>
                    <option value="file_upload">Subida de archivo (ensayo/informe)</option>
                  </select>
                </div>

                {formData.assignment_type === 'form' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      URL de Formulario de Google (opcional)
                    </label>
                    <div className="flex">
                      <input
                        type="url"
                        value={formData.external_form_url}
                        onChange={(e) => setFormData({ ...formData, external_form_url: e.target.value })}
                        placeholder="https://forms.google.com/..."
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                      />
                      {formData.external_form_url && (
                        <a 
                          href={formData.external_form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-r-md hover:bg-slate-200 dark:hover:bg-slate-500 transition"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Si proporciona una URL de formulario externo, no necesita crear preguntas abajo.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Puntuación máxima
                  </label>
                  <input
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Configuración específica por tipo */}
              {formData.assignment_type === 'form' && !formData.external_form_url ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-semibold text-slate-800 dark:text-white">
                      Preguntas del formulario
                    </h3>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                      <Plus size={14} className="mr-1" />
                      Agregar pregunta
                    </button>
                  </div>

                  {formData.form_questions.map((question, index) => (
                    <div key={question.id} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800 dark:text-white">
                          Pregunta {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Pregunta *
                          </label>
                          <input
                            type="text"
                            value={question.question}
                            onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tipo de respuesta
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(question.id, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                          >
                            <option value="text">Texto corto</option>
                            <option value="textarea">Texto largo</option>
                            <option value="single_choice">Opción única</option>
                            <option value="multiple_choice">Opción múltiple</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Puntos
                          </label>
                          <input
                            type="number"
                            value={question.points}
                            onChange={(e) => updateQuestion(question.id, { points: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                          />
                        </div>

                        {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Opciones (una por línea)
                            </label>
                            <div className="space-y-2">
                              {(question.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex items-center">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(question.options || [])];
                                      newOptions[optionIndex] = e.target.value;
                                      updateQuestion(question.id, { options: newOptions });
                                    }}
                                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                                    placeholder={`Opción ${optionIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOptions = [...(question.options || [])];
                                      newOptions.splice(optionIndex, 1);
                                      updateQuestion(question.id, { options: newOptions });
                                    }}
                                    className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = [...(question.options || []), ''];
                                  updateQuestion(question.id, { options: newOptions });
                                }}
                                className="inline-flex items-center px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                              >
                                <Plus size={14} className="mr-1" />
                                Agregar opción
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                            Pregunta obligatoria
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.form_questions.length === 0 && (
                    <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                      <FileText size={24} className="mx-auto mb-2 opacity-50" />
                      <p>No hay preguntas agregadas.</p>
                      <p className="text-sm">Haga clic en "Agregar pregunta" para comenzar.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-slate-800 dark:text-white">
                    Configuración de subida de archivos
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Instrucciones para el estudiante
                    </label>
                    <textarea
                      value={formData.file_instructions}
                      onChange={(e) => setFormData({ ...formData, file_instructions: e.target.value })}
                      rows={4}
                      placeholder="Escriba las instrucciones detalladas para el ensayo o informe que deben entregar los estudiantes..."
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tipos de archivo permitidos
                      </label>
                      <div className="space-y-2">
                        {['pdf', 'doc', 'docx', 'txt', 'rtf'].map(type => (
                          <label key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.allowed_file_types.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    allowed_file_types: [...formData.allowed_file_types, type]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    allowed_file_types: formData.allowed_file_types.filter(t => t !== type)
                                  });
                                }
                              }}
                              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                            />
                            <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                              .{type.toUpperCase()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tamaño máximo de archivo (MB)
                      </label>
                      <input
                        type="number"
                        value={formData.max_file_size_mb}
                        onChange={(e) => setFormData({ ...formData, max_file_size_mb: parseInt(e.target.value) || 10 })}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Evaluación activa (visible para estudiantes)
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition disabled:opacity-50"
                >
                  {editingAssignment ? 'Actualizar' : 'Crear'} evaluación
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de evaluaciones */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => (
          <motion.div
            key={assignment.id}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-white mr-3">
                    {assignment.title}
                  </h3>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      assignment.assignment_type === 'form'
                        ? assignment.external_form_url 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {assignment.assignment_type === 'form' 
                        ? assignment.external_form_url 
                          ? 'Formulario Google' 
                          : 'Formulario' 
                        : 'Archivo'}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      assignment.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {assignment.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-3">
                  {assignment.description}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center">
                    <BookOpen size={16} className="mr-1" />
                    <span>Curso: {assignment.course_name}</span>
                    {assignment.external_form_url && (
                      <a 
                        href={assignment.external_form_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        Ver formulario
                      </a>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Users size={16} className="mr-1" />
                    <span>{assignment.submissions_count} respuestas</span>
                  </div>
                  <div className="flex items-center">
                    <FileText size={16} className="mr-1" />
                    <span>{assignment.max_score} puntos</span>
                  </div>
                  {assignment.due_date && (
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-1" />
                      <span>Vence: {new Date(assignment.due_date).toLocaleDateString('es-AR')}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 lg:mt-0 lg:ml-6 flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(assignment)}
                  className="p-2 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition"
                  title="Editar evaluación"
                >
                  <Edit size={18} />
                </button>
                
                <button
                  onClick={() => handleDelete(assignment.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition"
                  title="Eliminar evaluación"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
              No hay evaluaciones
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {selectedCourse 
                ? 'No hay evaluaciones para el curso seleccionado'
                : 'Cree su primera evaluación haciendo clic en "Nueva evaluación".'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAssignments;