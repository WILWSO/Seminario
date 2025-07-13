import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FileUploadComponent from './FileUploadComponent';
import AssignmentFileService, { FileUploadResult } from '../services/assignmentFileService';
import AssignmentSubmissionService, { AssignmentSubmission } from '../services/assignmentSubmissionService';
import { useNotifications } from '../contexts/NotificationContext';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  assignment_type: 'form' | 'external_form' | 'file_upload';
  external_form_url?: string;
  course_id: string;
  course_name: string;
  teacher_name: string;
  is_completed: boolean;
  is_active: boolean;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  studentId: string;
  onSubmissionComplete?: () => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  assignment,
  studentId,
  onSubmissionComplete
}) => {
  const { showSuccess, showError } = useNotifications();
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);

  // Verificar si ya existe una entrega al abrir el modal
  useEffect(() => {
    if (isOpen && assignment.id && studentId) {
      checkExistingSubmission();
    }
  }, [isOpen, assignment.id, studentId]);

  const checkExistingSubmission = async () => {
    try {
      const submission = await AssignmentSubmissionService.getSubmission(assignment.id, studentId);
      setExistingSubmission(submission);
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };

  const handleUploadSuccess = (result: FileUploadResult) => {
    setUploadedFiles(prev => [...prev, result]);
   
  };

  const handleUploadError = (error: string) => {
    showError(
      'Error al subir archivo',
      error,
      5000
    );
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      showError(
        'Sin archivos',
        'Debes subir al menos un archivo antes de enviar.',
        3000
      );
      return;
    }

    setIsLoading(true);

    try {
      // Preparar datos de la entrega
      const submissionData = {
        assignment_id: assignment.id,
        student_id: studentId,
        submission_type: 'file' as const,
        file_url: uploadedFiles[0].path || '',
        file_name: uploadedFiles[0].originalName || uploadedFiles[0].path?.split('/').pop()?.split('_').slice(1).join('_') || '',
        file_size: uploadedFiles[0].size,
        file_type: uploadedFiles[0].type
      };

      let submission: AssignmentSubmission | null = null;

      if (existingSubmission) {
        // Actualizar entrega existente
        submission = await AssignmentSubmissionService.updateSubmission(
          assignment.id,
          studentId,
          {
            file_url: submissionData.file_url,
            file_name: submissionData.file_name,
            file_size: submissionData.file_size,
            file_type: submissionData.file_type
          }
        );
      } else {
        // Crear nueva entrega
        submission = await AssignmentSubmissionService.createSubmission(submissionData);
      }

      if (submission) {
        showSuccess(
          'Evaluación enviada',
          'Tu evaluación ha sido enviada exitosamente al profesor.',
          5000
        );

        // Notificar al componente padre que se completó la entrega
        if (onSubmissionComplete) {
          onSubmissionComplete();
        }

        // Cerrar modal después de enviar
        setTimeout(() => {
          onClose();
          setUploadedFiles([]);
          setExistingSubmission(null);
        }, 2000);
      } else {
        throw new Error('No se pudo crear la entrega');
      }
      
    } catch (error) {
      console.error('Error submitting assignment:', error);
      showError(
        'Error al enviar evaluación',
        'No se pudo enviar tu evaluación. Intenta nuevamente.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = async (filePath: string, originalName: string) => {
    try {
      const url = await AssignmentFileService.getDownloadUrl(filePath);
      if (url) {
        // Crear un enlace temporal para descargar
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        showError('Error', 'No se pudo generar el enlace de descarga', 3000);
      }
    } catch (error) {
      showError('Error', 'Error al descargar el archivo', 3000);
    }
  };

  const removeUploadedFile = async (filePath: string) => {
    try {
      const success = await AssignmentFileService.deleteFile(filePath);
      if (success) {
        setUploadedFiles(prev => prev.filter(f => f.path !== filePath));
        showSuccess('Archivo eliminado', 'El archivo ha sido eliminado correctamente', 3000);
      } else {
        showError('Error', 'No se pudo eliminar el archivo', 3000);
      }
    } catch (error) {
      showError('Error', 'Error al eliminar el archivo', 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Subir Archivo - {assignment.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {assignment.course_name} • {assignment.teacher_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Cerrar modal"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Assignment Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    Instrucciones
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                    {assignment.description || 'Sube tu archivo de acuerdo a las instrucciones del profesor.'}
                  </p>
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                    <p>• Fecha límite: {new Date(assignment.due_date).toLocaleDateString('es-ES')}</p>
                    <p>• Puntaje máximo: {assignment.max_score} puntos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Component */}
            <FileUploadComponent
              assignmentId={assignment.id}
              studentId={studentId}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              maxFiles={3}
              disabled={isLoading}
            />

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Archivos subidos ({uploadedFiles.length})
                </h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900 dark:text-green-100">
                            Archivo subido exitosamente
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-200">
                            {file.path?.split('/').pop()?.split('_').slice(1).join('_')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => file.path && downloadFile(file.path, file.path.split('/').pop() || 'archivo')}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors"
                          title="Descargar archivo"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => file.path && removeUploadedFile(file.path)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-800 rounded-lg transition-colors"
                          title="Eliminar archivo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle className="w-4 h-4" />
              <span>
                {uploadedFiles.length > 0
                  ? `${uploadedFiles.length} archivo(s) listo(s) para enviar`
                  : 'Sube al menos un archivo para continuar'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploadedFiles.length === 0 || isLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  uploadedFiles.length === 0 || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Enviar Evaluación</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FileUploadModal;
