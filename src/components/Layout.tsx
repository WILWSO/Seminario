import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { useState, useEffect } from 'react';

const Layout = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col min-h-screen bg-sky-50 dark:bg-slate-900">
      <Navbar toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1">
        {isAuthenticated && (
          <Sidebar 
            isOpen={isMobile ? sidebarOpen : true} 
            toggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />
        )}
        
        <main className={`flex-1 transition-all duration-300 ${isAuthenticated && !isMobile ? 'ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-8">
            <Outlet />
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default Layout;