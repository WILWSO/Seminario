import { useState, useEffect } from 'react';
import { FileText, Clock, AlertCircle, CheckCircle, ExternalLink, Upload, Calendar, BookOpen, RefreshCw, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import FileUploadModal from '../../components/FileUploadModal';
import StudentFormModal from '../../components/StudentFormModal';
import AssignmentFileService from '../../services/assignmentFileService';

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
  course_code: string;
  teacher_name: string;
  is_completed: boolean;
  is_active: boolean; // Estado de actividad de la evaluación
  score?: number;
  percentage?: number;
  feedback?: string;
  submitted_at?: string;
  days_remaining: number;
  is_overdue: boolean;
  has_submission?: boolean; // Si tiene entrega de archivo
  submission_graded?: boolean; // Si la entrega fue calificada
  file_name?: string; // Nombre del archivo enviado
  file_url?: string; // URL del archivo enviado
}

const StudentAssignments = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotifications();
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue' | 'active' | 'inactive'>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
      
      // Auto-refresh cada 5 minutos para detectar cambios
      const intervalId = setInterval(() => {
        console.log('Auto-refreshing assignments...');
        fetchAssignments();
      }, 5 * 60 * 1000); // 5 minutos

      return () => clearInterval(intervalId);
    }
  }, [user?.id]);

  const fetchAssignments = async (showNotification = false) => {
    try {
      // Si ya hay assignments cargados, usar isRefreshing en lugar de isLoading
      if (assignments.length > 0) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // Buscar cursos en los que el estudiante está matriculado
      // Consultar todos los enrollments primero y luego filtrar por estado activo
      const { data: allEnrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id, status, is_active')
        .eq('user_id', user?.id);

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        throw enrollmentsError;
      }

      console.log('Total enrollments found:', allEnrollments?.length || 0);
      console.log('Enrollments data:', allEnrollments);

      // Filtrar enrollments activos basándose en el esquema disponible
      const activeEnrollments = (allEnrollments || []).filter(enrollment => {
        // Si tiene is_active, usarlo
        if (enrollment.is_active !== undefined) {
          return enrollment.is_active === true;
        }
        // Si no tiene is_active, usar status
        return enrollment.status === 'En Progreso' || enrollment.status === 'active';
      });

      console.log('Active enrollments:', activeEnrollments.length);

      const enrolledCourseIds = activeEnrollments.map(e => e.course_id);

      if (enrolledCourseIds.length === 0) {
        console.log('No active enrollments found for user');
        console.log('Available enrollment data:', allEnrollments);
        
        // Mostrar información adicional para debugging
        if (allEnrollments && allEnrollments.length > 0) {
          console.log('User has enrollments but none are active:');
          allEnrollments.forEach((enrollment, index) => {
            console.log(`Enrollment ${index + 1}:`, {
              course_id: enrollment.course_id,
              status: enrollment.status,
              is_active: enrollment.is_active
            });
          });
          
          // Mostrar notificación informativa al usuario
          showError(
            'Matriculaciones encontradas pero inactivas',
            `Se encontraron ${allEnrollments.length} matriculaciones, pero ninguna está activa. Revisa el estado de tus matriculaciones.`,
            8000
          );
        } else {
          // Mostrar notificación cuando no hay matriculaciones
          showError(
            'No hay matriculaciones',
            'No se encontraron matriculaciones para este usuario. Contacta al administrador para matricularte en cursos.',
            8000
          );
        }
        
        setAssignments([]);
        return;
      }

      // Buscar evaluaciones de los cursos matriculados (incluyendo activas e inactivas)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses(
            name,
            course_code,
            teacher:users!courses_teacher_id_fkey(first_name, last_name)
          )
        `)
        .in('course_id', enrolledCourseIds)
        .order('due_date', { ascending: true });

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Assignments found:', assignmentsData?.length || 0);
      console.log('Active assignments:', assignmentsData?.filter(a => a.is_active).length || 0);
      console.log('Inactive assignments:', assignmentsData?.filter(a => !a.is_active).length || 0);

      // Buscar entregas del estudiante (que pueden incluir calificaciones)
      const assignmentIds = (assignmentsData || []).map(a => a.id);
      let submissionsData = [];
      
      if (assignmentIds.length > 0) {
        // Buscar entregas del estudiante
        const { data: submissions, error: submissionsError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .in('assignment_id', assignmentIds)
          .eq('student_id', user?.id);

        if (submissionsError) {
          console.error('Error fetching submissions:', submissionsError);
          throw submissionsError;
        }

        submissionsData = submissions || [];
      }

      console.log('Submissions found:', submissionsData.length);

      // Crear mapa de entregas (que incluye calificaciones)
      const submissionsMap = submissionsData.reduce((acc, submission) => {
        acc[submission.assignment_id] = submission;
        return acc;
      }, {} as Record<string, any>);

      // Procesar evaluaciones
      const processedAssignments = (assignmentsData || []).map(assignment => {
        const submission = submissionsMap[assignment.id];
        const dueDate = new Date(assignment.due_date);
        const today = new Date();
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const isOverdue = daysRemaining < 0;

        // Determinar si está completado basándose en el tipo de evaluación
        let isCompleted = false;
        if (assignment.assignment_type === 'file_upload') {
          isCompleted = !!submission; // Para file_upload, completado si tiene entrega
        } else {
          isCompleted = !!submission?.grade; // Para otros tipos, completado si tiene calificación
        }

        // Log para debugging
        console.log(`Assignment ${assignment.id} (${assignment.title}):`, {
          type: assignment.assignment_type,
          hasSubmission: !!submission,
          hasGrade: !!submission?.grade,
          isCompleted: isCompleted,
          submissionId: submission?.id,
          grade: submission?.grade
        });

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description || '',
          due_date: assignment.due_date,
          max_score: assignment.max_score,
          assignment_type: assignment.assignment_type,
          external_form_url: assignment.external_form_url,
          course_id: assignment.course_id,
          course_name: assignment.course?.name || 'Curso sin nombre',
          course_code: assignment.course?.course_code || '',
          teacher_name: assignment.course?.teacher ? 
            `${assignment.course.teacher.first_name} ${assignment.course.teacher.last_name}` : 
            'Profesor',
          is_completed: isCompleted,
          is_active: assignment.is_active, // Incluir el estado de actividad
          score: submission?.grade,
          percentage: submission?.grade ? (submission.grade / assignment.max_score) * 100 : 0,
          feedback: submission?.feedback,
          submitted_at: submission?.submitted_at,
          days_remaining: daysRemaining,
          is_overdue: isOverdue,
          has_submission: !!submission, // Información adicional sobre entrega
          submission_graded: !!(submission && submission.grade !== null), // Si la entrega fue calificada
          file_name: submission?.file_name, // Nombre del archivo enviado
          file_url: submission?.file_url // URL del archivo enviado
        };
      });

      console.log('Processed assignments:', processedAssignments.length);
      setAssignments(processedAssignments);

      // Show success message only if this is a manual refresh
      if (showNotification && processedAssignments.length > 0) {
       // showSuccess(
       //   'Evaluaciones actualizadas',
       //   `Se encontraron ${processedAssignments.length} evaluaciones.`,
       //   3000
      //  );
      }

    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError(
        'Error al cargar evaluaciones',
        'No fue posible cargar las evaluaciones. Intente nuevamente.',
        5000
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSubmissionComplete = async () => {
    // Refrescar la lista de assignments para mostrar el estado actualizado
    console.log('Refreshing assignments after submission complete...');
    
    // Forzar una actualización completa
    setIsRefreshing(true);
    await fetchAssignments(true); // Pasar true para mostrar notificación
    
    showSuccess(
      'Estado actualizado',
      'La lista de evaluaciones ha sido actualizada.',
      3000
    );
  };

  const forceRefresh = async () => {
    console.log('Force refreshing assignments...');
    setIsRefreshing(true);
    await fetchAssignments(true);
  };

  const handleAssignmentClick = (assignment: Assignment) => {
    // Verificar si la evaluación está activa antes de permitir acceso
    if (!assignment.is_active) {
      showError(
        'Evaluación inactiva',
        'Esta evaluación no está activa actualmente. No puedes acceder a ella en este momento.',
        5000
      );
      return;
    }

    // Para evaluaciones de tipo file_upload, no permitir acceso si ya hay una submission
    if (assignment.assignment_type === 'file_upload') {
      if (assignment.has_submission) {
        showError(
          'Archivo ya enviado',
          'Ya has enviado un archivo para esta evaluación. Usa el botón "Reemplazar" si necesitas cambiar el archivo.',
          5000
        );
        return;
      }
      
      // Solo abrir modal si no hay submission
      setSelectedAssignment(assignment);
      setUploadModalOpen(true);
      return;
    }

    // Para otros tipos de evaluaciones, verificar si ya está completada
    if (assignment.is_completed) {
      showError(
        'Evaluación completada',
        'Ya has completado esta evaluación. No puedes volver a enviarla.',
        5000
      );
      return;
    }

    if (assignment.assignment_type === 'external_form' && assignment.external_form_url) {
      // Abrir formulario externo en nueva ventana
      window.open(assignment.external_form_url, '_blank');
    } else if (assignment.assignment_type === 'form') {
      // Abrir modal para formulario interno
      setSelectedAssignment(assignment);
      setFormModalOpen(true);
    } else {
      // Evaluación tipo form sin preguntas - marcar como completada
      showError(
        'Evaluación interna',
        'Esta evaluación será completada directamente por el profesor. No requiere acción del estudiante.',
        5000
      );
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const url = await AssignmentFileService.getDownloadUrl(fileUrl);
      if (url) {
        // Crear un enlace temporal para descargar
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

  const getStatusBadge = (assignment: Assignment) => {
    // Primero verificar si está activa
    if (!assignment.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Inactiva
        </span>
      );
    }

    if (assignment.is_completed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completada
        </span>
      );
    } else if (assignment.is_overdue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Vencida
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </span>
      );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'form':
        return <FileText className="w-5 h-5" />;
      case 'external_form':
        return <ExternalLink className="w-5 h-5" />;
      case 'file_upload':
        return <Upload className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'form':
        return 'Formulario Interno';
      case 'external_form':
        return 'Formulario Externo';
      case 'file_upload':
        return 'Subida de Archivo';
      default:
        return 'Evaluación';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    switch (filter) {
      case 'pending':
        return !assignment.is_completed && !assignment.is_overdue && assignment.is_active;
      case 'completed':
        return assignment.is_completed;
      case 'overdue':
        return assignment.is_overdue && !assignment.is_completed && assignment.is_active;
      case 'active':
        return assignment.is_active;
      case 'inactive':
        return !assignment.is_active;
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de actualización */}
      {isRefreshing && (
        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-3">
          <div className="flex items-center">
            <RefreshCw className="w-4 h-4 text-sky-500 animate-spin mr-2" />
            <span className="text-sm text-sky-700 dark:text-sky-300">
              Actualizando evaluaciones...
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Mis Evaluaciones
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestiona y responde tus evaluaciones asignadas           
          </p>
        </div>
        <button
          onClick={forceRefresh}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Resumen de estadísticas */}
      {assignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-sky-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">{assignments.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Activas</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {assignments.filter(a => a.is_active).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pendientes</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {assignments.filter(a => !a.is_completed && !a.is_overdue && a.is_active).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completadas</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {assignments.filter(a => a.is_completed).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Vencidas</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {assignments.filter(a => a.is_overdue && !a.is_completed && a.is_active).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mr-4">
          <span>Filtrar por:</span>
        </div>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-sky-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Todas ({assignments.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Pendientes ({assignments.filter(a => !a.is_completed && !a.is_overdue && a.is_active).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-green-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Completadas ({assignments.filter(a => a.is_completed).length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'overdue'
              ? 'bg-red-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Vencidas ({assignments.filter(a => a.is_overdue && !a.is_completed && a.is_active).length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Activas ({assignments.filter(a => a.is_active).length})
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'inactive'
              ? 'bg-gray-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          Inactivas ({assignments.filter(a => !a.is_active).length})
        </button>
      </div>

      {/* Lista de evaluaciones */}
      <div className="grid gap-4">
        {filteredAssignments.map((assignment) => (
          <motion.div
            key={assignment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    !assignment.is_active 
                      ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      : assignment.assignment_type === 'form' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                      : assignment.assignment_type === 'external_form'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {getTypeIcon(assignment.assignment_type)}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold mb-1 ${
                      !assignment.is_active 
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-800 dark:text-white'
                    }`}>
                      {assignment.title}
                      {!assignment.is_active && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (Inactiva)
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{assignment.course_code ? `${assignment.course_code} - ${assignment.course_name}` : assignment.course_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>Por: {assignment.teacher_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(assignment)}
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded">
                    {getTypeLabel(assignment.assignment_type)}
                  </span>
                </div>
              </div>

              {/* Advertencia para evaluaciones inactivas */}
              {!assignment.is_active && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Evaluación inactiva
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Esta evaluación ha sido desactivada por el profesor y no está disponible para realizar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {assignment.description && (
                <p className={`mb-4 ${
                  !assignment.is_active 
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {assignment.description}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Fecha límite: {new Date(assignment.due_date).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Puntaje máximo: {assignment.max_score}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className={`text-sm ${
                    assignment.is_overdue 
                      ? 'text-red-600 dark:text-red-400' 
                      : assignment.days_remaining <= 3 
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {assignment.is_overdue 
                      ? `Vencida hace ${Math.abs(assignment.days_remaining)} días`
                      : assignment.days_remaining === 0 
                      ? 'Vence hoy'
                      : `${assignment.days_remaining} días restantes`
                    }
                  </span>
                </div>
              </div>

              {assignment.is_completed && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                        Evaluación completada
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Enviada el {new Date(assignment.submitted_at!).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-800 dark:text-green-300">
                        {assignment.score}/{assignment.max_score}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {assignment.percentage?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {assignment.feedback && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 rounded">
                      <p className="text-sm text-green-800 dark:text-green-300">
                        <strong>Comentario:</strong> {assignment.feedback}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mostrar información del archivo enviado para evaluaciones de tipo file_upload */}
              {assignment.assignment_type === 'file_upload' && assignment.has_submission && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Upload className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                      <div>
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                          Archivo enviado
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {assignment.file_name || 'Archivo sin nombre'}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Enviado el {new Date(assignment.submitted_at!).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => assignment.file_url && assignment.file_name && handleDownloadFile(assignment.file_url, assignment.file_name)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1"
                        title="Descargar archivo"
                      >
                        <Download className="w-3 h-3" />
                        <span>Descargar</span>
                      </button>
                      {!assignment.submission_graded && (
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setUploadModalOpen(true);
                          }}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Reemplazar archivo"
                        >
                          Reemplazar
                        </button>
                      )}
                      {assignment.submission_graded && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          ✓ Calificado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mostrar información del formulario completado para evaluaciones de tipo form */}
              {assignment.assignment_type === 'form' && assignment.is_completed && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-300" />
                      <div>
                        <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                          Formulario completado
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Calificado automáticamente
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Completado el {new Date(assignment.submitted_at!).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-800 dark:text-green-300">
                          {assignment.score}/{assignment.max_score}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {assignment.percentage?.toFixed(1)}%
                        </p>
                      </div>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ✓ Calificado Automáticamente
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <span>Tipo: {getTypeLabel(assignment.assignment_type)}</span>
                  {!assignment.is_active && (
                    <span className="ml-2 text-red-500 dark:text-red-400">• Inactiva</span>
                  )}
                </div>
                <button
                  onClick={() => handleAssignmentClick(assignment)}
                  disabled={
                    (assignment.is_completed && assignment.assignment_type !== 'file_upload') || 
                    !assignment.is_active ||
                    (assignment.assignment_type === 'file_upload' && assignment.has_submission)
                  }
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (assignment.is_completed && assignment.assignment_type !== 'file_upload') || 
                    !assignment.is_active ||
                    (assignment.assignment_type === 'file_upload' && assignment.has_submission)
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
                      : 'bg-sky-500 text-white hover:bg-sky-600'
                  }`}
                >
                  {(assignment.is_completed && assignment.assignment_type !== 'file_upload') ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completada
                    </>
                  ) : !assignment.is_active ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Inactiva
                    </>
                  ) : assignment.assignment_type === 'external_form' ? (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" /> 
                      Abrir Formulario 
                    </>
                  ) : assignment.assignment_type === 'form' ? (
                    <>
                      {assignment.is_completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Calificado Automáticamente
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Responder Formulario
                        </>
                      )}
                    </>
                  ) : assignment.assignment_type === 'file_upload' ? (
                    <>
                      {assignment.has_submission && assignment.submission_graded ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Calificado
                        </>
                      ) : assignment.has_submission ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Esperando Calificación
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Subir Archivo
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Evaluación
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            {assignments.length === 0 ? 'No hay evaluaciones disponibles' : 'No hay evaluaciones'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {assignments.length === 0 
              ? 'No tienes evaluaciones asignadas en este momento. Esto puede deberse a que no estás matriculado en ningún curso activo o los cursos no tienen evaluaciones creadas.'
              : filter === 'all' 
              ? 'No tienes evaluaciones asignadas en este momento.'
              : filter === 'active'
              ? 'No tienes evaluaciones activas en este momento.'
              : filter === 'inactive'
              ? 'No tienes evaluaciones inactivas en este momento.'
              : `No tienes evaluaciones ${filter === 'pending' ? 'pendientes' : filter === 'completed' ? 'completadas' : 'vencidas'} en este momento.`
            }
          </p>
          {assignments.length === 0 && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <p>Verifica que:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Estés matriculado en cursos activos</li>
                <li>Los profesores hayan creado evaluaciones</li>
                <li>Las evaluaciones estén marcadas como activas</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Modal para subir archivos */}
      {uploadModalOpen && selectedAssignment && (
        <FileUploadModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          studentId={user?.id || ''}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}

      {/* Modal para formulario interno */}
      {formModalOpen && selectedAssignment && (
        <StudentFormModal
          isOpen={formModalOpen}
          onClose={() => {
            setFormModalOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={{
            id: selectedAssignment.id,
            title: selectedAssignment.title,
            description: selectedAssignment.description,
            course_name: selectedAssignment.course_name,
            max_score: selectedAssignment.max_score,
            due_date: selectedAssignment.due_date
          }}
          studentId={user?.id || ''}
          onSubmissionComplete={handleSubmissionComplete}
        />
      )}
    </div>
  );
};

export default StudentAssignments;
