import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Award, Users, Calendar } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/256520/pexels-photo-256520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center mix-blend-overlay"></div>
        
        <div className="relative container mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            Seminário Bíblico Reformado da Argentina
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white mb-10 max-w-3xl mx-auto"
          >
            Formando líderes con conocimiento bíblico sólido y un corazón para servir
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link 
              to="/login" 
              className="px-6 py-3 bg-white text-sky-600 font-medium rounded-lg hover:bg-slate-100 transition"
            >
              Iniciar sesión
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition"
            >
              Registrarse
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Announcements Section */}
      <section className="py-12 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="bg-sky-50 dark:bg-slate-700 border-l-4 border-sky-500 p-4 rounded-r-lg shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-sky-800 dark:text-sky-300 mb-2">
              Anuncios importantes
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              Las inscripciones para el segundo semestre están abiertas hasta el 30 de julio. No pierda la oportunidad de continuar su formación teológica.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-white mb-12">
            ¿Por qué estudiar en SEMBRAR?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                Educación Bíblica Sólida
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Nuestro programa académico se basa en un estudio profundo de las Escrituras desde una perspectiva reformada.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center mb-4">
                <Users className="text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                Profesores Experimentados
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Contamos con un equipo de profesores altamente calificados y con amplia experiencia en el ministerio.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                Flexibilidad de Horarios
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Ofrecemos diferentes modalidades de estudio para que pueda formarse mientras cumple con sus responsabilidades.
              </p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center mb-4">
                <Award className="text-sky-600 dark:text-sky-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                Reconocimiento Académico
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Nuestros programas están reconocidos por instituciones teológicas internacionales.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-16 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-white mb-12">
            Programas académicos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl overflow-hidden shadow-md">
              <div className="h-48 bg-[url('https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  Certificado en Estudios Bíblicos
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Un programa introductorio diseñado para proporcionar una base sólida en la comprensión de las Escrituras.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Duración: 1 año
                </p>
                <a 
                  href="#" 
                  className="inline-block px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition"
                >
                  Más información
                </a>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl overflow-hidden shadow-md">
              <div className="h-48 bg-[url('https://images.pexels.com/photos/1370296/pexels-photo-1370296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  Diplomado en Teología
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Un programa intermedio que profundiza en el estudio de la teología sistemática y la historia de la iglesia.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Duración: 2 años
                </p>
                <a 
                  href="#" 
                  className="inline-block px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition"
                >
                  Más información
                </a>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl overflow-hidden shadow-md">
              <div className="h-48 bg-[url('https://images.pexels.com/photos/159740/library-la-trobe-study-students-159740.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center"></div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                  Licenciatura en Teología
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Un programa avanzado para aquellos que buscan una formación teológica completa para el ministerio.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Duración: 4 años
                </p>
                <a 
                  href="#" 
                  className="inline-block px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 transition"
                >
                  Más información
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-sky-500 to-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            ¿Listo para comenzar su formación teológica?
          </h2>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Inscríbase hoy y dé el primer paso en su viaje de crecimiento espiritual y académico.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/register" 
              className="inline-block px-6 py-3 bg-white text-sky-600 font-medium rounded-lg hover:bg-slate-100 transition"
            >
              Registrarse ahora
            </Link>
            <Link 
              to="/login" 
              className="inline-block px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;