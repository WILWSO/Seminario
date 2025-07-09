import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Save, X, Link as LinkIcon, FileText, Video, Upload, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../config/supabase';
import { supabaseStorageService, UploadResult, UploadProgress } from '../services/supabaseStorage';

interface LessonContent {
  id: string;
  type: 'document' | 'link' | 'video';
  title: string;
  description?: string;
  content_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  order: number;
}

interface LessonContentManagerProps {
  lessonId: string;
  onContentChange?: () => void;
}

const LessonContentManager: React.FC<LessonContentManagerProps> = ({
  lessonId,
  onContentChange
}) => {
  const [contents, setContents] = useState<LessonContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingContent, setEditingContent] = useState<LessonContent | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    type: 'document' as 'document' | 'link' | 'video',
    title: '',
    description: '',
    content_url: '',
    file: null as File | null
  });

  // Maximum file size: 50MB
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

  useEffect(() => {
    fetchContents();
  }, [lessonId]);

  const fetchContents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lesson_contents')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order');

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching lesson contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous upload errors
    setUploadError(null);
    
    // Validate file size for document uploads
    if (formData.type === 'document' && formData.file) {
      if (formData.file.size > MAX_FILE_SIZE) {
        setUploadError(`El archivo es demasiado grande. El tamaño máximo permitido es ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB.`);
        return;
      }
    }
    
    try {
      setIsLoading(true);
      let contentUrl = formData.content_url;
      let fileName = '';
      let fileSize = 0;
      let fileType = '';

      // Upload de arquivo para documentos
      if (formData.type === 'document' && formData.file) {
        const uploadResult = await supabaseStorageService.uploadFile(
          formData.file,
          'lesson-documents',
          setUploadProgress
        );
        
        contentUrl = uploadResult.url;
        fileName = uploadResult.fileName;
        fileSize = uploadResult.fileSize;
        fileType = uploadResult.fileType;
      }

      const contentData = {
        lesson_id: lessonId,
        type: formData.type,
        title: formData.title,
        description: formData.description || null,
        content_url: contentUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        file_type: fileType || null,
        order: editingContent ? editingContent.order : contents.length + 1
      };

      if (editingContent) {
        const { error } = await supabase
          .from('lesson_contents')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_contents')
          .insert([contentData]);

        if (error) throw error;
      }

      // Reset form
      setFormData({
        type: 'document',
        title: '',
        description: '',
        content_url: '',
        file: null
      });
      setIsCreating(false);
      setEditingContent(null);
      setUploadProgress(null);
      setUploadError(null);
      
      await fetchContents();
      if (onContentChange) onContentChange();
      
    } catch (error) {
      console.error('Error saving content:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Storage bucket not configured')) {
        setUploadError('El sistema de almacenamiento no está configurado. Por favor contacte al administrador.');
      } else if (errorMessage.includes('Storage not available')) {
        setUploadError('El servicio de almacenamiento no está disponible. Intente nuevamente más tarde.');
      } else {
        setUploadError('Error al guardar el contenido: ' + errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (content: LessonContent) => {
    setFormData({
      type: content.type,
      title: content.title,
      description: content.description || '',
      content_url: content.content_url || '',
      file: null
    });
    setEditingContent(content);
    setIsCreating(true);
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este contenido?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson_contents')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
      
      await fetchContents();
      if (onContentChange) onContentChange();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Error al eliminar el contenido: ' + (error as Error).message);
    }
  };

  const cancelForm = () => {
    setFormData({
      type: 'document',
      title: '',
      description: '',
      content_url: '',
      file: null
    });
    setIsCreating(false);
    setEditingContent(null);
    setUploadProgress(null);
    setUploadError(null);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} className="text-red-600 dark:text-red-400" />;
      case 'link':
        return <LinkIcon size={16} className="text-blue-600 dark:text-blue-400" />;
      case 'document':
        return <FileText size={16} className="text-green-600 dark:text-green-400" />;
      default:
        return <FileText size={16} />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'link': return 'Enlace';
      case 'document': return 'Documento';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-slate-800 dark:text-white">
          Contenido de la lección ({contents.length})
        </h4>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-3 py-1 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
          >
            <Plus size={14} className="mr-1" />
            Agregar contenido
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50 dark:bg-slate-750 rounded-lg p-4 border"
          >
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium text-slate-800 dark:text-white">
                {editingContent ? 'Editar contenido' : 'Agregar nuevo contenido'}
              </h5>
              <button
                onClick={cancelForm}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de contenido *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="document">Documento (archivo)</option>
                    <option value="video">Video (URL)</option>
                    <option value="link">Enlace externo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              {/* Content Input based on type */}
              {formData.type === 'document' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Archivo *
                  </label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setFormData({ ...formData, file });
                        setUploadError(null); // Clear error when new file is selected
                      }}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                      className="w-full"
                      required={!editingContent}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Formatos permitidos: PDF, Word, PowerPoint, Excel, Imágenes (máx. {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB)
                    </p>
                  </div>
                  
                  {uploadError && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                    </div>
                  )}
                  
                  {uploadProgress && (
                    <div className="mt-2">
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>Subiendo archivo...</span>
                        <span>{uploadProgress.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-1">
                        <div 
                          className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {formData.type === 'video' ? 'URL del video *' : 'URL del enlace *'}
                  </label>
                  <input
                    type="url"
                    value={formData.content_url}
                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                    required
                    placeholder={
                      formData.type === 'video' 
                        ? 'https://youtube.com/watch?v=...' 
                        : 'https://ejemplo.com'
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                 disabled={isLoading || !!uploadProgress || !!uploadError}
                  className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition disabled:opacity-50"
                >
                  {editingContent ? 'Actualizar' : 'Agregar'} contenido
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contents List */}
      <div className="space-y-2">
        {contents.map((content, index) => (
          <motion.div
            key={content.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700">
                {getContentIcon(content.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h6 className="font-medium text-slate-800 dark:text-white truncate">
                    {content.title}
                  </h6>
                  <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                    {getContentTypeLabel(content.type)}
                  </span>
                </div>
                
                {content.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {content.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {content.file_name && (
                    <span>📎 {content.file_name}</span>
                  )}
                  {content.file_size && (
                    <span>{supabaseStorageService.formatFileSize(content.file_size)}</span>
                  )}
                  {content.content_url && (
                    <a
                      href={content.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center"
                    >
                      <ExternalLink size={12} className="mr-1" />
                      Ver contenido
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEdit(content)}
                className="p-1 text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition"
                title="Editar contenido"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDelete(content.id)}
                className="p-1 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition"
                title="Eliminar contenido"
              >
                <Trash size={16} />
              </button>
            </div>
          </motion.div>
        ))}

        {contents.length === 0 && !isLoading && (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400">
            <FileText size={24} className="mx-auto mb-2 opacity-50" />
            <p>No hay contenido agregado a esta lección.</p>
            <p className="text-sm">Haga clic en "Agregar contenido" para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonContentManager;