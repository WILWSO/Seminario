import { useState, useEffect, FormEvent } from 'react';
import { Bell, Plus, Edit, Trash, ArrowLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { announcementService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
  author: string;
}

const ManageAnnouncements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementService.getAnnouncements(10);
        setAnnouncements((data || []).map((ann: any) => ({
          id: parseInt(ann.id),
          title: ann.title,
          content: ann.content,
          created_at: ann.created_at,
          author: ann.author?.name || 'Admin'
        })));
      } catch (error) {
        console.error('Error fetching announcements:', error);
        // Set empty array on error
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnnouncements();
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      if (editingId) {
        await announcementService.updateAnnouncement(editingId.toString(), formData.title, formData.content);
        setAnnouncements(prev => 
          prev.map(item => 
            item.id === editingId 
              ? { ...item, title: formData.title, content: formData.content } 
              : item
          )
        );
        
        setEditingId(null);
      } else {
        const newAnn = await announcementService.createAnnouncement(
          formData.title, 
          formData.content, 
          user.id
        );
        
        const newAnnouncement = {
          id: parseInt(newAnn.id),
          title: newAnn.title,
          content: newAnn.content,
          created_at: newAnn.created_at,
          author: user.name
        };
        
        setAnnouncements(prev => [newAnnouncement, ...prev]);
        setIsCreating(false);
      }
      
      setFormData({ title: '', content: '' });
    } catch (error) {
      console.error('Error saving announcement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content
    });
    setEditingId(announcement.id);
    setIsCreating(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar este anuncio?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      await announcementService.deleteAnnouncement(id.toString());
      setAnnouncements(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelForm = () => {
    setFormData({ title: '', content: '' });
    setIsCreating(false);
    setEditingId(null);
  };

  if (isLoading && announcements.length === 0) {
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
            Administrar anuncios
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Cree, edite y elimine anuncios para la comunidad de SEMBRAR
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <Plus size={18} className="mr-2" />
            Nuevo anuncio
          </button>
        )}
      </div>
      
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {editingId ? 'Editar anuncio' : 'Crear nuevo anuncio'}
            </h2>
            <button
              onClick={cancelForm}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Título
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                placeholder="Título del anuncio"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Contenido
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                placeholder="Contenido del anuncio"
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
                disabled={isLoading}
              >
                <Save size={18} className="mr-2" />
                {editingId ? 'Guardar cambios' : 'Publicar anuncio'}
              </button>
            </div>
          </form>
        </motion.div>
      )}
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Bell size={18} className="text-sky-600 dark:text-sky-400 mr-2" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                      {announcement.title}
                    </h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">
                    {announcement.content}
                  </p>
                  <div className="flex items-center text-sm text-slate-500 dark:text-slate-500">
                    <span>Publicado por {announcement.author}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(announcement.created_at).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4 md:mt-0">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {announcements.length === 0 && (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            No hay anuncios disponibles. Cree uno nuevo haciendo clic en el botón "Nuevo anuncio".
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAnnouncements;