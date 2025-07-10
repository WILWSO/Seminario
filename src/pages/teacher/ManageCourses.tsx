import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Edit, Trash, Users, FileText, Eye, EyeOff, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import FileUpload from '../../components/FileUpload';
import { UploadResult } from '../../services/fileUpload';

interface Course {
  id: string;
  name: string;
  description: string;
  students_count: number;
  modules_count: number;
  lessons_count: number;
  is_active: boolean;
  credits: number;
  image_url?: string;
  syllabus_url?: string;
}

const ManageCourses = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    credits: 0,
    image_url: '',
    image_file_name: '',
    syllabus_url: '',
    syllabus_file_name: '',
    is_active: true
  });

  useEffect(() => {
    if (user?.id) {
      fetchCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    // Apply search filter
    if (searchTerm) {
      const filtered = courses.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses(courses);
    }
  }, [courses, searchTerm]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);

      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments(count),
          modules(
            id,
            lessons(id)
          )
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include counts
      const transformedCourses = (coursesData || []).map(course => ({
        id: course.id,
        name: course.name,
        description: course.description || '',
        students_count: course.enrollments?.length || 0,
        modules_count: course.modules?.length || 0,
        lessons_count: course.modules?.reduce((total: number, module: any) => 
          total + (module.lessons?.length || 0), 0) || 0,
        is_active: course.is_active,
        credits: course.credits,
        image_url: course.image_url,
        syllabus_url: course.syllabus_url
      }));

      setCourses(transformedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      
      // Exclude UI-only fields that don't exist in the database
      const { image_file_name, syllabus_file_name, ...courseData } = formData;
      
      const finalCourseData = {
        ...courseData,
        teacher_id: user?.id
      };
      
      if (editingCourse) {
        // Update course
        const { error } = await supabase
          .from('courses')
          .update(finalCourseData)
          .eq('id', editingCourse.id);

        if (error) throw error;
      } else {
        // Create course
        const { error } = await supabase
          .from('courses')
          .insert([finalCourseData]);

        if (error) throw error;
      }

      // Reset form and refresh data
      setFormData({
        name: '',
        description: '',
        credits: 0,
        image_url: '',
        syllabus_url: '',
        is_active: true
      });
      setIsCreating(false);
      setEditingCourse(null);
      await fetchCourses();

      showSuccess(
        editingCourse ? 'Curso actualizado' : 'Curso creado',
        editingCourse ? 'El curso se ha actualizado correctamente.' : 'El curso se ha creado correctamente.',
        3000
      );
    } catch (error) {
      console.error('Error saving course:', error);
      showError(
        'Error al guardar curso',
        'No se pudo guardar el curso. Por favor, intente nuevamente.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course: Course) => {
    setFormData({
      name: course.name,
      description: course.description,
      credits: course.credits,
      image_url: course.image_url || '',
      image_file_name: '',
      syllabus_url: course.syllabus_url || '',
      syllabus_file_name: '',
      is_active: course.is_active
    });
    setEditingCourse(course);
    setIsCreating(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este curso? Esta acción eliminará también todos los módulos, lecciones y inscripciones asociadas.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      await fetchCourses();
      
      showSuccess(
        'Curso eliminado',
        'El curso se ha eliminado correctamente.',
        3000
      );
    } catch (error) {
      console.error('Error deleting course:', error);
      showError(
        'Error al eliminar curso',
        'No se pudo eliminar el curso. Por favor, intente nuevamente.',
        5000
      );
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
      
      showSuccess(
        'Estado actualizado',
        `El curso se ha ${!currentStatus ? 'activado' : 'desactivado'} correctamente.`,
        3000
      );
    } catch (error) {
      console.error('Error updating course status:', error);
      showError(
        'Error al cambiar estado',
        'No se pudo cambiar el estado del curso. Por favor, intente nuevamente.',
        5000
      );
    }
  };

  const cancelForm = () => {
    setFormData({
      name: '',
      description: '',
      credits: 0,
      image_url: '',
      image_file_name: '',
      syllabus_url: '',
      syllabus_file_name: '',
      is_active: true
    });
    setIsCreating(false);
    setEditingCourse(null);
  };

  const handleImageUpload = (result: UploadResult) => {
    setFormData(prev => ({
      ...prev,
      image_url: result.url,
      image_file_name: result.fileName
    }));
  };

  const handleImageRemove = () => {
    setFormData(prev => ({
      ...prev,
      image_url: '',
      image_file_name: ''
    }));
  };

  const handleSyllabusUpload = (result: UploadResult) => {
    setFormData(prev => ({
      ...prev,
      syllabus_url: result.url,
      syllabus_file_name: result.fileName
    }));
  };

  const handleSyllabusRemove = () => {
    setFormData(prev => ({
      ...prev,
      syllabus_url: '',
      syllabus_file_name: ''
    }));
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
     {/* NotificationContext es aplicado globalmente sin necesidad de agregar codigo acá*/}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Administrar mis cursos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gestione sus cursos, módulos y lecciones
          </p>
        </div>
        {!isCreating && (
          <button
            disabled
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-slate-400 text-white rounded-md cursor-not-allowed transition"
            title="Solo los administradores pueden crear cursos"
          >
            <Plus size={18} className="mr-2" />
            Solo admins pueden crear cursos
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
                  Imagen del curso
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData(prev => ({ ...prev, image_file_name: '' }));
                    }}
                    placeholder="URL de imagen (opcional si sube archivo)"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400">O</div>
                  <FileUpload
                    onFileSelect={handleImageUpload}
                    onFileRemove={handleImageRemove}
                    currentFile={formData.image_url}
                    currentFileName={formData.image_file_name}
                    acceptedTypes={['image/*']}
                    maxSizeMB={5}
                    label=""
                    description="Subir imagen del curso"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Programa del curso
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    name="syllabus_url"
                    value={formData.syllabus_url}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData(prev => ({ ...prev, syllabus_file_name: '' }));
                    }}
                    placeholder="URL del programa (opcional si sube archivo)"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400">O</div>
                  <FileUpload
                    onFileSelect={handleSyllabusUpload}
                    onFileRemove={handleSyllabusRemove}
                    currentFile={formData.syllabus_url}
                    currentFileName={formData.syllabus_file_name}
                    acceptedTypes={['application/pdf', '.doc', '.docx']}
                    maxSizeMB={5}
                    label=""
                    description="Subir programa del curso (PDF, Word)"
                  />
                </div>
              </div>
            </div>

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

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
        />
        <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      course.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {course.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 mb-3">
                    {course.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center">
                      <Users size={16} className="mr-1" />
                      <span>{course.students_count} estudiantes</span>
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
                  
                  <Link
                    to={`/teacher/courses/${course.id}`}
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-md transition"
                    title="Administrar contenido"
                  >
                    <BookOpen size={18} />
                  </Link>
                  
                  <Link
                    to={`/teacher/students/${course.id}`}
                    className="p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-md transition"
                    title="Ver estudiantes"
                  >
                    <Users size={18} />
                  </Link>
                  
                  <button
                    onClick={() => handleEdit(course)}
                    className="p-2 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20 rounded-md transition"
                    title="Editar curso"
                  >
                    <Edit size={18} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-2 text-slate-400 cursor-not-allowed rounded-md transition"
                    title="Solo los administradores pueden eliminar cursos"
                    disabled
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
              {searchTerm ? 'No se encontraron cursos' : 'No hay cursos creados'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm 
                ? 'No hay cursos que coincidan con su búsqueda'
                : 'Cree su primer curso haciendo clic en el botón "Nuevo curso".'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCourses;