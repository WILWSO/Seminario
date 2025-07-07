import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Edit, Trash, Users, FileText, Eye, EyeOff, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../config/supabase';
import type { Course, User } from '../../config/supabase';

interface CourseWithStats extends Course {
  enrollments_count: number;
  modules_count: number;
  lessons_count: number;
}

const ManageCourses = () => {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'active', 'inactive'
    teacher: 'all'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithStats | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacher_id: '',
    credits: 0,
    image_url: '',
    syllabus_url: '',
    is_active: true,
    enrollment_open: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Apply filters and search
    let result = [...courses];
    
    // Apply status filter
    if (filters.status === 'active') {
      result = result.filter(course => course.is_active);
    } else if (filters.status === 'inactive') {
      result = result.filter(course => !course.is_active);
    }
    
    // Apply teacher filter
    if (filters.teacher !== 'all') {
      result = result.filter(course => course.teacher_id === filters.teacher);
    }
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        course => 
          course.name.toLowerCase().includes(term) ||
          course.description?.toLowerCase().includes(term) ||
          course.teacher?.name?.toLowerCase().includes(term)
      );
    }
    
    setFilteredCourses(result);
  }, [courses, searchTerm, filters]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch courses with teacher info and stats
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          teacher:users!courses_teacher_id_fkey(id, name, first_name, last_name),
          enrollments(count),
          modules(
            id,
            lessons(id)
          )
        `)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Transform data to include counts
      const coursesWithStats = (coursesData || []).map(course => ({
        ...course,
        enrollments_count: course.enrollments?.length || 0,
        modules_count: course.modules?.length || 0,
        lessons_count: course.modules?.reduce((total, module) => total + (module.lessons?.length || 0), 0) || 0
      }));

      setCourses(coursesWithStats);

      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('*')
        .contains('role', ['teacher'])
        .order('name');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      if (editingCourse) {
        // Update course
        const { error } = await supabase
          .from('courses')
          .update(formData)
          .eq('id', editingCourse.id);

        if (error) throw error;
      } else {
        // Create course
        const { error } = await supabase
          .from('courses')
          .insert([formData]);

        if (error) throw error;
      }

      // Reset form and refresh data
      setFormData({
        name: '',
        description: '',
        teacher_id: '',
        credits: 0,
        image_url: '',
        syllabus_url: '',
        is_active: true,
        enrollment_open: false
      });
      setIsCreating(false);
      setEditingCourse(null);
      await fetchData();

    } catch (error) {
      console.error('Error saving course:', error);
      alert('Error al guardar el curso: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course: CourseWithStats) => {
    setFormData({
      name: course.name,
      description: course.description || '',
      teacher_id: course.teacher_id,
      credits: course.credits,
      image_url: course.image_url || '',
      syllabus_url: course.syllabus_url || '',
      is_active: course.is_active,
      enrollment_open: course.enrollment_open || false
    });
    setEditingCourse(course);
    setIsCreating(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este curso? Esta acción eliminará también todos los módulos, lecciones y inscripciones asociadas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Error al eliminar el curso: ' + (error as Error).message);
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_active: !currentStatus })
        .eq('id', courseId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating course status:', error);
      alert('Error al cambiar el estado del curso: ' + (error as Error).message);
    }
  };

  const cancelForm = () => {
    setFormData({
      name: '',
      description: '',
      teacher_id: '',
      credits: 0,
      image_url: '',
      syllabus_url: '',
      is_active: true,
      enrollment_open: false
    });
    setIsCreating(false);
    setEditingCourse(null);
  };

  if (isLoading && courses.length === 0) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Administrar cursos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestione todos los cursos del sistema
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <Plus size={18} className="mr-2" />
            Nuevo curso
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingCourse ? 'Editar curso' : 'Crear nuevo curso'}
            </h2>
            <button
              onClick={cancelForm}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del curso *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Profesor *
                </label>
                <select
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Seleccionar profesor</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || `${teacher.first_name} ${teacher.last_name}`}
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
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Créditos
                </label>
                <input
                  type="number"
                  name="credits"
                  value={formData.credits}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  URL de imagen
                </label>
                <input
                  type="url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  URL del programa
                </label>
                <input
                  type="url"
                  name="syllabus_url"
                  value={formData.syllabus_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
              <h4 className="text-md font-medium text-slate-800 dark:text-white mb-3">
                Control de matrícula
              </h4>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enrollment_open"
                  checked={formData.enrollment_open}
                  onChange={handleChange}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Permitir matrículas para este curso
                </label>
              </div>
              
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Solo los cursos con matrículas habilitadas aparecerán como disponibles para los estudiantes.
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                />
                <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Curso activo
                </label>
              </div>
              
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Los cursos inactivos no serán visibles para estudiantes ni profesores.
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition disabled:opacity-50"
              >
                {editingCourse ? 'Actualizar' : 'Crear'} curso
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            <Filter size={18} className="mr-2" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Profesor
                </label>
                <select
                  value={filters.teacher}
                  onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                >
                  <option value="all">Todos los profesores</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || `${teacher.first_name} ${teacher.last_name}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredCourses.map((course) => (
          <motion.div
            key={course.id}
            whileHover={{ y: -2 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white mr-3">
                      {course.name}
                    </h3>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        course.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {course.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        course.enrollment_open 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {course.enrollment_open ? 'Matrículas abiertas' : 'Matrículas cerradas'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 mb-3">
                    {course.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center">
                      <Users size={16} className="mr-1" />
                      <span>Profesor: {course.teacher?.name || `${course.teacher?.first_name} ${course.teacher?.last_name}`}</span>
                    </div>
                    <div className="flex items-center">
                      <Users size={16} className="mr-1" />
                      <span>{course.enrollments_count} estudiantes</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen size={16} className="mr-1" />
                      <span>{course.modules_count} módulos</span>
                    </div>
                    <div className="flex items-center">
                      <FileText size={16} className="mr-1" />
                      <span>{course.lessons_count} lecciones</span>
                    </div>
                    <div className="flex items-center">
                      <FileText size={16} className="mr-1" />
                      <span>{course.credits} créditos</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 lg:mt-0 lg:ml-6 flex items-center space-x-2">
                  <button
                    onClick={() => toggleCourseStatus(course.id, course.is_active)}
                    className={`p-2 rounded-md transition ${
                      course.is_active
                        ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                        : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                    }`}
                    title={course.is_active ? 'Desactivar curso' : 'Activar curso'}
                  >
                    {course.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(course)}
                    className="p-2 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition"
                    title="Editar curso"
                  >
                    <Edit size={18} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition"
                    title="Eliminar curso"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mb-4">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
              No se encontraron cursos
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm || filters.status !== 'all' || filters.teacher !== 'all'
                ? 'No hay cursos que coincidan con los criterios de búsqueda'
                : 'No hay cursos creados. Cree uno nuevo haciendo clic en el botón "Nuevo curso".'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCourses;