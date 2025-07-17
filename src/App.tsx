import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuthErrorNotifications } from './hooks/useAuthErrorNotifications';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/student/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import CoursesList from './pages/student/CoursesList';
import CourseDetails from './pages/student/CourseDetails';
import Progress from './pages/student/Progress';
import StudentGrades from './pages/student/Grades';
import StudentAssignments from './pages/student/Assignments';
import ManageCourses from './pages/teacher/ManageCourses';
import ManageGrades from './pages/teacher/ManageGrades';
import ManageAnnouncements from './pages/admin/ManageAnnouncements';
import AdminManageCourses from './pages/admin/ManageCourses';
import ManageUsers from './pages/admin/ManageUsers';
import Settings from './pages/admin/Settings';
import NotFound from './pages/NotFound';
import ManageAssignments from './pages/teacher/ManageAssignments';
import AssignmentSubmissions from './pages/teacher/AssignmentSubmissions';
import CourseManagement from './pages/teacher/CourseManagement';
import StudentManagement from './pages/teacher/StudentManagement';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import { useNotifications } from './contexts/NotificationContext';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { NotificationProvider } from './contexts/NotificationContext';
import ManageFinalGrade from './pages/admin/ManageFinalGrade';

function ConnectionStatusHandler() {
  const { showError } = useNotifications();
  useConnectionStatus(showError);
  useAuthErrorNotifications(); // Agregar el hook para manejar errores de autenticación
  return null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-32 h-32 bg-sky-200 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-sky-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider> 
          <ConnectionStatusHandler /> 
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />

              {/* Student Routes */}
              <Route path="student" element={<ProtectedRoute role="student" />}>
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="courses" element={<CoursesList />} />
                <Route path="courses/:courseId" element={<CourseDetails />} />
                <Route path="assignments" element={<StudentAssignments />} />
                <Route path="progress" element={<Progress />} />
                <Route path="grades" element={<StudentGrades />} />
              </Route>

              {/* Teacher Routes */}
              <Route path="teacher" element={<ProtectedRoute role="teacher" />}>
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="courses" element={<ManageCourses />} />
                <Route path="courses/:id" element={<CourseManagement />} />
                <Route path="students/:id" element={<StudentManagement />} />
                <Route path="assignments" element={<ManageAssignments />} />
                <Route path="assignments/:assignmentId/submissions" element={<AssignmentSubmissions />} />
                <Route path="managegrades" element={<ManageGrades />} />
                <Route path="managegrades/:assignmentId" element={<ManageGrades />} />
              </Route>

              {/* Admin Routes */}
              <Route path="admin" element={<ProtectedRoute role="admin" />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="courses" element={<AdminManageCourses />} />
                <Route path="announcements" element={<ManageAnnouncements />} />
                <Route path="announcements/create" element={<ManageAnnouncements />} />
                <Route path="users" element={<ManageUsers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="managefinalgrade" element={<ManageFinalGrade />} />              
              </Route>

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;