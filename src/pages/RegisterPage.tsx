import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, User, Mail, Phone, MapPin, Globe, FileText } from 'lucide-react';
import { supabase } from '../config/supabase';
import { RegisterFormData } from '../types/user';
import Logo from '../components/Logo';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    document_type: 'dni',
    document_number: '',
    whatsapp: '',
    social_networks: {},
    street_address: '',
    street_number: '',
    locality: '',
    department: '',
    province: '',
    postal_code: '',
    country: 'Argentina'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('social_')) {
      const socialField = name.replace('social_', '');
      setFormData(prev => ({
        ...prev,
        social_networks: {
          ...prev.social_networks,
          [socialField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.email && formData.password && formData.confirmPassword && 
                 formData.first_name && formData.last_name);
      case 2:
        return !!(formData.document_type && formData.document_number && formData.whatsapp);
      case 3:
        return !!(formData.street_address && formData.street_number && 
                 formData.locality && formData.province && formData.postal_code);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setError('');
    } else {
      setError('Por favor complete todos los campos obligatorios');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Crear perfil completo del usuario
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: formData.email,
              name: `${formData.first_name} ${formData.last_name}`,
              first_name: formData.first_name,
              last_name: formData.last_name,
              role: ['student'], // Garantir que sempre tenha pelo menos 1 role
              document_type: formData.document_type,
              document_number: formData.document_number,
              whatsapp: formData.whatsapp,
              social_networks: formData.social_networks,
              street_address: formData.street_address,
              street_number: formData.street_number,
              locality: formData.locality,
              department: formData.department,
              province: formData.province,
              postal_code: formData.postal_code,
              country: formData.country,
            },
          ]);

        if (profileError) throw profileError;

        // Redirigir al login con mensaje de sucesso
        navigate('/login?registered=true');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Por favor intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = [
    'Información básica',
    'Identificación y contacto',
    'Dirección'
  ];

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre *
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            value={formData.first_name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Apellido *
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            value={formData.last_name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Correo electrónico *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Contraseña *
        </label>
        <div className="mt-1 relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={formData.password}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Confirmar contraseña *
        </label>
        <div className="mt-1 relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5 text-slate-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="document_type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Tipo de documento *
          </label>
          <select
            id="document_type"
            name="document_type"
            required
            value={formData.document_type}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          >
            <option value="dni">DNI</option>
            <option value="passport">Pasaporte</option>
            <option value="cedula">Cédula</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="document_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Número de documento *
          </label>
          <input
            id="document_number"
            name="document_number"
            type="text"
            required
            value={formData.document_number}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          WhatsApp *
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          required
          value={formData.whatsapp}
          onChange={handleChange}
          placeholder="+54 9 11 1234-5678"
          className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Redes sociales (opcional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="social_facebook"
            type="url"
            placeholder="Facebook"
            value={formData.social_networks.facebook || ''}
            onChange={handleChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
          <input
            name="social_instagram"
            type="url"
            placeholder="Instagram"
            value={formData.social_networks.instagram || ''}
            onChange={handleChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
          <input
            name="social_twitter"
            type="url"
            placeholder="Twitter"
            value={formData.social_networks.twitter || ''}
            onChange={handleChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
          <input
            name="social_linkedin"
            type="url"
            placeholder="LinkedIn"
            value={formData.social_networks.linkedin || ''}
            onChange={handleChange}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="street_address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Dirección *
          </label>
          <input
            id="street_address"
            name="street_address"
            type="text"
            required
            value={formData.street_address}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="street_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Altura *
          </label>
          <input
            id="street_number"
            name="street_number"
            type="text"
            required
            value={formData.street_number}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="locality" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Localidad *
          </label>
          <input
            id="locality"
            name="locality"
            type="text"
            required
            value={formData.locality}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Departamento
          </label>
          <input
            id="department"
            name="department"
            type="text"
            value={formData.department}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="province" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Provincia *
          </label>
          <input
            id="province"
            name="province"
            type="text"
            required
            value={formData.province}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Código postal *
          </label>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            required
            value={formData.postal_code}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            País *
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            value={formData.country}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <User size={20} />;
      case 2: return <FileText size={20} />;
      case 3: return <MapPin size={20} />;
      default: return <User size={20} />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg"
      >
        <div className="text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
            Crear cuenta
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Complete el formulario para registrarse en SEMBRAR
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step 
                  ? 'bg-sky-600 border-sky-600 text-white' 
                  : 'border-slate-300 dark:border-slate-600 text-slate-400'
              }`}>
                {getStepIcon(step)}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-medium text-slate-800 dark:text-white">
            {stepTitles[currentStep - 1]}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-start">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="flex justify-between">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Anterior
              </button>
            )}
            
            <div className="flex-1" />
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
              >
                Siguiente
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </motion.button>
            )}
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            ¿Ya tiene una cuenta?{' '}
            <Link to="/login" className="font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;