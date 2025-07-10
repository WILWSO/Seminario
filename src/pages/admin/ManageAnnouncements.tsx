import { useState, useEffect, FormEvent, useRef } from 'react';
import { Bell, Plus, Edit, Trash, ArrowLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationSystem from '../../components/NotificationSystem';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author: string;
}

const ManageAnnouncements = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, userId?: string }>({ open: false }); // For delete confirmation dialog
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });

  // Reference for the title input to focus it when creating a new announcement
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select(`
            *,
            author:users!announcements_created_by_fkey(id, name, first_name, last_name)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setAnnouncements((data || []).map((ann: any) => ({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          created_at: ann.created_at,
          author: ann.author?.name ||
            `${ann.author?.first_name || ''} ${ann.author?.last_name || ''}`.trim() ||
            'Admin'
        })));
      } catch (error) {
        console.error('Error fetching announcements:', error);
        showError(
          'Error al cargar anuncios',
          'No se pudieron cargar los anuncios. Por favor, intente nuevamente.',
          5000
        );
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

    if (!user?.id) return; // Ensure user is authenticated

    try {
      setIsLoading(true);

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;

        setAnnouncements(prev =>
          prev.map(item =>
            item.id === editingId
              ? {
                ...item,
                title: formData.title,
                content: formData.content
              }
              : item
          )
        );

        showSuccess(
          '¡Anuncio actualizado!',
          'El anuncio se ha actualizado correctamente.',
          3000
        );

        setEditingId(null);
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert([{
            title: formData.title,
            content: formData.content,
            created_by: user.id
          }])
          .select(`
            *,
            author:users!announcements_created_by_fkey(id, name, first_name, last_name)
          `)
          .single();

        if (error) throw error;

        const newAnnouncement = {
          id: data.id,
          title: data.title,
          content: data.content,
          created_at: data.created_at,
          author: data.author?.name ||
            `${data.author?.first_name || ''} ${data.author?.last_name || ''}`.trim() ||
            user?.name || 'Admin'
        };

        setAnnouncements(prev => [newAnnouncement, ...prev]);

        showSuccess(
          '¡Anuncio creado!',
          'El anuncio se ha publicado correctamente.',
          3000
        );

        setIsCreating(false);
      }

      setFormData({ title: '', content: '' });

    } catch (error) {
      console.error('Error saving announcement:', error);
      showError(
        'Error al guardar',
        'No se pudo guardar el anuncio. Por favor, intente nuevamente.',
        5000
      );
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
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100); // Pequeno delay para garantir que o input já está renderizado
  };

  const handleDelete = async (id: string) => {
    //if (!confirm('¿Está seguro de que desea eliminar este anuncio?')) {
     // return;
    //}

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnnouncements(prev => prev.filter(item => item.id !== id));

      showSuccess(
        'Anuncio eliminado',
        'El anuncio se ha eliminado correctamente.',
        3000
      );
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError(
        'Error al eliminar',
        'No se pudo eliminar el anuncio. Por favor, intente nuevamente.',
        5000
      );
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
      <NotificationSystem
        notifications={notifications}
        onRemove={removeNotification}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Administrar anuncios
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Cree, edite y elimine anuncios para la comunidad del SEMINARIO
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
                ref={titleInputRef} // Focus input when creating a new announcement
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
                    onClick={() => setConfirmDialog({ open: true, announcementId: announcement.id })}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    title="Eliminar"
                  // onClick={() => handleDelete(announcement.id)}
                  // className="p-2 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition"
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

      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Confirmar eliminación</h2>
            <p className="mb-6 text-slate-600 dark:text-slate-300">
              ¿Está seguro de que desea eliminar este anúncio? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ open: false })}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    if (confirmDialog.announcementId) {
                      await handleDelete(confirmDialog.announcementId);
                    }
                  } finally {
                    setConfirmDialog({ open: false });
                  }
                }}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div> // end of Notification container   
  );
};

export default ManageAnnouncements;