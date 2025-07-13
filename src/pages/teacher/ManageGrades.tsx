import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, FileText, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';

interface Assignment {
  id: string;
  title: string;
  description: string;
  max_score: number;
  assignment_type: 'form' | 'external_form' | 'file_upload';
  external_form_url?: string;
  course_name: string;
  course_code: string;
  due_date: string;
}

interface StudentGrade {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  assignment_id: string;
  assignment_title: string;
  course_name: string;
  course_code: string;
  grade: number;
  max_score: number;
  percentage: number;
  feedback?: string;
  graded_at: string;
  assignment_type: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_score?: number;
  current_percentage?: number;
  feedback?: string;
  graded_at?: string;
}

interface ScoreForm {
  student_id: string;
  score: number;
  feedback: string;
}

const ManageGrades = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  
  // Función para generar colores consistentes basados en el código del curso
  const getCourseCodeColor = (courseCode: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200'
    ];
    
    // Generar un hash simple del código del curso
    let hash = 0;
    for (let i = 0; i < courseCode.length; i++) {
      hash = ((hash << 5) - hash) + courseCode.charCodeAt(i);
      hash = hash & hash; // Convertir a 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [allGrades, setAllGrades] = useState<StudentGrade[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<StudentGrade[]>([]);
  const [courses, setCourses] = useState<{id: string, name: string, course_code: string}[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scores, setScores] = useState<Record<string, ScoreForm>>({});
  const [viewMode, setViewMode] = useState<'assignment' | 'all'>('all');

  useEffect(() => {
    if (user?.id) {
      // Si hay assignmentId, cargar datos específicos de la evaluación
      // Si no hay assignmentId, cargar todas las notas del profesor
      if (assignmentId) {
        setViewMode('assignment');
        fetchAssignmentData();
      } else {
        setViewMode('all');
        fetchAllGrades();
      }
    }
  }, [assignmentId, user?.id]);

  const fetchAllGrades = async () => {
    try {
      setIsLoading(true);

      // Obtener todos los cursos del profesor
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, name, course_code')
        .eq('teacher_id', user?.id);

      if (coursesError) throw coursesError;

      if (!coursesData || coursesData.length === 0) {
        setAllGrades([]);
        setIsLoading(false);
        return;
      }

      const courseIds = coursesData.map(course => course.id);
      setCourses(coursesData.map(course => ({ 
        id: course.id, 
        name: course.name,
        course_code: course.course_code || ''
      })));

      // Obtener todas las evaluaciones de estos cursos
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, title, max_score, assignment_type, course_id')
        .in('course_id', courseIds);

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setAllGrades([]);
        setIsLoading(false);
        return;
      }

      const assignmentIds = assignmentsData.map(assignment => assignment.id);

      // Obtener todas las calificaciones
      const { data: gradesData, error: gradesError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .in('assignment_id', assignmentIds)
        .not('grade', 'is', null);

      if (gradesError) throw gradesError;

      // Obtener información de los estudiantes
      const studentIds = [...new Set(gradesData?.map(grade => grade.student_id) || [])];
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      // Crear mapas para facilitar el acceso a los datos
      const coursesMap = coursesData.reduce((acc, course) => {
        acc[course.id] = course;
        return acc;
      }, {} as Record<string, any>);

      const assignmentsMap = assignmentsData.reduce((acc, assignment) => {
        acc[assignment.id] = assignment;
        return acc;
      }, {} as Record<string, any>);

      const studentsMap = studentsData?.reduce((acc, student) => {
        acc[student.id] = student;
        return acc;
      }, {} as Record<string, any>) || {};

      // Procesar todas las calificaciones
      const processedGrades: StudentGrade[] = (gradesData || []).map(grade => {
        const assignment = assignmentsMap[grade.assignment_id];
        const student = studentsMap[grade.student_id];
        const course = coursesMap[assignment?.course_id];

        return {
          id: grade.id,
          student_id: grade.student_id,
          student_name: student ? `${student.first_name} ${student.last_name}` : 'Estudiante desconocido',
          student_email: student?.email || '',
          assignment_id: grade.assignment_id,
          assignment_title: assignment?.title || 'Evaluación desconocida',
          course_name: course?.name || 'Curso desconocido',
          course_code: course?.course_code || '',
          grade: grade.grade,
          max_score: assignment?.max_score || 0,
          percentage: assignment?.max_score ? (grade.grade / assignment.max_score) * 100 : 0,
          feedback: grade.feedback || '',
          graded_at: grade.graded_at,
          assignment_type: assignment?.assignment_type || 'form'
        };
      });

      // Ordenar por fecha de calificación (más reciente primero)
      processedGrades.sort((a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime());

      setAllGrades(processedGrades);
      setFilteredGrades(processedGrades);
      setCourses(coursesData);

    } catch (error) {
      console.error('Error fetching all grades:', error);
      showError(
        'Error al cargar datos',
        'No fue posible cargar el historial de calificaciones.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignmentData = async () => {
    try {
      setIsLoading(true);

      // Buscar datos de la evaluación
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Buscar datos del curso separadamente
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, name, course_code')
        .eq('id', assignmentData.course_id)
        .single();

      if (courseError) throw courseError;

      const assignmentInfo = {
        id: assignmentData.id,
        title: assignmentData.title,
        description: assignmentData.description || '',
        max_score: assignmentData.max_score,
        assignment_type: assignmentData.assignment_type,
        external_form_url: assignmentData.external_form_url,
        course_name: courseData?.name || 'Curso sin nombre',
        course_code: courseData?.course_code || '',
        due_date: assignmentData.due_date
      };

      setAssignment(assignmentInfo);

      // Buscar estudiantes inscritos en el curso
      const { data: studentsData, error: studentsError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', assignmentData.course_id)
        .eq('status', 'active');

      if (studentsError) throw studentsError;

      // Buscar información de los estudiantes
      const studentIds = (studentsData || []).map((e: any) => e.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (usersError) throw usersError;

      // Buscar entregas existentes con calificaciones
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .in('student_id', studentIds);

      if (submissionsError) throw submissionsError;

      // Crear mapa de entregas
      const submissionsMap = (submissionsData || []).reduce((acc: any, submission: any) => {
        acc[submission.student_id] = submission;
        return acc;
      }, {} as Record<string, any>);

      // Procesar datos de los estudiantes
      const processedStudents = (usersData || []).map((user: any) => {
        const existingSubmission = submissionsMap[user.id];
        
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          current_score: existingSubmission?.grade || 0,
          current_percentage: existingSubmission?.grade ? (existingSubmission.grade / assignmentInfo.max_score) * 100 : 0,
          feedback: existingSubmission?.feedback || '',
          graded_at: existingSubmission?.graded_at
        };
      });

      setStudents(processedStudents);

      // Inicializar formulario de notas
      const initialScores = processedStudents.reduce((acc: any, student: any) => {
        acc[student.id] = {
          student_id: student.id,
          score: student.current_score || 0,
          feedback: student.feedback || ''
        };
        return acc;
      }, {} as Record<string, ScoreForm>);

      setScores(initialScores);

    } catch (error) {
      console.error('Error fetching assignment data:', error);
      showError(
        'Error al cargar datos',
        'No fue posible cargar los datos de la evaluación.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseFilter = (courseId: string) => {
    setSelectedCourse(courseId);
    
    if (courseId === 'all') {
      setFilteredGrades(allGrades);
    } else {
      const filtered = allGrades.filter(grade => {
        const course = courses.find(c => c.id === courseId);
        return grade.course_name === course?.name;
      });
      setFilteredGrades(filtered);
    }
  };

  const handleScoreChange = (studentId: string, field: keyof ScoreForm, value: string | number) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSaveScore = async (studentId: string) => {
    if (!assignment) return;

    const scoreData = scores[studentId];
    if (!scoreData) return;

    // Validar puntaje
    if (scoreData.score < 0 || scoreData.score > assignment.max_score) {
      showError(
        'Puntaje inválido',
        `El puntaje debe estar entre 0 y ${assignment.max_score}`,
        3000
      );
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('assignment_submissions')
        .upsert({
          assignment_id: assignmentId,
          student_id: studentId,
          grade: scoreData.score,
          feedback: scoreData.feedback,
          graded_at: new Date().toISOString(),
          submitted_at: new Date().toISOString() // En caso de que no exista aún
        }, {
          onConflict: 'assignment_id,student_id'
        });

      if (error) throw error;

      showSuccess(
        'Nota guardada',
        'La nota fue guardada con éxito.',
        3000
      );

      // Actualizar datos
      if (viewMode === 'assignment') {
        await fetchAssignmentData();
      } else {
        await fetchAllGrades();
      }

    } catch (error) {
      console.error('Error saving score:', error);
      showError(
        'Error al guardar nota',
        'No fue posible guardar la nota. Intente nuevamente.',
        5000
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllScores = async () => {
    if (!assignment) return;

    try {
      setIsSaving(true);

      const scoresArray = Object.values(scores).map(scoreData => ({
        assignment_id: assignmentId,
        student_id: scoreData.student_id,
        grade: scoreData.score,
        feedback: scoreData.feedback,
        graded_at: new Date().toISOString(),
        submitted_at: new Date().toISOString() // En caso de que no exista aún
      }));

      // Validar todos los puntajes
      const invalidScores = scoresArray.filter(s => s.grade < 0 || s.grade > assignment.max_score);
      if (invalidScores.length > 0) {
        showError(
          'Puntajes inválidos',
          `Todos los puntajes deben estar entre 0 y ${assignment.max_score}`,
          4000
        );
        return;
      }

      const { error } = await supabase
        .from('assignment_submissions')
        .upsert(scoresArray, {
          onConflict: 'assignment_id,student_id'
        });

      if (error) throw error;

      showSuccess(
        'Notas guardadas',
        'Todas las notas fueron guardadas con éxito.',
        3000
      );

      // Actualizar datos
      if (viewMode === 'assignment') {
        await fetchAssignmentData();
      } else {
        await fetchAllGrades();
      }

    } catch (error) {
      console.error('Error saving all scores:', error);
      showError(
        'Error al guardar notas',
        'No fue posible guardar todas las notas. Intente nuevamente.',
        5000
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  // Vista para mostrar todas las notas (sin assignmentId específico)
  if (viewMode === 'all') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Historial de Calificaciones
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Todas las notas y comentarios de tus estudiantes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {filteredGrades.length} calificaciones registradas
            </span>
          </div>
        </div>

        {/* Filtro por curso */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                filtrar curso:
              </label>
            </div>
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseFilter(e.target.value)}
              title="Seleccionar curso para filtrar"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="all">Todos los cursos</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.course_code ? `${course.course_code} - ${course.name}` : course.name}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <span>•</span>
              <span>{courses.length} cursos</span>
              <span>•</span>
              <span>Mostrando {filteredGrades.length} de {allGrades.length} calificaciones</span>
            </div>
          </div>
        </div>

        {/* Tabla de todas las notas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Calificaciones por Estudiante
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Estudiante
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Evaluación
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Código
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nota
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Comentarios
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredGrades.map((grade) => (
                  <motion.tr
                    key={grade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {grade.student_name}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {grade.student_email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {grade.assignment_title}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {grade.assignment_type === 'form' ? 'Formulario Interno' :
                           grade.assignment_type === 'external_form' ? 'Formulario Externo' :
                           'Subida de Archivo'}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {grade.course_code ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCourseCodeColor(grade.course_code)}`}>
                          {grade.course_code}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          Sin código
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {grade.grade} / {grade.max_score}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          grade.percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          grade.percentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {Math.round(grade.percentage)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs truncate text-slate-900 dark:text-white">
                        {grade.feedback || 'Sin comentarios'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(grade.graded_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredGrades.length === 0 && allGrades.length > 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No hay calificaciones para este curso
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                El curso seleccionado no tiene calificaciones registradas.
              </p>
            </div>
          )}

          {allGrades.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No hay calificaciones registradas
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Aún no has calificado ninguna evaluación de tus estudiantes.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista para evaluación específica (con assignmentId)
  if (!assignment) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            Evaluación no encontrada
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            La evaluación solicitada no fue encontrada o no tienes permiso para acceder a ella.
          </p>
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
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Gestionar Notas
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {assignment.title} • {assignment.course_code ? `${assignment.course_code} - ${assignment.course_name}` : assignment.course_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Puntaje máximo: {assignment.max_score}
          </span>
          <button
            onClick={handleSaveAllScores}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-sky-300 transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Todas'}
          </button>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Información de la Evaluación
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            assignment.assignment_type === 'form' 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
              : assignment.assignment_type === 'external_form'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
          }`}>
            {assignment.assignment_type === 'form' ? 'Formulario Interno' :
             assignment.assignment_type === 'external_form' ? 'Formulario Externo' :
             'Subida de Archivo'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Descripción</p>
            <p className="text-slate-800 dark:text-white">{assignment.description || 'Sin descripción'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Fecha de Entrega</p>
            <p className="text-slate-800 dark:text-white">
              {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('es-ES') : 'Sin plazo'}
            </p>
          </div>
        </div>

        {assignment.external_form_url && (
          <div className="mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">URL del Formulario</p>
            <a
              href={assignment.external_form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline"
            >
              {assignment.external_form_url}
            </a>
          </div>
        )}
      </div>

      {/* Students List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Estudiantes ({students.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Estudiante
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Puntaje
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Porcentaje
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Comentarios
                </th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {students.map((student) => (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {student.email}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={assignment.max_score}
                        value={scores[student.id]?.score || 0}
                        onChange={(e) => handleScoreChange(student.id, 'score', Number(e.target.value))}
                        className="w-20 px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                        title="Puntaje del estudiante"
                        placeholder="0"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        / {assignment.max_score}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2 relative overflow-hidden">
                        <div
                          className="bg-sky-500 h-full rounded-full transition-all duration-300 absolute top-0 left-0"
                          style={{
                            width: `${Math.min((scores[student.id]?.score || 0) / assignment.max_score * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {Math.round((scores[student.id]?.score || 0) / assignment.max_score * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <textarea
                      value={scores[student.id]?.feedback || ''}
                      onChange={(e) => handleScoreChange(student.id, 'feedback', e.target.value)}
                      placeholder="Comentario opcional..."
                      className="w-full px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white text-sm"
                      rows={2}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleSaveScore(student.id)}
                      disabled={isSaving}
                      className="inline-flex items-center px-3 py-1 bg-sky-500 text-white rounded-md hover:bg-sky-600 disabled:bg-sky-300 transition-colors text-sm"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Guardar
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Ningún estudiante encontrado
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              No hay estudiantes inscritos en este curso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageGrades;