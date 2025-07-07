import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Database, Mail, Shield, Globe, Bell, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../config/supabase';

interface SystemSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  allow_registration: boolean;
  require_email_verification: boolean;
  default_user_role: 'student' | 'teacher';
  max_file_size_mb: number;
  supported_file_types: string[];
  email_notifications: boolean;
  sms_notifications: boolean;
  maintenance_mode: boolean;
  announcement_banner: string;
  social_links: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

const Settings = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'SEMBRAR',
    site_description: 'Seminário Bíblico Reformado da Argentina',
    contact_email: 'info@sembrar.edu.ar',
    contact_phone: '+54 11 2601 1240',
    address: 'Buenos Aires, Argentina',
    allow_registration: true,
    require_email_verification: false,
    default_user_role: 'student',
    max_file_size_mb: 10,
    supported_file_types: ['pdf', 'doc', 'docx', 'mp4', 'mp3'],
    email_notifications: true,
    sms_notifications: false,
    maintenance_mode: false,
    announcement_banner: '',
    social_links: {}
  });

  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    storageUsed: '0 MB'
  });

  useEffect(() => {
    fetchSettings();
    fetchSystemStats();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      // En un sistema real, esto vendría de una tabla de configuraciones
      // Por ahora usamos valores por defecto
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const [usersResult, coursesResult, enrollmentsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('enrollments').select('id', { count: 'exact' })
      ]);

      setSystemStats({
        totalUsers: usersResult.count || 0,
        totalCourses: coursesResult.count || 0,
        totalEnrollments: enrollmentsResult.count || 0,
        storageUsed: '0 MB' // Esto requeriría una implementación específica
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('social_')) {
      const socialField = name.replace('social_', '');
      setSettings(prev => ({
        ...prev,
        social_links: {
          ...prev.social_links,
          [socialField]: value
        }
      }));
    } else if (name === 'supported_file_types') {
      setSettings(prev => ({
        ...prev,
        [name]: value.split(',').map(type => type.trim())
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // En un sistema real, aquí guardaríamos en una tabla de configuraciones
      // await supabase.from('system_settings').upsert(settings);
      
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: <SettingsIcon size={18} /> },
    { id: 'users', name: 'Usuarios', icon: <Users size={18} /> },
    { id: 'notifications', name: 'Notificaciones', icon: <Bell size={18} /> },
    { id: 'security', name: 'Seguridad', icon: <Shield size={18} /> },
    { id: 'system', name: 'Sistema', icon: <Database size={18} /> }
  ];

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Información del sitio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre del sitio
            </label>
            <input
              type="text"
              name="site_name"
              value={settings.site_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email de contacto
            </label>
            <input
              type="email"
              name="contact_email"
              value={settings.contact_email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Descripción del sitio
          </label>
          <textarea
            name="site_description"
            value={settings.site_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Teléfono de contacto
            </label>
            <input
              type="tel"
              name="contact_phone"
              value={settings.contact_phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dirección
            </label>
            <input
              type="text"
              name="address"
              value={settings.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Redes sociales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Facebook
            </label>
            <input
              type="url"
              name="social_facebook"
              value={settings.social_links.facebook || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Instagram
            </label>
            <input
              type="url"
              name="social_instagram"
              value={settings.social_links.instagram || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Twitter
            </label>
            <input
              type="url"
              name="social_twitter"
              value={settings.social_links.twitter || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              YouTube
            </label>
            <input
              type="url"
              name="social_youtube"
              value={settings.social_links.youtube || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Configuración de usuarios
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="allow_registration"
              checked={settings.allow_registration}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
              Permitir registro de nuevos usuarios
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="require_email_verification"
              checked={settings.require_email_verification}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
              Requerir verificación de email
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Rol por defecto para nuevos usuarios
            </label>
            <select
              name="default_user_role"
              value={settings.default_user_role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            >
              <option value="student">Estudiante</option>
              <option value="teacher">Profesor</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Configuración de archivos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tamaño máximo de archivo (MB)
            </label>
            <input
              type="number"
              name="max_file_size_mb"
              value={settings.max_file_size_mb}
              onChange={handleChange}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipos de archivo permitidos (separados por coma)
            </label>
            <input
              type="text"
              name="supported_file_types"
              value={settings.supported_file_types.join(', ')}
              onChange={handleChange}
              placeholder="pdf, doc, docx, mp4, mp3"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Configuración de notificaciones
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="email_notifications"
              checked={settings.email_notifications}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
              Habilitar notificaciones por email
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="sms_notifications"
              checked={settings.sms_notifications}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
              Habilitar notificaciones por SMS
            </label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Banner de anuncios
        </h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Mensaje del banner (dejar vacío para ocultar)
          </label>
          <textarea
            name="announcement_banner"
            value={settings.announcement_banner}
            onChange={handleChange}
            rows={2}
            placeholder="Mensaje importante para mostrar en la parte superior del sitio"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Configuración de seguridad
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="maintenance_mode"
              checked={settings.maintenance_mode}
              onChange={handleChange}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
            />
            <label className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
              Modo de mantenimiento
            </label>
          </div>
          
          {settings.maintenance_mode && (
            <div className="ml-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ El modo de mantenimiento impedirá que los usuarios accedan al sitio. Solo los administradores podrán acceder.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Información de la base de datos
        </h3>
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-md">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Para configuraciones avanzadas de seguridad, acceda directamente al panel de Supabase.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Estadísticas del sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-sky-50 dark:bg-sky-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="text-sky-600 dark:text-sky-400 mr-2" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total de usuarios</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-white">{systemStats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <SettingsIcon className="text-emerald-600 dark:text-emerald-400 mr-2" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total de cursos</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-white">{systemStats.totalCourses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Globe className="text-purple-600 dark:text-purple-400 mr-2" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Inscripciones</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-white">{systemStats.totalEnrollments}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
            <div className="flex items-center">
              <Database className="text-amber-600 dark:text-amber-400 mr-2" size={20} />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Almacenamiento</p>
                <p className="text-xl font-semibold text-slate-800 dark:text-white">{systemStats.storageUsed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-4">
          Información del sistema
        </h3>
        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-md space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Versión de la aplicación:</span>
            <span className="text-sm font-medium text-slate-800 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Base de datos:</span>
            <span className="text-sm font-medium text-slate-800 dark:text-white">Supabase PostgreSQL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Última actualización:</span>
            <span className="text-sm font-medium text-slate-800 dark:text-white">{new Date().toLocaleDateString('es-AR')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Configuración del sistema
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Administre la configuración general del sistema
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition disabled:opacity-50"
        >
          <Save size={18} className="mr-2" />
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'system' && renderSystemTab()}
        </div>
      </div>
    </div>
  );
};

export default Settings;