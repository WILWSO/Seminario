import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { BookOpen, Users, FileText, TrendingUp, Calendar, Bell, Plus, Eye, Edit, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
  id: string;
  name: string;
  description: string;
  credits: number;
  is_active: boolean;
  enrollment_open: boolean;
  period: string;
  created_at: string;
  enrollments: { count: number }[];
  modules: { count: number }[];
  assignments: { count: number }[];
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  course: {
    name: string;
  };
  assignment_submissions: { count: number }[];
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'submission' | 'completion';
  mensaje: string;
  timestamp: string;
  course_name?: string;
  student_name?: string;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeAssignments: 0,
    pendingGrades: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch courses with enrollment counts
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments(count),
          modules(count),
          assignments(count)
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Fetch recent assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          course:courses(name),
          assignment_submissions(count)
        `)
        .in('course_id', coursesData?.map(c => c.id) || [])
        .order('created_at', { ascending: false })
        .limit(5);

      if (assignmentsError) throw assignmentsError;

      // Calculate stats
      const totalStudents = coursesData?.reduce((sum, course) => 
        sum + (course.enrollments?.[0]?.count || 0), 0) || 0;
      
      const activeAssignments = assignmentsData?.filter(a => 
        new Date(a.due_date) > new Date()).length || 0;

      // Fetch pending grades count
      const { count: pendingGrades } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .is('grade', null)
        .in('assignment_id', assignmentsData?.map(a => a.id) || []);

      setCourses(coursesData || []);
      setAssignments(assignmentsData || []);
      setStats({
        totalCourses: coursesData?.length || 0,
        totalStudents,
        activeAssignments,
        pendingGrades: pendingGrades || 0
      });

      // Generate recent activity (simplified)
      const activities: RecentActivity[] = [
        {
          id: '1',
          type: 'enrollment',
          mensaje: 'Nuevo estudiante matriculado en el curso',
          timestamp: new Date().toISOString(),
          course_name: coursesData?.[0]?.name
        },
        {
          id: '2',
          type: 'submission',
          mensaje: 'Evaluación entregada',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          course_name: coursesData?.[0]?.name
        }
      ];
      setRecentActivity(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment': return <Users className="w-4 h-4 text-blue-500" />;
      case 'submission': return <FileText className="w-4 h-4 text-green-500" />;
      case 'completion': return <TrendingUp className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Profesor</h1>
            <p className="text-gray-600 mt-2">¡Bienvenido de nuevo! Aquí está lo que sucede con tus cursos.</p>
          </div>
          <Link
            to="/teacher/courses"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Administrar Cursos
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Cursos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Estudiantes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Evaluaciones Activas</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeAssignments}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Calificaciones Pendientes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingGrades}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Courses Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600 mb-4">Contacta al administrador para que te asigne cursos</p>
                  <Link to="/teacher/courses" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    Ver Cursos
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aún no hay cursos</h3>
                    <p className="text-gray-600 mb-4">Crea tu primer curso para comenzar</p>
                    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Curso
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{course.name}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                course.is_active 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {course.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                              {course.enrollment_open && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  Matrícula Abierta
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{course.description}</p>
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {course.enrollments?.[0]?.count || 0} estudiantes
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-4 h-4" />
                                {course.modules?.[0]?.count || 0} módulos
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                {course.assignments?.[0]?.count || 0} evaluaciones
                              </span>
                              {course.period && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {course.period}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity & Assignments */}
          <div className="space-y-8">
            {/* Recent Assignments */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Evaluaciones Recientes</h2>
              </div>
              <div className="p-6">
                {assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Aún no hay evaluaciones</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                        <p className="text-sm text-gray-600">{assignment.course.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            Fecha límite: {formatDate(assignment.due_date)}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {assignment.assignment_submissions?.[0]?.count || 0} entregas
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
              </div>
              <div className="p-6">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No hay actividad reciente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="p-1 bg-gray-100 rounded-full">
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.mensaje}</p>
                          {activity.course_name && (
                            <p className="text-xs text-gray-600">{activity.course_name}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;