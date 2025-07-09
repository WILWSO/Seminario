import React, { useState, useRef } from 'react';
import { Upload, File, X, Check, AlertCircle, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fileUploadService, UploadResult, UploadProgress } from '../services/fileUpload';

interface FileUploadProps {
  onFileSelect: (result: UploadResult) => void;
  onFileRemove?: () => void;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  currentFile?: string;
  currentFileName?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  acceptedTypes = ['image/*', 'video/*', 'application/pdf', '.doc', '.docx', '.ppt', '.pptx'],
  maxSizeMB = 50,
  currentFile,
  currentFileName,
  disabled = false,
  label = 'Subir archivo',
  description = 'Arrastra un archivo aquí o haz clic para seleccionar'
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `El archivo es demasiado grande. Máximo ${maxSizeMB}MB permitido.`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return type === fileExtension || file.type === type;
    });

    if (!isValidType) {
      return 'Tipo de archivo no permitido.';
    }

    return null;
  };

  const handleFile = async (file: File) => {
    setError('');
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });
    
    try {
      const result = await fileUploadService.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });
      
      onFileSelect(result);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Error al subir el archivo. Por favor, intente nuevamente.');
      setUploadStatus('error');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-sky-500" />
            <div className="w-32 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
              <div 
                className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{uploadProgress.percentage}%</span>
          </div>
        );
      case 'success':
        return <Check className="text-green-500" size={24} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={24} />;
      default:
        return <Upload className="text-slate-400" size={24} />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Subiendo archivo...';
      case 'success':
        return '¡Archivo subido exitosamente!';
      case 'error':
        return error || 'Error al subir archivo';
      default:
        return currentFile ? 'Archivo actual cargado' : description;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success':
        return 'border-green-300 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-300 bg-red-50 dark:bg-red-900/20';
      case 'uploading':
        return 'border-sky-300 bg-sky-50 dark:bg-sky-900/20';
      default:
        return dragActive 
          ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20' 
          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      
      <motion.div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${getStatusColor()} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center space-y-2">
          {getStatusIcon()}
          {uploadStatus !== 'uploading' && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {getStatusText()}
            </p>
          )}
          {uploadStatus === 'idle' && !currentFile && (
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p>Tipos permitidos: Imágenes, Videos, PDF, Word, PowerPoint</p>
              <p>Tamaño máximo: {maxSizeMB}MB</p>
            </div>
          )}
        </div>
      </motion.div>

      {currentFile && uploadStatus === 'idle' && (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-md">
          <div className="flex items-center space-x-2">
            <span className="text-lg">
              {fileUploadService.getFileTypeIcon(currentFile)}
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {currentFileName || currentFile.split('/').pop() || 'Archivo actual'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={currentFile}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Ver archivo
            </a>
            {onFileRemove && (
              <button
                onClick={handleRemoveFile}
                className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                title="Eliminar archivo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;