import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-800 shadow-inner pt-10 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-4">
              <Logo />
              <span className="ml-2 text-xl font-bold text-sky-600 dark:text-sky-400">
                SEMBRAR
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Seminário Bíblico Reformado da Argentina
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400">
                <Instagram size={20} />
              </a>
              <a href="mailto:info@sembrar.edu.ar" className="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400">
                <Mail size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Enlaces rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Cursos
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Programas</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Teología Bíblica
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Historia de la Iglesia
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Estudios Pastorales
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400">
                  Misiones
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Contacto</h3>
            <address className="not-italic text-slate-600 dark:text-slate-300">
              <p className="mb-2">Buenos Aires, Argentina</p>
              <p className="mb-2">Email: ipamarcospaz@gmail.com</p>
              <p>Teléfono: +54 11 2601 1240</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-700 mt-8 pt-6 text-center text-slate-500 dark:text-slate-400">
          <p>&copy; {currentYear} SEMBRAR. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;