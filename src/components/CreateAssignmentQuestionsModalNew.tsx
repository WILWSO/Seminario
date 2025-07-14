import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Save, GripVertical, HelpCircle, Download, Upload } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { supabase } from '../config/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { formStorageService } from '../services/formStorageService';

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_name: string;
  assignment_type: 'form' | 'external_form' | 'file_upload';
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice' | 'essay';
  options: string[];
  correct_answers: number[];
  is_required: boolean;
  max_points: number;
  order_number: number;
}

interface CreateAssignmentQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId?: string; // Opcional para modo creación
  assignmentData?: {
    title: string;
    description: string;
    course_id: string;
    due_date: string;
    max_score: number;
    is_active: boolean;
  }; // Datos para crear nueva evaluación
  onSave: (questions?: Question[]) => void;
}

const CreateAssignmentQuestionsModal = ({ 
  isOpen, 
  onClose, 
  assignmentId, 
  assignmentData,
  onSave 
}: CreateAssignmentQuestionsModalProps) => {
  const { showSuccess, showError } = useNotifications();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (assignmentId) {
        // Modo edición: cargar datos existentes
        fetchData();
      } else if (assignmentData) {
        // Modo creación: usar datos proporcionados
        setAssignment({
          id: 'new',
          title: assignmentData.title,
          description: assignmentData.description,
          course_name: 'Curso seleccionado',
          assignment_type: 'form'
        });
        setQuestions([]);
        setIsLoading(false);
      }
    }
  }, [isOpen, assignmentId, assignmentData]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching assignment data for ID:', assignmentId);

      // Buscar evaluación
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses(name)
        `)
        .eq('id', assignmentId)
        .single();

      console.log('Assignment query result:', { assignmentData, assignmentError });

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        throw assignmentError;
      }

      if (!assignmentData) {
        throw new Error('No se encontró la evaluación');
      }

      setAssignment({
        id: assignmentData.id,
        title: assignmentData.title,
        description: assignmentData.description || '',
        course_name: assignmentData.course?.name || 'Curso sin nombre',
        assignment_type: assignmentData.assignment_type
      });

      // Buscar preguntas existentes
      console.log('Fetching questions for assignment:', assignmentId);
      const { data: questionsData, error: questionsError } = await supabase
        .from('assignment_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_number', { ascending: true });

      console.log('Questions query result:', { questionsData, questionsError });

      if (questionsError) {
        console.error('Questions error:', questionsError);
        // Manejar diferentes tipos de errores
        if (questionsError.code === 'PGRST116' || questionsError.code === 'PGRST204') {
          console.log('Table assignment_questions might not exist or no data found, continuing with empty questions');
          setQuestions([]);
        } else if (questionsError.code === '42703') {
          console.log('Column might not exist (correct_answers), continuing with empty questions');
          showError(
            'Base de datos no actualizada',
            'Es necesario ejecutar la migración para agregar el campo correct_answers. Consulte la documentación.',
            8000
          );
          setQuestions([]);
        } else {
          throw new Error(`Error al buscar preguntas: ${questionsError.message}`);
        }
      } else {
        // Mapear las preguntas para incluir correct_answers
        const processedQuestions = (questionsData || []).map(q => ({
          ...q,
          correct_answers: q.correct_answers || [],
          // Asegurar que las opciones sean un array
          options: Array.isArray(q.options) ? q.options : []
        }));

        console.log('Processed questions:', processedQuestions);
        setQuestions(processedQuestions);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(
        'Error al cargar datos',
        `No fue posible cargar los datos de la evaluación: ${errorMessage}`,
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      question_text: '',
      question_type: 'text',
      options: [],
      correct_answers: [],
      is_required: true,
      max_points: 1,
      order_number: questions.length
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        const updated = { ...q, [field]: value };
        
        // Si cambia el tipo de pregunta, resetear opciones y respuestas correctas
        if (field === 'question_type') {
          if (value === 'multiple_choice') {
            updated.options = ['', ''];
          } else {
            updated.options = [];
          }
          updated.correct_answers = [];
        }
        
        return updated;
      }
      return q;
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = q.options.filter((_, index) => index !== optionIndex);
        const newCorrectAnswers = q.correct_answers
          .filter(index => index !== optionIndex)
          .map(index => index > optionIndex ? index - 1 : index);
        
        return { 
          ...q, 
          options: newOptions,
          correct_answers: newCorrectAnswers
        };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const toggleCorrectAnswer = (questionId: string, optionIndex: number) => {
    setQuestions(prevQuestions => {
      const updatedQuestions = prevQuestions.map(q => {
        if (q.id === questionId) {
          const newCorrectAnswers = [...q.correct_answers];
          const existingIndex = newCorrectAnswers.indexOf(optionIndex);
          
          if (existingIndex > -1) {
            newCorrectAnswers.splice(existingIndex, 1);
          } else {
            newCorrectAnswers.push(optionIndex);
          }
          
          return { ...q, correct_answers: newCorrectAnswers };
        }
        return q;
      });
      
      return updatedQuestions;
    });
  };

  const handleReorder = (newOrder: Question[]) => {
    const reorderedQuestions = newOrder.map((question, index) => ({
      ...question,
      order_number: index
    }));
    setQuestions(reorderedQuestions);
  };

  const validateQuestions = () => {
    for (const question of questions) {
      if (!question.question_text.trim()) {
        showError(
          'Pregunta vacía',
          'Todas las preguntas deben tener texto.',
          3000
        );
        return false;
      }
      
      if (question.question_type === 'multiple_choice' && question.options.length < 2) {
        showError(
          'Opciones insuficientes',
          'Las preguntas de opción múltiple deben tener al menos 2 opciones.',
          3000
        );
        return false;
      }
      
      if (question.question_type === 'multiple_choice') {
        const validOptions = question.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          showError(
            'Opciones vacías',
            'Las preguntas de opción múltiple deben tener al menos 2 opciones con texto.',
            3000
          );
          return false;
        }
        
        if (question.correct_answers.length === 0) {
          showError(
            'Respuesta correcta faltante',
            'Las preguntas de opción múltiple deben tener al menos una respuesta correcta marcada.',
            3000
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateQuestions()) return;

    try {
      setIsSaving(true);
      console.log('Starting to save questions for assignment:', assignmentId);

      // Verificar que tenemos preguntas para guardar
      if (questions.length === 0) {
        showError(
          'No hay preguntas',
          'Debe agregar al menos una pregunta antes de guardar.',
          3000
        );
        return;
      }

      // Si es modo creación (sin assignmentId), devolver las preguntas al componente padre
      if (!assignmentId) {
        const formattedQuestions = questions.map((question, index) => ({
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.question_type === 'multiple_choice' ? question.options.filter(opt => opt.trim() !== '') : [],
          correct_answers: question.question_type === 'multiple_choice' ? question.correct_answers : [],
          is_required: question.is_required,
          max_points: question.max_points,
          order_number: index
        }));
        
        onSave(formattedQuestions);
        return;
      }

      // Modo edición: guardar en la base de datos
      // Eliminar preguntas existentes
      console.log('Deleting existing questions...');
      const { error: deleteError } = await supabase
        .from('assignment_questions')
        .delete()
        .eq('assignment_id', assignmentId);

      if (deleteError) {
        console.error('Error deleting existing questions:', deleteError);
        throw new Error(`Error al eliminar preguntas existentes: ${deleteError.message}`);
      }

      // Preparar preguntas para insertar
      const questionsToInsert = questions.map((question, index) => {
        const questionData = {
          assignment_id: assignmentId,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.question_type === 'multiple_choice' ? question.options.filter(opt => opt.trim() !== '') : null,
          correct_answers: question.question_type === 'multiple_choice' ? question.correct_answers : null,
          is_required: question.is_required,
          max_points: question.max_points,
          order_number: index
        };
        
        console.log('Question to insert:', questionData);
        return questionData;
      });

      // Insertar nuevas preguntas
      console.log('Inserting new questions...');
      const { error: insertError, data: insertedData } = await supabase
        .from('assignment_questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting questions:', insertError);
        throw new Error(`Error al insertar preguntas: ${insertError.message}`);
      }

      console.log('Questions saved successfully:', insertedData);

      showSuccess(
        'Preguntas guardadas',
        'Las preguntas de la evaluación fueron guardadas con éxito.',
        3000
      );

      onSave();
      onClose();

    } catch (error) {
      console.error('Error saving questions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(
        'Error al guardar preguntas',
        `No fue posible guardar las preguntas: ${errorMessage}`,
        5000
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportForm = async () => {
    if (!assignmentId) {
      showError(
        'No disponible',
        'La exportación solo está disponible para evaluaciones guardadas.',
        3000
      );
      return;
    }

    try {
      setIsExporting(true);
      console.log('Exporting form for assignment:', assignmentId);
      
      const result = await formStorageService.exportForm(assignmentId);
      
      // Crear un enlace de descarga
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess(
        'Formulario exportado',
        `El formulario ha sido exportado como ${result.fileName}`,
        4000
      );
      
    } catch (error) {
      console.error('Error exporting form:', error);
      showError(
        'Error al exportar',
        `No se pudo exportar el formulario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        5000
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportForm = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!assignmentId) {
      showError(
        'No disponible',
        'La importación solo está disponible para evaluaciones guardadas.',
        3000
      );
      return;
    }

    try {
      setIsImporting(true);
      console.log('Importing form from file:', file.name);
      
      const result = await formStorageService.importForm(file, assignmentId);
      
      if (result.success) {
        showSuccess(
          'Formulario importado',
          `Se importaron ${result.questionsImported} preguntas exitosamente`,
          4000
        );
        
        // Recargar las preguntas
        fetchData();
      } else {
        showError(
          'Error al importar',
          result.message,
          5000
        );
        
        if (result.errors) {
          console.error('Import errors:', result.errors);
        }
      }
      
    } catch (error) {
      console.error('Error importing form:', error);
      showError(
        'Error al importar',
        `No se pudo importar el formulario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        5000
      );
    } finally {
      setIsImporting(false);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Crear Preguntas - {assignment?.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {assignment?.course_name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Botón de Exportar */}
                <button
                  onClick={handleExportForm}
                  disabled={isExporting || questions.length === 0}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Exportar formulario"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exportando...' : 'Exportar'}
                </button>
                
                {/* Botón de Importar */}
                <button
                  onClick={handleImportForm}
                  disabled={isImporting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Importar formulario"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importando...' : 'Importar'}
                </button>
                
                {/* Input oculto para archivos */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  title="Seleccionar archivo JSON"
                />
                
                <button
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Cerrar modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-slate-800 px-4 pb-4 sm:px-6 sm:pb-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Información de la evaluación */}
                {assignment?.description && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {assignment.description}
                    </p>
                  </div>
                )}

                {/* Estadísticas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium text-green-800 dark:text-green-300">
                      Total de preguntas
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {questions.length}
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-800 dark:text-purple-300">
                      Puntos totales
                    </div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {questions.reduce((sum, q) => sum + q.max_points, 0)}
                    </div>
                  </div>
                </div>

                {/* Preguntas */}
                {questions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                      <HelpCircle className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                      No hay preguntas
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Agrega preguntas para crear tu evaluación o importa un formulario existente.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={addQuestion}
                        className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Primera Pregunta
                      </button>
                      <button
                        onClick={handleImportForm}
                        disabled={isImporting}
                        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Formulario
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Preguntas ({questions.length})
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Arrastra para reordenar
                      </p>
                    </div>
                    <Reorder.Group
                      axis="y"
                      values={questions}
                      onReorder={handleReorder}
                      className="space-y-3"
                    >
                      {questions.map((question, index) => (
                        <Reorder.Item
                          key={question.id}
                          value={question}
                          dragListener={false}
                          className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <div
                                className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                                onPointerDown={(e) => {
                                  (e.target as HTMLElement).closest('[data-framer-name]')?.dispatchEvent(
                                    new PointerEvent('pointerdown', { pointerId: e.pointerId, bubbles: true })
                                  );
                                }}
                              >
                                <GripVertical className="h-4 w-4 text-slate-400" />
                              </div>
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                Pregunta {index + 1}
                              </span>
                            </div>
                            <button
                              onClick={() => removeQuestion(question.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500 hover:text-red-700"
                              title="Eliminar pregunta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            {/* Texto de la pregunta */}
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Texto de la pregunta *
                              </label>
                              <textarea
                                value={question.question_text}
                                onChange={(e) => updateQuestion(question.id, 'question_text', e.target.value)}
                                placeholder="Escribe tu pregunta aquí..."
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-800 dark:text-white"
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Tipo de pregunta */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Tipo de pregunta
                                </label>
                                <select
                                  value={question.question_type}
                                  onChange={(e) => updateQuestion(question.id, 'question_type', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-800 dark:text-white"
                                  title="Seleccionar tipo de pregunta"
                                >
                                  <option value="text">Texto corto</option>
                                  <option value="essay">Ensayo</option>
                                  <option value="multiple_choice">Opción múltiple</option>
                                </select>
                              </div>

                              {/* Puntos máximos */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Puntos máximos
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={question.max_points}
                                  onChange={(e) => updateQuestion(question.id, 'max_points', parseInt(e.target.value) || 1)}
                                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-800 dark:text-white"
                                  title="Puntos máximos para esta pregunta"
                                />
                              </div>

                              {/* Obligatoria */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Obligatoria
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={question.is_required}
                                    onChange={(e) => updateQuestion(question.id, 'is_required', e.target.checked)}
                                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    title="Marcar como obligatoria"
                                  />
                                  <span className="text-sm text-slate-700 dark:text-slate-300">
                                    Respuesta obligatoria
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Opciones para preguntas de opción múltiple */}
                            {question.question_type === 'multiple_choice' && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Opciones
                                  </label>
                                  <button
                                    onClick={() => addOption(question.id)}
                                    className="inline-flex items-center px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Agregar Opción
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {question.options.map((option, optionIndex) => {
                                    const isCorrect = question.correct_answers.includes(optionIndex);
                                    return (
                                      <div 
                                        key={optionIndex} 
                                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                                          isCorrect 
                                            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                                        }`}
                                      >
                                        <span className="text-sm text-slate-600 dark:text-slate-400 w-6 font-medium">
                                          {String.fromCharCode(65 + optionIndex)}.
                                        </span>
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                          placeholder={`Opción ${String.fromCharCode(65 + optionIndex)}`}
                                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-800 dark:text-white"
                                        />
                                        <div className="flex items-center space-x-2">
                                          <div className={`flex items-center space-x-1 px-2 py-1 rounded border transition-colors ${
                                            isCorrect 
                                              ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' 
                                              : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                                          }`}>
                                            <input
                                              type="checkbox"
                                              checked={isCorrect}
                                              onChange={() => toggleCorrectAnswer(question.id, optionIndex)}
                                              className="rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                              title="Marcar como respuesta correcta"
                                            />
                                            <span 
                                              className={`text-xs font-medium cursor-pointer transition-colors ${
                                                isCorrect 
                                                  ? 'text-green-700 dark:text-green-300' 
                                                  : 'text-slate-600 dark:text-slate-400'
                                              }`}
                                              onClick={() => toggleCorrectAnswer(question.id, optionIndex)}
                                            >
                                              {isCorrect ? '✓ Correcta' : 'Correcta'}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => removeOption(question.id, optionIndex)}
                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500 hover:text-red-700"
                                            title="Eliminar opción"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSave}
              disabled={isSaving || questions.length === 0}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Preguntas'}
            </button>
            <button
              onClick={addQuestion}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Pregunta
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAssignmentQuestionsModal;
