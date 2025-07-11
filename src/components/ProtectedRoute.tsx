import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  role: 'student' | 'teacher' | 'admin';
}

const ProtectedRoute = ({ role }: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500 dark:border-sky-400"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  console.log('ProtectedRoute:', { isAuthenticated, user, isLoading });
  
  // Verificar se o usuário tem o role necessário
  if (!user?.role || user.role.length === 0 || !user.role.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role && user.role.includes('student') && !user.role.includes('teacher') && !user.role.includes('admin')) {
      return <Navigate to="/student/dashboard" replace />;
    } else if (user?.role && user.role.includes('teacher')) {
      return <Navigate to="/teacher/dashboard" replace />;
    } else if (user?.role && user.role.includes('admin')) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

export default ProtectedRoute;