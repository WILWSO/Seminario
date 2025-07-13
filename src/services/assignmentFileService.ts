import { supabase } from '../config/supabase';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  originalName?: string;
  size?: number;
  type?: string;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class AssignmentFileService {
  private static readonly BUCKET_NAME = 'assignment-files';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  private static readonly ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  /**
   * Valida si un archivo es válido para subir
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Validar tipo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido. Tipos permitidos: PDF, Word, PowerPoint, Excel, Texto`
      };
    }

    return { valid: true };
  }

  /**
   * Genera la ruta del archivo en el bucket
   */
  static generateFilePath(studentId: string, assignmentId: string, filename: string): string {
    // Limpiar el nombre del archivo
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const finalFilename = `${timestamp}_${cleanFilename}`;
    
    return `${studentId}/${assignmentId}/${finalFilename}`;
  }

  /**
   * Sube un archivo al bucket de evaluaciones
   */
  static async uploadFile(
    file: File,
    studentId: string,
    assignmentId: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileUploadResult> {
    try {
      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generar ruta
      const filePath = this.generateFilePath(studentId, assignmentId, file.name);

      // Simular progreso si se proporciona callback
      if (onProgress) {
        onProgress({ loaded: 0, total: file.size, percentage: 0 });
      }

      // Subir archivo
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // No sobrescribir archivos existentes
        });

      if (error) {
        console.error('Error uploading file:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Simular progreso completado
      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      // Obtener URL del archivo (para verificación)
      const { data: urlData } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60); // URL válida por 1 hora

      return {
        success: true,
        path: filePath,
        url: urlData?.signedUrl,
        originalName: file.name,
        size: file.size,
        type: file.type
      };

    } catch (error) {
      console.error('Error in uploadFile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtiene una URL firmada para descargar un archivo
   */
  static async getDownloadUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('Error getting download URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in getDownloadUrl:', error);
      return null;
    }
  }

  /**
   * Lista archivos de un estudiante para una evaluación específica
   */
  static async listFiles(studentId: string, assignmentId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`${studentId}/${assignmentId}`);

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      return data.map(file => `${studentId}/${assignmentId}/${file.name}`);
    } catch (error) {
      console.error('Error in listFiles:', error);
      return [];
    }
  }

  /**
   * Elimina un archivo del bucket
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return false;
    }
  }

  /**
   * Obtiene información de un archivo
   */
  static async getFileInfo(filePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(filePath.substring(0, filePath.lastIndexOf('/')));

      if (error) {
        console.error('Error getting file info:', error);
        return null;
      }

      const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
      const fileInfo = data.find(file => file.name === filename);

      return fileInfo || null;
    } catch (error) {
      console.error('Error in getFileInfo:', error);
      return null;
    }
  }
}

export default AssignmentFileService;
