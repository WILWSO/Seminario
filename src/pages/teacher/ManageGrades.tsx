import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Search, Filter, Save, X, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface Student {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  max_score: number;
  course_id: string;
}

interface Course {
  id: string;
  name: string;
}

interface Grade {
  student_id: string;
  assignment_id: string;
  grade: number;
  comment: string;
}

const ManageGrades = () => {
  const { user } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const courseId = params.get('course');
  const assignmentId = params.get('assignment');

  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(courseId || '');
  const [selectedAssignment, setSelectedAssignment] = useState<string>(assignmentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<{
    studentId: string;
    grade: number;
    comment: string;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseData();
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedAssignment) {
      fetchGrades();
    }
  }, [selectedAssignment]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .eq('teacher_id', user?.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCourses(data || []);
      
      // If courseId was provided in URL, set it as selected
      if (courseId && data?.some(course => course.id === courseId)) {
        setSelectedCourse(courseId);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);

      // Fetch students enrolled in the course
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          user:users(id, name, first_name, last_name, email)
        `)
        .eq('course_id', selectedCourse)
        .eq('is_active', true);

      if (enrollmentsError) throw enrollmentsError;

      const studentsData = (enrollmentsData || []).map(enrollment => enrollment.user).filter(Boolean);
      setStudents(studentsData);

      // Fetch assignments for the course
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', selectedCourse)
        .order('due_date', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // If assignmentId was provided in URL, set it as selected
      if (assignmentId && assignmentsData?.some(assignment => assignment.id === assignmentId)) {
        setSelectedAssignment(assignmentId);
      }

    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('assignment_id', selectedAssignment);

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handleSaveGrade = async (studentId: string) => {
    if (!editingGrade || !selectedAssignment) return;

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

      setEditingGrade(null);
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Error al guardar la calificación: ' + (error as Error).message);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || 
           student.email.toLowerCase().includes(searchLower) ||
           (student.name && student.name.toLowerCase().includes(searchLower));
  });

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);

  if (isLoading && courses.length === 0) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Administrar calificaciones
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gestione las calificaciones de sus estudiantes
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedAssignment('');
                setStudents([]);
                setAssignments([]);
                setGrades([]);
              }}
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

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Evaluación
            </label>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              disabled={!selectedCourse}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Seleccionar evaluación</option>
              {assignments.map(assignment => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Buscar estudiante
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar estudiantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedCourse}
                className="w-full px-3 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white disabled:opacity-50"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            </div>
          </div>
        </div>

        {selectedAssignmentData && (
          <div className="mt-4 p-3 bg-sky-50 dark:bg-sky-900/20 rounded-md">
            <h3 className="font-medium text-slate-800 dark:text-white">
              {selectedAssignmentData.title}
            </h3>
            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Puntuación máxima: {selectedAssignmentData.max_score} puntos
              {selectedAssignmentData.due_date && (
                <span className="ml-4">
                  Fecha límite: {new Date(selectedAssignmentData.due_date).toLocaleDateString('es-AR')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Students List */}
      {selectedCourse && selectedAssignment ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Estudiante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Calificación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Comentario
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {filteredStudents.map((student) => {
                  const currentGrade = grades.find(g => g.student_id === student.id);
                  const isEditing = editingGrade?.studentId === student.id;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-white">
                            {student.name || `${student.first_name} ${student.last_name}`}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {student.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max={selectedAssignmentData?.max_score || 100}
                            value={editingGrade.grade}
                            onChange={(e) => setEditingGrade({
                              ...editingGrade,
                              grade: parseFloat(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm text-slate-800 dark:text-white">
                            {currentGrade?.grade ?? '-'} / {selectedAssignmentData?.max_score || 100}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingGrade.comment}
                            onChange={(e) => setEditingGrade({
                              ...editingGrade,
                              comment: e.target.value
                            })}
                            placeholder="Comentario opcional"
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {currentGrade?.comment || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isEditing ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleSaveGrade(student.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Guardar"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={() => setEditingGrade(null)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Cancelar"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingGrade({
                              studentId: student.id,
                              grade: currentGrade?.grade || 0,
                              comment: currentGrade?.comment || ''
                            })}
                            className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                            title="Editar calificación"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredStudents.length === 0 && selectedCourse && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
                  <Search size={24} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                  No se encontraron estudiantes
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {searchTerm 
                    ? 'No hay estudiantes que coincidan con su búsqueda'
                    : 'No hay estudiantes inscritos en este curso'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
            <BookOpen size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
            Seleccione un curso y evaluación
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Elija un curso y una evaluación para comenzar a calificar
          </p>
        </div>
      )}
    </div>
  );
};

export default ManageGrades;