import { useState, useEffect } from 'react';
import { BookOpen, Users, Award, Search, Filter, Save, X, Edit3, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationSystem from '../../components/NotificationSystem';

interface Course {
  id: string;
  name: string;
  credits: number;
}

interface Assignment {
  id: string;
  title: string;
  max_score: number;
  due_date: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Grade {
  student_id: string;
  assignment_id: string;
  grade: number;
  comment?: string;
}

interface EditingGrade {
  grade: number;
  comment: string;
}

const ManageGrades = () => {
  const { user } = useAuth();
  const { notifications, addNotification, removeNotification } = useNotifications();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [selectedAssignmentData, setSelectedAssignmentData] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGrade, setEditingGrade] = useState<EditingGrade | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const showSuccess = (title: string, message: string, duration: number = 3000) => {
    addNotification(title, 'success');
  };

  const showError = (title: string, message: string, duration: number = 3000) => {
    addNotification(title, 'error');
  };

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      fetchAssignments();
      fetchStudents();
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedAssignment && selectedCourse) {
      fetchGrades();
      const assignment = assignments.find(a => a.id === selectedAssignment);
      setSelectedAssignmentData(assignment || null);
    }
  }, [selectedAssignment, selectedCourse, assignments]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, credits')
        .eq('teacher_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      showError('Error', 'No se pudieron cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, title, max_score, due_date')
        .eq('course_id', selectedCourse)
        .eq('is_active', true)
        .order('due_date');

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError('Error', 'No se pudieron cargar las evaluaciones');
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          users!enrollments_user_id_fkey(
            id,
            name,
            email,
            first_name,
            last_name
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('is_active', true);

      if (error) throw error;

      const studentsData = data?.map(enrollment => ({
        id: enrollment.users.id,
        name: enrollment.users.name || `${enrollment.users.first_name || ''} ${enrollment.users.last_name || ''}`.trim(),
        email: enrollment.users.email,
        first_name: enrollment.users.first_name || '',
        last_name: enrollment.users.last_name || ''
      })) || [];

      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      showError('Error', 'No se pudieron cargar los estudiantes');
    }
  };

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('student_id, assignment_id, grade, comment')
        .eq('course_id', selectedCourse)
        .eq('assignment_id', selectedAssignment);

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
      showError('Error', 'No se pudieron cargar las calificaciones');
    }
  };

  const handleEditGrade = (studentId: string, currentGrade?: Grade) => {
    setEditingStudentId(studentId);
    setEditingGrade({
      grade: currentGrade?.grade || 0,
      comment: currentGrade?.comment || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditingGrade(null);
  };

  const handleSaveGrade = async (studentId: string) => {
    if (!editingGrade || !selectedAssignment) return;

    // Validar que la calificación esté dentro del rango permitido 
    if (editingGrade.grade < 0 || editingGrade.grade > (selectedAssignmentData?.max_score || 100)) {
      showError(
        'Calificación inválida',
        `La calificación debe estar entre 0 y ${selectedAssignmentData?.max_score || 100}`
      );
      return;
    }

    try {
      const gradeData = {
        student_id: studentId,
        assignment_id: selectedAssignment,
        course_id: selectedCourse,
        grade: editingGrade.grade,
        comment: editingGrade.comment
      };

      const { error } = await supabase
        .from('grades')
        .upsert(gradeData, {
          onConflict: 'student_id,assignment_id'
        });

      if (error) throw error;

      // Update local state
      const existingGradeIndex = grades.findIndex( 
        g => g.student_id === studentId && g.assignment_id === selectedAssignment
      );

      if (existingGradeIndex >= 0) {
        const updatedGrades = [...grades];
        updatedGrades[existingGradeIndex] = {
          student_id: studentId,
          assignment_id: selectedAssignment,
          grade: editingGrade.grade,
          comment: editingGrade.comment
        };
        setGrades(updatedGrades);
      } else {
        setGrades([
          ...grades,
          {
            student_id: studentId,
            assignment_id: selectedAssignment,
            grade: editingGrade.grade,
            comment: editingGrade.comment
          }
        ]);
      }

      showSuccess(
        'Calificación guardada',
        'La calificación se ha guardado correctamente.'
      );

      handleCancelEdit();

    } catch (error) {
      console.error('Error saving grade:', error);
      showError(
        'Error al guardar calificación',
        'No se pudo guardar la calificación. Por favor, intente nuevamente.'
      );
    }
  };

  const getStudentGrade = (studentId: string) => {
    return grades.find(g => g.student_id === studentId && g.assignment_id === selectedAssignment);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateStats = () => {
    const currentGrades = grades.filter(g => g.assignment_id === selectedAssignment);
    if (currentGrades.length === 0) return { average: 0, passed: 0, failed: 0 };

    const average = currentGrades.reduce((sum, g) => sum + g.grade, 0) / currentGrades.length;
    const passed = currentGrades.filter(g => g.grade >= 60).length;
    const failed = currentGrades.filter(g => g.grade < 60).length;

    return { average: Math.round(average * 100) / 100, passed, failed };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Gestión de Calificaciones
        </h1>
      </div>

      {/* Course and Assignment Selection */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Seleccionar Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedAssignment('');
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="">Selecciona un curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Seleccionar Evaluación
            </label>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              disabled={!selectedCourse}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Selecciona una evaluación</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title} (Max: {assignment.max_score})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedCourse && selectedAssignment && (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-sky-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Estudiantes
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {students.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Promedio
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {calculateStats().average}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <Check className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Aprobados
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {calculateStats().passed}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <X className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Reprobados
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {calculateStats().failed}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar estudiante por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          {/* Grades Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Calificaciones - {selectedAssignmentData?.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Puntuación máxima: {selectedAssignmentData?.max_score}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estudiante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Calificación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Comentario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredStudents.map((student) => {
                    const studentGrade = getStudentGrade(student.id);
                    const isEditing = editingStudentId === student.id;

                    return (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {student.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {student.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max={selectedAssignmentData?.max_score || 100}
                              value={editingGrade?.grade || 0}
                              onChange={(e) => setEditingGrade(prev => prev ? {
                                ...prev,
                                grade: parseFloat(e.target.value) || 0
                              } : null)}
                              className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                            />
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              studentGrade
                                ? studentGrade.grade >= 60
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {studentGrade ? studentGrade.grade : 'Sin calificar'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <textarea
                              value={editingGrade?.comment || ''}
                              onChange={(e) => setEditingGrade(prev => prev ? {
                                ...prev,
                                comment: e.target.value
                              } : null)}
                              rows={2}
                              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                              placeholder="Comentario opcional..."
                            />
                          ) : (
                            <div className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                              {studentGrade?.comment || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isEditing ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSaveGrade(student.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditGrade(student.id, studentGrade)}
                              className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageGrades;