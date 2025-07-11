import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, BookOpen, Calendar, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface Course {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  credits: number;
  image_url: string | null;
  syllabus_url: string | null;
  is_active: boolean;
  enrollment_open: boolean;
  period: string | null;
  created_at: string;
  updated_at: string;
  teacher?: {
    name: string;
    email: string;
  };
  _count?: {
    enrollments: number;
    modules: number;
  };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

const ManageCourses: React.FC = () => {
  const { user } = useAuth();
  const { showInfo, showWarning, showSuccess, showError } = useNotifications();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, courseId?: string }>({ open: false });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacher_id: '',
    credits: 0,
    period: '',
    enrollment_open: false,
    is_active: true
  });

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:users!courses_teacher_id_fkey(name, email),
          enrollments(count),
          modules(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .contains('role', ['teacher']);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(formData)
          .eq('id', editingCourse.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchCourses();
      resetForm();
      showSuccess('Éxito!', `Curso ${editingCourse ? 'actualizado' : 'creado'} exitosamente`, 5000);
    } catch (error) {
      console.error('Error saving course:', error);
      showError('Falla!', `Error al ${editingCourse ? 'actualizar' : 'crear'} el curso. Por favor, inténtalo de nuevo.`, 5000);
    }
  };

  const handleDelete = async (courseId: string) => {
    try {
      const { error } = await supabase // Delete the course from the database
        .from('courses')
        .delete()
        .eq('id', courseId); // Ensure the course ID matches

      if (error) throw error;

      setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId));
      showSuccess('Exito!', 'El curso se ha eliminado exitosamente', 5000);

    } catch (error) {
      console.error('Error deleting course:', error);
      showError('Error al eliminar el curso.', 'Por favor, inténtalo de nuevo.', 5000);
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: !currentStatus })
        .eq('id', courseId);

      if (error) throw error;
      await fetchCourses();
      showWarning('Aviso:', `Curso ${currentStatus ? 'desactivado' : 'activado'} exitosamente`, 5000);
    } catch (error) {
      console.error('Error updating course status:', error);
      showError('Error al actualizar el estado del curso.', 'Por favor, inténtalo de nuevo.', 5000);
    }
  };

  const toggleEnrollment = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ enrollment_open: !currentStatus })
        .eq('id', courseId);

      if (error) throw error;
      await fetchCourses();
      showInfo ('Atención!', `Matrícula ${currentStatus ? 'cerrada' : 'abierta'} exitosamente`, 5000);
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      showError('Error al actualizar.', 'Por favor, inténtalo de nuevo.', 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      teacher_id: '',
      credits: 0,
      period: '',
      enrollment_open: false,
      is_active: true
    });
    setEditingCourse(null);
    setShowCreateModal(false);
  };

  const startEdit = (course: Course) => {
    setFormData({
      name: course.name,
      description: course.description || '',
      teacher_id: course.teacher_id,
      credits: course.credits,
      period: course.period || '',
      enrollment_open: course.enrollment_open,
      is_active: course.is_active
    });
    setEditingCourse(course);
    setShowCreateModal(true);
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.period?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">     
     {/*NotificationContext es aplicado globalmente sin necesidad de agregar codigo acá*/}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Administrar Cursos</h1>
          <p className="text-gray-600">Crear, editar y administrar todos los cursos en el sistema</p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar cursos, profesores o períodos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Curso
          </button>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{course.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{course.teacher?.name}</p>
                    {course.period && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {course.period}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCourseStatus(course.id, course.is_active)}
                      className={`p-1 rounded ${course.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      title={course.is_active ? 'Course is active' : 'Course is inactive'}
                    >
                      {course.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {course.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{course._count?.enrollments || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{course._count?.modules || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{course.credits} créditos</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${course.enrollment_open
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {course.enrollment_open ? 'Abierta' : 'Cerrada'}
                    </span>
                    <button
                      onClick={() => toggleEnrollment(course.id, course.enrollment_open)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Cambiar
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      title='Editar'
                      onClick={() => startEdit(course)}
                      className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDialog({ open: true, courseId: course.id })}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Eliminar"
                    // onClick={() => handleDelete(course.id)}
                    // className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Confirmar eliminación</h2>
              <p className="mb-6 text-slate-600 dark:text-slate-300">
                ¿Está seguro de que desea eliminar este Curso? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog({ open: false })}
                  className="px-4 py-2 rounded bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (confirmDialog.courseId) {
                        await handleDelete(confirmDialog.courseId);
                      }
                    } finally {
                      setConfirmDialog({ open: false });
                    }
                  }}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cursos</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Intenta ajustar tus términos de búsqueda' : 'Comienza creando tu primer curso'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Curso
              </button>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Curso *
                    </label>
                    <input
                      title='Nombre del Curso'
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea 
                      title='Descripción del Curso'
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profesor *
                    </label>
                    <select 
                      title='Seleccionar Profesor'
                      required
                      value={formData.teacher_id}
                      onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar un profesor</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Créditos
                      </label>
                      <input
                        title='Créditos del Curso'
                        type="number"
                        min="0"
                        value={formData.credits}
                        onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Período
                      </label>
                      <input
                        type="text"
                        placeholder="ej., 1-Cuatri/2025"
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="enrollment_open"
                        checked={formData.enrollment_open}
                        onChange={(e) => setFormData({ ...formData, enrollment_open: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="enrollment_open" className="ml-2 block text-sm text-gray-700">
                        Abierto para matrícula
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                        Curso activo
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingCourse ? 'Actualizar Curso' : 'Crear Curso'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
   // </div>
  );
};

export default ManageCourses;