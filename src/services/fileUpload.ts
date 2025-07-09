// Simulação de serviço de upload de arquivos
// Em produção, isso seria integrado com um serviço real como AWS S3, Cloudinary, etc.

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileUploadService {
  private baseUrl = '/uploads'; // Em produção seria uma URL real

  async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      // Simular processo de upload
      let loaded = 0;
      const total = file.size;
      
      const interval = setInterval(() => {
        loaded += Math.random() * (total / 10);
        if (loaded > total) loaded = total;
        
        const percentage = Math.round((loaded / total) * 100);
        
        if (onProgress) {
          onProgress({ loaded, total, percentage });
        }
        
        if (loaded >= total) {
          clearInterval(interval);
          
          // Simular URL do arquivo uploadado
          const fileExtension = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
          const url = `${this.baseUrl}/${fileName}`;
          
          resolve({
            url,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          });
        }
      }, 100);
      
      // Simular possível erro (5% de chance)
      if (Math.random() < 0.05) {
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Erro simulado de upload'));
        }, 2000);
      }
    });
  }

  async deleteFile(url: string): Promise<void> {
    // Simular exclusão de arquivo
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Arquivo deletado: ${url}`);
        resolve();
      }, 500);
    });
  }

  getFileTypeIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
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

export const fileUploadService = new FileUploadService();