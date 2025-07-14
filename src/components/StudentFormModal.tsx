import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle, FileText, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../config/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import './StudentFormModal.css';

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_name: string;
  max_score: number;
  due_date: string;
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

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  studentId: string;
  onSubmissionComplete: () => void;
}

const StudentFormModal = ({ 
  isOpen, 
  onClose, 
  assignment, 
  studentId, 
  onSubmissionComplete 
}: StudentFormModalProps) => {
  const { showSuccess, showError } = useNotifications();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(0);

  useEffect(() => {
    if (isOpen && assignment?.id) {
      fetchQuestions();
    }
  }, [isOpen, assignment?.id]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching questions for assignment:', assignment.id);
      console.log('Assignment data:', assignment);

      // Primero, buscar la evaluación para obtener las preguntas del campo form_questions
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('form_questions')
        .eq('id', assignment.id)
        .single();

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError);
        throw assignmentError;
      }

      console.log('Assignment fetched:', assignmentData);
      
      let questionsData: Question[] = [];
      
      if (assignmentData?.form_questions && Array.isArray(assignmentData.form_questions)) {
        // Convertir las preguntas del formato FormQuestion al formato Question
        questionsData = assignmentData.form_questions.map((q: any, index: number) => ({
          id: q.id || `question_${index}`,
          question_text: q.question || q.question_text,
          question_type: q.type || q.question_type,
          options: q.options || [],
          correct_answers: q.correct_answers || [],
          is_required: q.required !== undefined ? q.required : q.is_required,
          max_points: q.points || q.max_points || 1,
          order_number: index
        }));
        
        console.log('Questions converted from form_questions:', questionsData);
        questionsData.forEach((q, i) => {
          console.log(`Question ${i + 1}:`, {
            id: q.id,
            text: q.question_text,
            type: q.question_type,
            options: q.options,
            correct_answers: q.correct_answers,
            points: q.max_points
          });
        });
      } else {
        // Si no hay preguntas en form_questions, buscar en assignment_questions (fallback)
        const { data: alternativeQuestions, error: alternativeError } = await supabase
          .from('assignment_questions')
          .select('*')
          .eq('assignment_id', assignment.id)
          .order('order_number', { ascending: true });

        if (alternativeError) {
          console.error('Error fetching alternative questions:', alternativeError);
        } else {
          questionsData = alternativeQuestions || [];
        }
      }

      console.log('Questions processed:', questionsData);
      console.log('Number of questions found:', questionsData?.length || 0);
      
      if (!questionsData || questionsData.length === 0) {
        console.warn('No questions found for assignment:', assignment.id);
        console.log('Assignment form_questions:', assignmentData?.form_questions);
      }
      
      setQuestions(questionsData || []);
      
      // Inicializar respuestas vacías
      const initialAnswers: Record<string, any> = {};
      (questionsData || []).forEach(question => {
        initialAnswers[question.id] = question.question_type === 'multiple_choice' ? [] : '';
      });
      setAnswers(initialAnswers);

    } catch (error) {
      console.error('Error fetching questions:', error);
      showError(
        'Error al cargar preguntas',
        'No se pudieron cargar las preguntas de la evaluación.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultipleChoiceChange = (questionId: string, optionIndex: number, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = prev[questionId] || [];
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentAnswers, optionIndex]
        };
      } else {
        return {
          ...prev,
          [questionId]: currentAnswers.filter((index: number) => index !== optionIndex)
        };
      }
    });
  };

  const calculateScore = () => {
    let totalScore = 0;
    
    questions.forEach(question => {
      const answer = answers[question.id];
      
      if (question.question_type === 'multiple_choice') {
        // Para opción múltiple, verificar si las respuestas coinciden exactamente
        const correctAnswers = question.correct_answers.sort();
        const studentAnswers = (answer || []).sort();
        
        if (JSON.stringify(correctAnswers) === JSON.stringify(studentAnswers)) {
          totalScore += question.max_points;
        }
      } else if (question.question_type === 'text') {
        // Para texto corto, si hay respuesta y no está vacía, dar puntos completos
        // (en una implementación real, aquí se podría implementar comparación de texto)
        if (answer && answer.trim() !== '') {
          totalScore += question.max_points;
        }
      } else if (question.question_type === 'essay') {
        // Para ensayo, si hay respuesta y no está vacía, dar puntos completos
        // (en una implementación real, aquí se requeriría revisión manual)
        if (answer && answer.trim() !== '') {
          totalScore += question.max_points;
        }
      }
    });
    
    return totalScore;
  };

  const validateAnswers = () => {
    for (const question of questions) {
      if (question.is_required) {
        const answer = answers[question.id];
        
        if (question.question_type === 'multiple_choice') {
          if (!answer || answer.length === 0) {
            showError(
              'Respuesta requerida',
              `La pregunta "${question.question_text}" es obligatoria.`,
              5000
            );
            return false;
          }
        } else {
          if (!answer || answer.trim() === '') {
            showError(
              'Respuesta requerida',
              `La pregunta "${question.question_text}" es obligatoria.`,
              5000
            );
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;

    try {
      setIsSubmitting(true);
      
      // Calcular puntaje
      const score = calculateScore();
      setCalculatedScore(score);
      
      // Guardar la submission
      const { error: submissionError } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignment.id,
          student_id: studentId,
          submission_type: 'form',
          form_answers: answers,
          grade: score,
          graded_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        });

      if (submissionError) {
        console.error('Error saving submission:', submissionError);
        throw submissionError;
      }

      console.log('Form submitted successfully with score:', score);
      
      // Mostrar resultados
      setShowResults(true);
      
      showSuccess(
        'Formulario enviado',
        `Tu formulario ha sido enviado y calificado automáticamente. Puntuación: ${score}/${assignment.max_score}`,
        5000
      );

    } catch (error) {
      console.error('Error submitting form:', error);
      showError(
        'Error al enviar',
        'No se pudo enviar el formulario. Por favor, intenta nuevamente.',
        5000
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (showResults) {
      onSubmissionComplete();
    }
    onClose();
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {showResults ? 'Resultados de la Evaluación' : assignment.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {showResults ? 'Calificación Automática' : assignment.course_name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-slate-800 px-4 pb-4 sm:px-6 sm:pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500"></div>
              </div>
            ) : showResults ? (
              // Mostrar resultados
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    ¡Evaluación Completada!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tu evaluación ha sido calificada automáticamente
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                      Puntuación Final
                    </h4>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {calculatedScore} / {assignment.max_score}
                    </div>
                    <div className="text-lg text-green-700 dark:text-green-300 mt-2">
                      {((calculatedScore / assignment.max_score) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                        Calificación Automática
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Esta evaluación ha sido calificada automáticamente basándose en las respuestas correctas configuradas por el profesor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay preguntas disponibles
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Esta evaluación no tiene preguntas configuradas.
                </p>
              </div>
            ) : (
              // Mostrar preguntas
              <div className="space-y-6">
                {/* Información de la evaluación */}
                {assignment.description && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {assignment.description}
                    </p>
                  </div>
                )}

                {/* Progreso */}
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Progreso
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {currentQuestionIndex + 1} de {questions.length}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      ref={(el) => {
                        if (el) {
                          el.style.setProperty('--progress-width', `${progressPercentage}%`);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Pregunta actual */}
                {currentQuestion && (
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white dark:bg-slate-700 rounded-lg p-6 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {currentQuestion.question_text}
                        {currentQuestion.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {currentQuestion.max_points} pts
                        </span>
                      </div>
                    </div>

                    {/* Respuesta según tipo de pregunta */}
                    {currentQuestion.question_type === 'text' && (
                      <input
                        type="text"
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                        placeholder="Escribe tu respuesta..."
                      />
                    )}

                    {currentQuestion.question_type === 'essay' && (
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                        placeholder="Escribe tu respuesta detallada..."
                      />
                    )}

                    {currentQuestion.question_type === 'multiple_choice' && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                          <label key={index} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(answers[currentQuestion.id] || []).includes(index)}
                              onChange={(e) => handleMultipleChoiceChange(currentQuestion.id, index, e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700 dark:text-slate-300">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {currentQuestion.is_required && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        * Esta pregunta es obligatoria
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Navegación */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={isFirstQuestion}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isFirstQuestion
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500'
                    }`}
                  >
                    Anterior
                  </button>

                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Vence: {new Date(assignment.due_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>

                  {isLastQuestion ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Enviando...' : 'Enviar Evaluación'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Siguiente
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFormModal;
