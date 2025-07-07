import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Download, Play, Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../../config/constants';

interface Course {
  id: number;
  name: string;
  description: string;
  professor: string;
  credits: number;
  enrolled: boolean;
  image: string;
  syllabus: string;
  modules: Module[];
}

interface Module {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  type: 'video' | 'document' | 'quiz';
  duration: string;
  completed: boolean;
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        // Simulating API call - replace with actual call when backend is ready
        // const response = await axios.get(`${API_URL}/courses/${id}`);
        
        // Mocking data for demonstration
        const mockCourse: Course = {
          id: 1,
          name: 'Introducción a la Teología',
          description: 'Este curso proporciona una introducción a los conceptos fundamentales de la teología cristiana, con énfasis en la comprensión de las doctrinas básicas de la fe y su relevancia para la vida y el ministerio. Se explorarán las fuentes teológicas, métodos y tradiciones históricas, con un enfoque en la perspectiva reformada.',
          professor: 'Dr. Juan Pérez',
          credits: 4,
          enrolled: true,
          image: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
          syllabus: 'syllabus_teologia.pdf',
          modules: [
            {
              id: 1,
              title: 'Introducción a la disciplina teológica',
              description: 'Conceptos básicos y metodología teológica',
              lessons: [
                { id: 1, title: 'Qué es la teología', type: 'video', duration: '45 min', completed: true },
                { id: 2, title: 'Fuentes del conocimiento teológico', type: 'document', duration: '30 min', completed: true },
                { id: 3, title: 'Metodología teológica', type: 'video', duration: '40 min', completed: false },
              ]
            },
            {
              id: 2,
              title: 'La doctrina de la revelación',
              description: 'Revelación general y especial',
              lessons: [
                { id: 4, title: 'Revelación general', type: 'video', duration: '35 min', completed: false },
                { id: 5, title: 'Revelación especial', type: 'document', duration: '25 min', completed: false },
                { id: 6, title: 'Evaluación del módulo', type: 'quiz', duration: '20 min', completed: false },
              ]
            },
            {
              id: 3,
              title: 'La doctrina de Dios',
              description: 'Atributos y naturaleza de Dios',
              lessons: [
                { id: 7, title: 'Los atributos de Dios', type: 'video', duration: '50 min', completed: false },
                { id: 8, title: 'La Trinidad', type: 'video', duration: '45 min', completed: false },
                { id: 9, title: 'Lectura: Conociendo a Dios', type: 'document', duration: '60 min', completed: false },
                { id: 10, title: 'Evaluación del módulo', type: 'quiz', duration: '30 min', completed: false },
              ]
            }
          ]
        };
        
        setCourse(mockCourse);
        if (mockCourse.modules.length > 0) {
          setActiveModule(mockCourse.modules[0].id);
        }
      } catch (error) {
        console.error('Error fetching course details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCourse();
  }, [id]);

  const calculateProgress = () => {
    if (!course) return 0;
    
    const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const completedLessons = course.modules.reduce((sum, module) => 
      sum + module.lessons.filter(lesson => lesson.completed).length, 0
    );
    
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const renderLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play size={16} className="text-sky-600 dark:text-sky-400" />;
      case 'document':
        return <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case 'quiz':
        return <FileText size={16} className="text-amber-600 dark:text-amber-400" />;
      default:
        return <FileText size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
            Curso no encontrado
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            El curso que estás buscando no existe o no tienes acceso a él.
          </p>
          <Link
            to="/student/courses"
            className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver a la lista de cursos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Link
          to="/student/courses"
          className="mr-4 flex items-center text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition"
        >
          <ArrowLeft size={20} className="mr-1" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          {course.name}
        </h1>
      </div>
      
      {/* Course Header */}
      <div className="relative h-64 rounded-xl overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${course.image})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">{course.name}</h2>
          <div className="flex items-center">
            <p className="mr-4">Profesor: {course.professor}</p>
            <p>Créditos: {course.credits}</p>
          </div>
        </div>
      </div>
      
      {/* Course Progress */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
          Tu progreso
        </h3>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Completado</span>
          <span className="font-medium text-slate-800 dark:text-white">{calculateProgress()}%</span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-sky-500 rounded-full" 
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        <div className="flex justify-between">
          <a 
            href="#" 
            className="inline-flex items-center text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            <Download size={16} className="mr-1" />
            Descargar programa
          </a>
          <button className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition">
            <BookOpen size={16} className="mr-2" />
            Continuar aprendiendo
          </button>
        </div>
      </div>
      
      {/* Course Description */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
          Acerca del curso
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {course.description}
        </p>
      </div>
      
      {/* Course Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white p-6">
            Contenido del curso
          </h3>
        </div>
        
        <div>
          {course.modules.map((module) => (
            <div key={module.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0">
              <button
                onClick={() => setActiveModule(activeModule === module.id ? null : module.id)}
                className="w-full flex justify-between items-center p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition"
              >
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">
                    {module.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {module.description}
                  </p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400 mr-3">
                    {module.lessons.length} lecciones
                  </span>
                  <svg
                    className={`h-5 w-5 text-slate-500 transform transition-transform ${
                      activeModule === module.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
              
              {activeModule === module.id && (
                <div className="px-6 pb-6">
                  <ul className="space-y-3">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <div className="flex items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mr-3">
                            {lesson.completed ? (
                              <Check size={16} className="text-green-600 dark:text-green-400" />
                            ) : (
                              renderLessonIcon(lesson.type)
                            )}
                          </div>
                          <div className="flex-grow">
                            <h5 className="font-medium text-slate-800 dark:text-white">
                              {lesson.title}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                              <span className="capitalize mr-2">
                                {lesson.type === 'video' ? 'Video' : 
                                 lesson.type === 'document' ? 'Lectura' : 'Evaluación'}
                              </span>
                              <Clock size={12} className="mr-1" />
                              {lesson.duration}
                            </p>
                          </div>
                          <div>
                            {lesson.completed ? (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                Completado
                              </span>
                            ) : (
                              <button className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                                {lesson.type === 'video' ? 'Ver' : 
                                 lesson.type === 'document' ? 'Leer' : 'Iniciar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;