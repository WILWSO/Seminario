import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  Users, 
  Bell, 
  Settings,
  X,
  ChevronDown,
  BarChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const Sidebar = ({ isOpen, toggleSidebar, isMobile }: SidebarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  // Close role selector when sidebar closes or user changes
  useEffect(() => {
    if (!isOpen) {
      setShowRoleSelector(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setShowRoleSelector(false);
  }, [user]);

  // Determinar el rol activo basado en la URL actual y los roles del usuario
  const getCurrentRole = (): 'student' | 'teacher' | 'admin' => {
    if (!user?.role || user.role.length === 0) return 'student';
    
    // Priorizar basado en la URL actual
    if (location.pathname.startsWith('/admin') && user.role.includes('admin')) {
      return 'admin';
    }
    if (location.pathname.startsWith('/teacher') && user.role.includes('teacher')) {
      return 'teacher';
    }
    if (location.pathname.startsWith('/student') && user.role.includes('student')) {
      return 'student';
    }
    
    // Si no coincide con la URL, usar el rol de mayor prioridad
    if (user.role.includes('admin')) return 'admin';
    if (user.role.includes('teacher')) return 'teacher';
    return 'student';
  };
  
  const selectedRole = getCurrentRole();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const navItems = {
    student: [
      { path: '/student/dashboard', icon: <Home size={20} />, label: 'Inicio' },
      { path: '/student/courses', icon: <BookOpen size={20} />, label: 'Cursos' },
      { path: '/student/progress', icon: <BarChart size={20} />, label: 'Mi Progreso' },
    ],
    teacher: [
      { path: '/teacher/dashboard', icon: <Home size={20} />, label: 'Inicio' },
      { path: '/teacher/courses', icon: <BookOpen size={20} />, label: 'Administrar Contenido' },
      { path: '/teacher/assignments', icon: <FileText size={20} />, label: 'Evaluaciones' },
      { path: '/teacher/grades', icon: <FileText size={20} />, label: 'Calificaciones' },
    ],
    admin: [
      { path: '/admin/dashboard', icon: <Home size={20} />, label: 'Inicio' },
      { path: '/admin/courses', icon: <BookOpen size={20} />, label: 'Cursos' },
      { path: '/admin/users', icon: <Users size={20} />, label: 'Usuarios' },
      { path: '/admin/announcements', icon: <Bell size={20} />, label: 'Anuncios' },
      { path: '/admin/settings', icon: <Settings size={20} />, label: 'Configuración' },
    ],
  };

  // Obtener roles disponibles para el usuario
  const getAvailableRoles = () => {
    if (!user?.role || user.role.length === 0) return ['student'];
    
    const availableRoles: ('student' | 'teacher' | 'admin')[] = [];
    
    if (user.role.includes('student')) availableRoles.push('student');
    if (user.role.includes('teacher')) availableRoles.push('teacher');
    if (user.role.includes('admin')) availableRoles.push('admin');
    
    return availableRoles;
  };

  const availableRoles = getAvailableRoles();
  const roleItems = navItems[selectedRole] || navItems.student;

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'admin': return 'Panel de Administración';
      case 'teacher': return 'Portal de Profesores';
      case 'student': return 'Portal de Estudiantes';
      default: return 'Portal';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      default: return role;
    }
  };

  const handleRoleChange = (role: 'student' | 'teacher' | 'admin') => {
    setShowRoleSelector(false);
    
    // Redirigir al dashboard del rol seleccionado
    const dashboardPath = `/${role}/dashboard`;
    window.location.href = dashboardPath;
  };

  if (!isOpen) return null;

  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: '-100%', opacity: 0 },
  };

  return (
    <motion.aside
      initial={isMobile ? "closed" : "open"}
      animate="open"
      variants={sidebarVariants}
      className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 shadow-lg z-20 ${
        isMobile ? 'transition-transform transform' : ''
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          {getRoleTitle(selectedRole)}
        </h2>
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="text-slate-600 dark:text-white"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      <nav className="mt-6 px-4">
        <ul className="space-y-1">
          {roleItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                onClick={isMobile ? toggleSidebar : undefined}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="space-y-3">
          {/* Role Selector */}
          {availableRoles.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowRoleSelector(!showRoleSelector)}
                className="w-full flex items-center justify-between p-2 text-sm bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  Ver como: {getRoleDisplayName(selectedRole)}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`text-slate-500 transition-transform ${showRoleSelector ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {showRoleSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden"
                >
                  {availableRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition ${
                        selectedRole === role 
                          ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {getRoleDisplayName(role)}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          )}
          
          {/* User Info */}
          <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center">
            <GraduationCap className="text-sky-600 dark:text-sky-400" />
          </div>
          <div className="ml-3">
            <p className="font-medium text-slate-800 dark:text-white">{user?.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user?.role?.map(r => getRoleDisplayName(r)).join(', ') || 'Estudiante'}
            </p>
          </div>
        </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;