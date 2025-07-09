import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Logo from './Logo';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout().then(() => {
      navigate('/');
    }).catch((error) => {
      console.error('Error during logout:', error);
      // Even if logout fails, navigate to home
      navigate('/');
    });
  };

  return (
    <header className="bg-white dark:bg-primary-800 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {isAuthenticated && (
              <button
                onClick={toggleSidebar}
                className="mr-2 text-primary-600 dark:text-white md:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} />
              </button>
            )}
            <Link to="/" className="flex items-center">
              <Logo />
              <span className="ml-2 text-xl font-bold text-primary-600 dark:text-primary-200">
                SEMBRAR
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-primary-50 dark:hover:bg-primary-700 transition"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-primary-200" />
              ) : (
                <Moon size={20} className="text-primary-600" />
              )}
            </button>
            
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 text-primary-600 dark:text-white hover:text-primary-700 dark:hover:text-primary-200"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-700 flex items-center justify-center">
                    <User size={18} className="text-primary-600 dark:text-primary-200" />
                  </div>
                  <span className="hidden md:block">{user?.name}</span>
                </button>
                
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-primary-800 rounded-md shadow-lg py-1 z-10"
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-primary-700 dark:text-white hover:bg-primary-50 dark:hover:bg-primary-700 flex items-center"
                    >
                      <LogOut size={16} className="mr-2" />
                      Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;