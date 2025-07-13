import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  User, 
  Calendar, 
  CheckCircle, 
  Edit,
  Save,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import AssignmentFileService from '../../services/assignmentFileService';

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_name: string;
  assignment_type: 'form' | 'external_form' | 'file_upload';
  max_score: number;
  due_date: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  submitted_at: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  grade?: number;
  feedback?: string;
  graded_at?: string;
  student: Student;
}

const AssignmentSubmissions: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState<{ grade: number; feedback: string }>({ grade: 0, feedback: '' });

  useEffect(() => {
    if (assignmentId && user?.id) {
      fetchAssignmentData();
    }
  }, [assignmentId, user?.id]);

  const fetchAssignmentData = async () => {
    try {
      setIsLoading(true);

      // Obtener información de la evaluación
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses(name)
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      setAssignment({
        ...assignmentData,
        course_name: assignmentData.course?.name || 'Curso desconocido'
      });

      // Obtener entregas de estudiantes
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          student:users!assignment_submissions_student_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      setSubmissions(submissionsData || []);

    } catch (error) {
      console.error('Error fetching assignment data:', error);
      showError(
        'Error al cargar datos',
        'No se pudieron cargar los datos de la evaluación',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const url = await AssignmentFileService.getDownloadUrl(fileUrl);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showSuccess(
          'Descarga iniciada',
          `Descargando ${fileName}`,
          3000
        );
      } else {
        showError(
          'Error de descarga',
          'No se pudo generar el enlace de descarga',
          3000
        );
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      showError(
        'Error de descarga',
        'No se pudo descargar el archivo',
        3000
      );
    }
  };

  const handleStartGrading = (submission: Submission) => {
    setEditingGrade(submission.id);
    setGradeData({
      grade: submission.grade || 0,
      feedback: submission.feedback || ''
    });
  };

  const handleSaveGrade = async (submissionId: string) => {
    try {
      if (gradeData.grade < 0 || gradeData.grade > (assignment?.max_score || 100)) {
        showError(
          'Calificación inválida',
          `La calificación debe estar entre 0 y ${assignment?.max_score || 100}`,
          3000
        );
        return;
      }

      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: gradeData.grade,
          feedback: gradeData.feedback.trim() || null,
          graded_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      showSuccess(
        'Calificación guardada',
        'La calificación se ha guardado correctamente',
        3000
      );

      setEditingGrade(null);
      await fetchAssignmentData();

    } catch (error) {
      console.error('Error saving grade:', error);
      showError(
        'Error al guardar',
        'No se pudo guardar la calificación',
        3000
      );
    }
  };

  const handleCancelGrading = () => {
    setEditingGrade(null);
    setGradeData({ grade: 0, feedback: '' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSubmissionStatus = (submission: Submission) => {
    if (submission.grade !== null && submission.grade !== undefined) {
      return { status: 'graded', label: 'Calificado', color: 'green' };
    }
    return { status: 'pending', label: 'Pendiente', color: 'yellow' };
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            Evaluación no encontrada
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            No se pudo encontrar la evaluación solicitada
          </p>
          <button
            onClick={() => navigate('/teacher/assignments')}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            Volver a Evaluaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/teacher/assignments')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Volver a evaluaciones"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Entregas de Evaluación
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {assignment.title} • {assignment.course_name}
            </p>
          </div>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-sky-600" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Tipo</p>
              <p className="font-medium text-slate-800 dark:text-white">
                {assignment.assignment_type === 'file_upload' ? 'Subida de Archivo' : 'Formulario'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-sky-600" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Fecha límite</p>
              <p className="font-medium text-slate-800 dark:text-white">
                {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('es-ES') : 'Sin fecha límite'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-sky-600" />
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Puntaje máximo</p>
              <p className="font-medium text-slate-800 dark:text-white">
                {assignment.max_score} puntos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Entregas de Estudiantes ({submissions.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {submissions.map((submission) => {
            const status = getSubmissionStatus(submission);
            const isEditing = editingGrade === submission.id;

            return (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-sky-600 dark:text-sky-300" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800 dark:text-white">
                        {submission.student.first_name} {submission.student.last_name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {submission.student.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      status.color === 'green' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* File Information */}
                {submission.file_url && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {submission.file_name || 'Archivo sin nombre'}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {submission.file_size && formatFileSize(submission.file_size)} • 
                            {submission.file_type} • 
                            Enviado el {new Date(submission.submitted_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(submission.file_url!, submission.file_name || 'archivo')}
                        className="p-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                        title="Descargar archivo"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Grading Section */}
                {isEditing ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Calificación (0-{assignment.max_score})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={assignment.max_score}
                            value={gradeData.grade}
                            onChange={(e) => setGradeData({ ...gradeData, grade: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                            title="Ingrese la calificación"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Porcentaje
                          </label>
                          <input
                            type="text"
                            value={`${((gradeData.grade / assignment.max_score) * 100).toFixed(1)}%`}
                            readOnly
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                            title="Porcentaje calculado automáticamente"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Comentarios (opcional)
                        </label>
                        <textarea
                          value={gradeData.feedback}
                          onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                          placeholder="Escriba sus comentarios sobre la evaluación..."
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleCancelGrading}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveGrade(submission.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Guardar Calificación
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      {submission.grade !== null && submission.grade !== undefined ? (
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">
                            Calificación: {submission.grade}/{assignment.max_score} ({((submission.grade / assignment.max_score) * 100).toFixed(1)}%)
                          </p>
                          {submission.feedback && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Comentarios: {submission.feedback}
                            </p>
                          )}
                          {submission.graded_at && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Calificado el {new Date(submission.graded_at).toLocaleDateString('es-ES')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400">
                          Sin calificar
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleStartGrading(submission)}
                      className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span>{submission.grade !== null ? 'Editar Calificación' : 'Calificar'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {submissions.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
              No hay entregas
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Aún no se han recibido entregas para esta evaluación
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentSubmissions;
