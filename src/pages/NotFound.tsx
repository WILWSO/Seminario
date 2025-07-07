import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-sky-600 dark:text-sky-400">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
          Página no encontrada
        </h2>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Lo sentimos, la página que está buscando no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            <Home className="mr-2 -ml-1 h-5 w-5" />
            Volver a inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;