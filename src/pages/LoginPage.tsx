import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import Logo from '../components/Logo';

const LoginPage = () => {
  const { login, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const registered = searchParams.get('registered');
  const hasNavigated = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }
    
    try {
      await login(email, password);
      // Navegação será feita pelo useEffect abaixo
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')) {
        setError('Credenciales inválidas. Verifique su email y contraseña. Si no tiene una cuenta, regístrese primero.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Por favor confirme su email antes de iniciar sesión.');
      } else if (err.message?.includes('Too many requests')) {
        setError('Demasiados intentos de inicio de sesión. Por favor espere unos minutos antes de intentar nuevamente.');
      } else {
        setError(err.message || 'Error al iniciar sesión. Por favor intente nuevamente.');
      }
    }
  };

  // Redireciona apenas uma vez após login
  useEffect(() => {
    console.log('LoginPage useEffect', user, hasNavigated.current);
    if (user && !hasNavigated.current) {
      hasNavigated.current = true;
      if (user.role?.includes('admin')) {
        navigate('/admin/dashboard');
      } else if (user.role?.includes('teacher')) {
        navigate('/teacher/dashboard');
      } else if (user.role?.includes('student')) {
        navigate('/student/dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg"
      >
        <div className="text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Ingrese sus credenciales para acceder a su cuenta
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {registered && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg">
              <p>¡Cuenta creada exitosamente! Ahora puede iniciar sesión.</p>
            </div>
          )}
          
          {/* Info box for first-time users */}
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-lg flex items-start">
            <Info className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">¿Primera vez en el sistema?</p>
              <p className="mt-1">
                Si no tiene una cuenta, debe{' '}
                <Link to="/register" className="underline hover:no-underline">
                  registrarse primero
                </Link>
                . Si ya se registró, use las mismas credenciales que utilizó durante el registro.
              </p>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-start">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white sm:text-sm"
                  placeholder="ejemplo@email.com"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
                ¿Olvidó su contraseña?
              </a>
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
              Iniciar sesión
            </motion.button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              ¿No tiene una cuenta?{' '}
              <Link to="/register" className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
                Registrarse
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;