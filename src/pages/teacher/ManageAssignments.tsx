import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, X, FileText, Calendar, Users, BookOpen, ExternalLink, GraduationCap, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import CreateAssignmentQuestionsModal from '../../components/CreateAssignmentQuestionsModalNew';


interface Course {
  id: string;
  name: string;
  course_code: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  external_form_url?: string;
  course_name: string;
  assignment_type: 'form' | 'file_upload' | 'external_form';
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
  correct_answers?: number[]; // Agregar respuestas correctas
  required: boolean;
  points: number;
}

const ManageAssignments = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

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
        .select('id, name, course_code')
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
          grades(count),
          assignment_submissions(count)
        `)
        .in('course_id', (coursesData || []).map(c => c.id))
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const processedAssignments = (assignmentsData || []).map(assignment => ({
        ...assignment,
        course_name: assignment.course?.name || 'Curso desconocido',
        submissions_count: assignment.assignment_submissions?.length || assignment.grades?.length || 0,
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

    /// Validación específica para formularios internos vs externos
    if (formData.assignment_type === 'form') {
      // Para formularios internos, abrir el modal de preguntas
      setSelectedAssignmentId(null); // Asegurar que esté limpio para nueva evaluación
      setShowQuestionsModal(true);
      return;
    } else if (formData.assignment_type === 'external_form') {
      if (!formData.external_form_url.trim()) {
        showError(
          'URL requerida', 
          'Para formularios externos debe proporcionar la URL del formulario.', 
          4000
        );
        return;
      }
    }

    // Para otros tipos de evaluaciones, continuar con el proceso normal
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
          'La evaluación se ha creada correctamente.',
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

  const handleCloseQuestionsModal = () => {
    setShowQuestionsModal(false);
    setSelectedAssignmentId(null);
  };

  const handleQuestionsModalSave = async (questions?: any[]) => {
    // Si questions está definido, significa que venimos de crear una nueva evaluación
    if (questions && formData.assignment_type === 'form') {
      try {
        setIsLoading(true);

        // Convertir questions del modal al formato FormQuestion
        const formQuestions: FormQuestion[] = questions.map(q => ({
          id: q.id,
          question: q.question_text,
          type: q.question_type === 'multiple_choice' ? 'multiple_choice' : 'text',
          options: q.options || [],
          correct_answers: q.correct_answers || [], // Agregar respuestas correctas
          required: q.is_required,
          points: q.max_points
        }));
        
        console.log('Questions received from modal:', questions);
        console.log('Form questions to save:', formQuestions);

        const assignmentData = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          external_form_url: formData.external_form_url.trim() || null,
          course_id: formData.course_id,
          assignment_type: formData.assignment_type,
          due_date: formData.due_date || null,
          max_score: formData.max_score,
          form_questions: formQuestions,
          file_instructions: null,
          allowed_file_types: null,
          max_file_size_mb: null,
          is_active: formData.is_active
        };

        if (editingAssignment) {
          const { error } = await supabase
            .from('assignments')
            .update(assignmentData)
            .eq('id', editingAssignment.id);

          if (error) throw error;
          
          showSuccess('Evaluación actualizada', 'La evaluación se ha actualizado exitosamente.', 3000);
        } else {
          const { error } = await supabase
            .from('assignments')
            .insert([assignmentData]);

          if (error) throw error;
          
          showSuccess('Evaluación creada', 'La evaluación se ha creado exitosamente.', 3000);
        }

        // Limpiar formulario y cerrar modal
        setFormData({
          title: '',
          description: '',
          external_form_url: '',
          course_id: '',
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
        fetchData();
        
      } catch (error) {
        console.error('Error saving assignment:', error);
        showError('Error', 'Hubo un error al guardar la evaluación. Intente nuevamente.', 4000);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Caso normal: solo refrescar datos
      fetchData();
    }
    
    handleCloseQuestionsModal();
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
      {/* NotificationContext es aplicado globalmente sin necesidad de agregar codigo acá*/}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Administrar evaluaciones
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Cree y gestione evaluaciones para sus cursos *
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
              title="Filtrar evaluaciones por curso"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Todos los cursos</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
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
                title='Cerrar formulario'
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
                    title='Título de la evaluación'
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
                    title='Seleccionar curso'
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">Seleccionar curso</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
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
                  title='Descripción de la evaluación'
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
                    title='Seleccionar tipo de evaluación'
                    value={formData.assignment_type}
                    onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="form">Formulario interno (respuesta automática)</option>
                    <option value="external_form">Formulario externo (URL)</option>
                    <option value="file_upload">Subida de archivo (ensayo/informe)</option>
                  </select>
                </div>

                {formData.assignment_type === 'external_form' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      URL de Formulario Externo *
                    </label>
                    <div className="flex">
                      <input
                        type="url"
                        value={formData.external_form_url}
                        onChange={(e) => setFormData({ ...formData, external_form_url: e.target.value })}
                        placeholder="https://forms.google.com/..."
                        required
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                      />
                      {formData.external_form_url && (
                        <a 
                          href={formData.external_form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir formulario externo"
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-r-md hover:bg-slate-200 dark:hover:bg-slate-500 transition"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Para formularios externos, solo se registrará el puntaje final manualmente.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha límite
                  </label>
                  <input 
                    title='Fecha límite para la evaluación'
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
                    title='Puntuación máxima para la evaluación'
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Configuración específica por tipo */}
              {formData.assignment_type === 'form' ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Formulario Interno - Configuración de preguntas
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Al hacer clic en "Crear Evaluación", se abrirá un modal para configurar las preguntas del formulario interno con calificación automática.
                      </p>
                    </div>
                  </div>
                </div>
              ) : formData.assignment_type === 'file_upload' ? (
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
                        title='Tamaño máximo de archivo permitido'
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
              ) : null}

              <div className="flex items-center">
                <input
                  title='Marcar evaluación como activa'
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
                    <span>
                      {assignment.assignment_type === 'file_upload' ? 'Entregas' : 'Respuestas'}: {assignment.submissions_count}
                    </span>
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
                {assignment.assignment_type === 'file_upload' && (
                  <button
                    onClick={() => navigate(`/teacher/assignments/${assignment.id}/submissions`)}
                    className="p-2 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20 rounded-md transition"
                    title="Ver entregas de estudiantes"
                  >
                    <FileText size={18} />
                  </button>
                )}
                
                {assignment.assignment_type === 'form' && (
                  <button
                    onClick={() => {
                      setSelectedAssignmentId(assignment.id);
                      setShowQuestionsModal(true);
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-md transition"
                    title="Crear/Editar preguntas"
                  >
                    <HelpCircle size={18} />
                  </button>
                )}
                
                <button
                  onClick={() => navigate(`/teacher/managegrades/${assignment.id}`)}
                  className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded-md transition"
                  title="Gestionar notas"
                >
                  <GraduationCap size={18} />
                </button>
                
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

      {/* Información sobre tipos de evaluación */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Tipos de evaluaciones
            </h3>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
              <p><strong>Formulario interno:</strong> Crea preguntas dentro de la aplicación con respuestas automáticas y cálculo de puntaje.</p>
              <p><strong>Formulario externo:</strong> Usa una URL externa (Google Forms, etc.). Solo se registra el puntaje final manualmente.</p>
              <p><strong>Subida de archivo:</strong> Para ensayos e informes que requieren revisión manual.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de creación de preguntas */}
      {showQuestionsModal && (
        <CreateAssignmentQuestionsModal
          isOpen={showQuestionsModal}
          onClose={handleCloseQuestionsModal}
          assignmentId={selectedAssignmentId || undefined}
          assignmentData={formData.assignment_type === 'form' && !selectedAssignmentId ? {
            title: formData.title,
            description: formData.description,
            course_id: formData.course_id,
            due_date: formData.due_date,
            max_score: formData.max_score,
            is_active: formData.is_active
          } : undefined}
          onSave={handleQuestionsModalSave}
        />
      )}
    </div>
  );
};

export default ManageAssignments;