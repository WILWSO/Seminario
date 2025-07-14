// Tipos para lazy loading
interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

interface LazyImageOptions extends LazyLoadOptions {
  placeholder?: string;
  errorImage?: string;
  enableBlur?: boolean;
  quality?: number;
}

interface LazyComponentOptions extends LazyLoadOptions {
  fallback?: React.ComponentType;
  errorBoundary?: boolean;
  preload?: boolean;
}

// Clase para manejar intersección optimizada
class IntersectionManager {
  private observers: Map<string, IntersectionObserver> = new Map();
  private callbacks: Map<Element, Array<(entry: IntersectionObserverEntry) => void>> = new Map();

  // Obtener o crear observer con configuración específica
  getObserver(options: IntersectionObserverInit = {}): IntersectionObserver {
    const key = JSON.stringify(options);
    
    if (!this.observers.has(key)) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const callbacks = this.callbacks.get(entry.target);
          if (callbacks) {
            callbacks.forEach(callback => callback(entry));
          }
        });
      }, options);
      
      this.observers.set(key, observer);
    }
    
    return this.observers.get(key)!;
  }

  // Observar elemento con callback
  observe(
    element: Element, 
    callback: (entry: IntersectionObserverEntry) => void,
    options: IntersectionObserverInit = {}
  ): () => void {
    const observer = this.getObserver(options);
    
    if (!this.callbacks.has(element)) {
      this.callbacks.set(element, []);
    }
    
    this.callbacks.get(element)!.push(callback);
    observer.observe(element);
    
    // Retornar función de cleanup
    return () => {
      const callbacks = this.callbacks.get(element);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        
        if (callbacks.length === 0) {
          observer.unobserve(element);
          this.callbacks.delete(element);
        }
      }
    };
  }

  // Limpiar observers no utilizados
  cleanup(): void {
    for (const [key, observer] of this.observers.entries()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.callbacks.clear();
  }
}

// Instancia global del manager
export const intersectionManager = new IntersectionManager();

// Función para crear lazy loader de imágenes
export const createLazyImage = (options: LazyImageOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    delay = 0,
    placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGM0Y0RjYiLz48L3N2Zz4=',
    errorImage = placeholder,
    enableBlur = true,
    quality = 75
  } = options;

  return (element: HTMLImageElement, src: string) => {
    let isLoaded = false;
    let hasError = false;

    // Configurar imagen inicial
    element.src = placeholder;
    if (enableBlur) {
      element.style.filter = 'blur(5px)';
      element.style.transition = 'filter 0.3s ease';
    }

    const loadImage = () => {
      if (isLoaded || hasError) return;

      const img = new Image();
      
      img.onload = () => {
        if (delay > 0) {
          setTimeout(() => {
            element.src = src;
            if (enableBlur) {
              element.style.filter = 'none';
            }
            isLoaded = true;
          }, delay);
        } else {
          element.src = src;
          if (enableBlur) {
            element.style.filter = 'none';
          }
          isLoaded = true;
        }
      };

      img.onerror = () => {
        element.src = errorImage;
        hasError = true;
      };

      // Optimizar URL si es necesario
      let optimizedSrc = src;
      if (quality < 100 && src.includes('?')) {
        optimizedSrc += `&q=${quality}`;
      } else if (quality < 100) {
        optimizedSrc += `?q=${quality}`;
      }

      img.src = optimizedSrc;
    };

    // Configurar observer
    const cleanup = intersectionManager.observe(
      element,
      (entry) => {
        if (entry.isIntersecting) {
          loadImage();
          if (triggerOnce) {
            cleanup();
          }
        }
      },
      { threshold, rootMargin }
    );

    return cleanup;
  };
};

// Función para crear lazy loader de componentes
export const createLazyComponent = <T extends Record<string, any>>(
  importFunction: () => Promise<{ default: React.ComponentType<T> }>,
  options: LazyComponentOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    delay = 0,
    fallback,
    errorBoundary = true,
    preload = false
  } = options;

  let componentPromise: Promise<{ default: React.ComponentType<T> }> | null = null;
  let Component: React.ComponentType<T> | null = null;

  // Precargar si está habilitado
  if (preload) {
    componentPromise = importFunction();
    componentPromise.then(module => {
      Component = module.default;
    });
  }

  return (element: Element): Promise<React.ComponentType<T>> => {
    return new Promise((resolve, reject) => {
      const loadComponent = async () => {
        if (Component) {
          resolve(Component);
          return;
        }

        try {
          if (!componentPromise) {
            componentPromise = importFunction();
          }

          const module = await componentPromise;
          Component = module.default;
          
          if (delay > 0) {
            setTimeout(() => resolve(Component!), delay);
          } else {
            resolve(Component);
          }
        } catch (error) {
          reject(error);
        }
      };

      // Si ya está precargado, resolver inmediatamente
      if (Component) {
        resolve(Component);
        return;
      }

      // Configurar observer
      const cleanup = intersectionManager.observe(
        element,
        (entry) => {
          if (entry.isIntersecting) {
            loadComponent();
            if (triggerOnce) {
              cleanup();
            }
          }
        },
        { threshold, rootMargin }
      );
    });
  };
};

// Función para lazy loading de contenido de texto/HTML
export const createLazyContent = (options: LazyLoadOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    delay = 0
  } = options;

  return (
    element: Element,
    contentLoader: () => Promise<string> | string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const loadContent = async () => {
        try {
          const content = await contentLoader();
          
          if (delay > 0) {
            setTimeout(() => {
              resolve(content);
            }, delay);
          } else {
            resolve(content);
          }
        } catch (error) {
          reject(error);
        }
      };

      // Configurar observer
      const cleanup = intersectionManager.observe(
        element,
        (entry) => {
          if (entry.isIntersecting) {
            loadContent();
            if (triggerOnce) {
              cleanup();
            }
          }
        },
        { threshold, rootMargin }
      );
    });
  };
};

// Utilidad para batch loading de múltiples elementos
export const createBatchLazyLoader = <T>(
  items: Array<{ element: Element; loader: () => Promise<T> }>,
  options: LazyLoadOptions & { batchSize?: number } = {}
) => {
  const { batchSize = 5, ...lazyOptions } = options;
  const queue: Array<() => Promise<T>> = [];
  let processing = false;

  const processBatch = async () => {
    if (processing || queue.length === 0) return;
    
    processing = true;
    const batch = queue.splice(0, batchSize);
    
    try {
      await Promise.all(batch.map(loader => loader()));
    } catch (error) {
      console.error('Error in batch loading:', error);
    }
    
    processing = false;
    
    // Procesar siguiente batch si hay elementos en cola
    if (queue.length > 0) {
      setTimeout(processBatch, 100);
    }
  };

  items.forEach(({ element, loader }) => {
    intersectionManager.observe(
      element,
      (entry) => {
        if (entry.isIntersecting) {
          queue.push(loader);
          processBatch();
        }
      },
      {
        threshold: lazyOptions.threshold,
        rootMargin: lazyOptions.rootMargin
      }
    );
  });
};

// Utilidad para precargar recursos críticos
export const preloadCriticalResources = (resources: Array<{
  type: 'image' | 'script' | 'style' | 'font';
  href: string;
  crossorigin?: boolean;
}>) => {
  if (typeof document === 'undefined') return;

  resources.forEach(({ type, href, crossorigin }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    
    switch (type) {
      case 'image':
        link.as = 'image';
        break;
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'font':
        link.as = 'font';
        link.type = 'font/woff2';
        break;
    }
    
    if (crossorigin) {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  });
};

// Hook para cleanup automático
export const useLazyLoadingCleanup = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      intersectionManager.cleanup();
    });
  }
};

export default {
  createLazyImage,
  createLazyComponent,
  createLazyContent,
  createBatchLazyLoader,
  preloadCriticalResources,
  intersectionManager
};
