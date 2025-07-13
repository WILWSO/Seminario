import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AssignmentFileService, { FileUploadResult, FileUploadProgress } from '../services/assignmentFileService';

interface FileUploadComponentProps {
  assignmentId: string;
  studentId: string;
  onUploadSuccess?: (result: FileUploadResult) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: FileUploadProgress;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  result?: FileUploadResult;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({
  assignmentId,
  studentId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 5,
  disabled = false
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validar número máximo de archivos
    if (uploadingFiles.length + fileArray.length > maxFiles) {
      if (onUploadError) {
        onUploadError(`Máximo ${maxFiles} archivos permitidos`);
      }
      return;
    }

    // Procesar cada archivo
    fileArray.forEach(file => {
      // Validar archivo
      const validation = AssignmentFileService.validateFile(file);
      if (!validation.valid) {
        if (onUploadError) {
          onUploadError(validation.error || 'Archivo inválido');
        }
        return;
      }

      // Agregar archivo a la lista de subida
      const uploadingFile: UploadingFile = {
        file,
        progress: { loaded: 0, total: file.size, percentage: 0 },
        status: 'uploading'
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      // Iniciar subida
      uploadFile(uploadingFile);
    });
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    try {
      const result = await AssignmentFileService.uploadFile(
        uploadingFile.file,
        studentId,
        assignmentId,
        (progress) => {
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file.name === uploadingFile.file.name 
                ? { ...f, progress }
                : f
            )
          );
        }
      );

      if (result.success) {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file.name === uploadingFile.file.name 
              ? { ...f, status: 'success', result }
              : f
          )
        );
        
        if (onUploadSuccess) {
          onUploadSuccess(result);
        }
      } else {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file.name === uploadingFile.file.name 
              ? { ...f, status: 'error', error: result.error }
              : f
          )
        );
        
        if (onUploadError) {
          onUploadError(result.error || 'Error desconocido');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file.name === uploadingFile.file.name 
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );
      
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const removeFile = (fileName: string) => {
    setUploadingFiles(prev => prev.filter(f => f.file.name !== fileName));
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
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('powerpoint')) return '📊';
    if (fileType.includes('excel')) return '📈';
    return '📄';
  };

  return (
    <div className="w-full">
      {/* Área de subida */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : disabled
            ? 'border-gray-300 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className={`mx-auto h-12 w-12 mb-4 ${
            disabled ? 'text-gray-400' : 'text-gray-500'
          }`} />
          
          <div className="mb-4">
            <p className={`text-lg font-medium ${
              disabled ? 'text-gray-400' : 'text-gray-900 dark:text-white'
            }`}>
              Subir archivo de evaluación
            </p>
            <p className={`text-sm mt-1 ${
              disabled ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              Arrastra y suelta tu archivo aquí, o haz clic para seleccionar
            </p>
          </div>
          
          <button
            onClick={openFileDialog}
            disabled={disabled}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Seleccionar archivo
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
            multiple
            className="hidden"
            disabled={disabled}
            aria-label="Seleccionar archivos para subir"
          />
        </div>
        
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <p>Tipos permitidos: PDF, Word, PowerPoint, Excel, Texto</p>
          <p>Tamaño máximo: 50MB por archivo</p>
          <p>Máximo {maxFiles} archivos</p>
        </div>
      </div>

      {/* Lista de archivos subiendo/subidos */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4 space-y-2"
          >
            {uploadingFiles.map((uploadingFile, index) => (
              <motion.div
                key={`${uploadingFile.file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getFileIcon(uploadingFile.file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {uploadingFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(uploadingFile.file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {uploadingFile.status === 'uploading' && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {uploadingFile.progress.percentage.toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    {uploadingFile.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    
                    {uploadingFile.status === 'error' && (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-xs text-red-600">
                          {uploadingFile.error}
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => removeFile(uploadingFile.file.name)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Eliminar archivo"
                      aria-label="Eliminar archivo"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadingFile.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadComponent;
