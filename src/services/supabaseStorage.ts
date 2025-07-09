import { supabase } from '../config/supabase';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  path: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class SupabaseStorageService {
  private readonly BUCKET_NAME = 'lesson-files';

  async ensureBucketExists(): Promise<void> {
    try {
      // Check if bucket exists by trying to list files
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list('', { limit: 1 });

      if (error && error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not configured. Please contact administrator.');
      }
    } catch (error) {
      console.error('Storage bucket check failed:', error);
      throw new Error('Storage not available. Please try again later.');
    }
  }

  async uploadFile(
    file: File,
    folder: string = 'documents',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Ensure bucket exists before attempting upload
      await this.ensureBucketExists();

      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // Simular progresso (Supabase não fornece progresso real)
      if (onProgress) {
        const progressInterval = setInterval(() => {
          const progress = Math.min(90, Math.random() * 80 + 10);
          onProgress({
            loaded: (file.size * progress) / 100,
            total: file.size,
            percentage: Math.round(progress)
          });
        }, 200);

        setTimeout(() => clearInterval(progressInterval), 1000);
      }

      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error('Failed to generate public URL for uploaded file');
      }

      if (onProgress) {
        onProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100
        });
      }

      return {
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        path: filePath
      };
    } catch (error) {
      console.error('Erro no upload:', error);
      throw new Error('Erro ao fazer upload do arquivo. Tente novamente.');
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      throw new Error('Erro ao deletar arquivo.');
    }
  }

  getFileTypeIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📁';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isValidFileType(file: File, allowedTypes: string[]): boolean {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    return allowedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return type === fileExtension || file.type === type;
    });
  }
}


export const supabaseStorageService = new SupabaseStorageService();