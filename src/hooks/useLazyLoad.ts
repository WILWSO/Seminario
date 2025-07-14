import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  enabled?: boolean;
}

interface UseLazyLoadReturn {
  isVisible: boolean;
  ref: React.RefObject<HTMLElement>;
  hasBeenVisible: boolean;
}

export const useLazyLoad = (options: UseLazyLoadOptions = {}): UseLazyLoadReturn => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    delay = 0,
    enabled = true
  } = options;

  const [isVisible, setIsVisible] = useState(!enabled);
  const [hasBeenVisible, setHasBeenVisible] = useState(!enabled);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled) return;
    
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              setHasBeenVisible(true);
              if (triggerOnce) {
                observer.unobserve(element);
              }
            }, delay);
          } else {
            setIsVisible(true);
            setHasBeenVisible(true);
            if (triggerOnce) {
              observer.unobserve(element);
            }
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, delay, enabled]);

  return { isVisible, ref, hasBeenVisible };
};

// Hook para lazy loading de imágenes
export const useLazyImage = (src: string, options: UseLazyLoadOptions = {}) => {
  const { isVisible, ref } = useLazyLoad(options);
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && src && !imageSrc) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setError('Error al cargar la imagen');
      };
      
      img.src = src;
    }
  }, [isVisible, src, imageSrc]);

  return {
    ref,
    src: imageSrc,
    isLoaded,
    error,
    isVisible
  };
};

// Hook para lazy loading de componentes
export const useLazyComponent = <T extends any[]>(
  componentLoader: () => Promise<{ default: React.ComponentType<any> }>,
  dependencies: T = [] as unknown as T,
  options: UseLazyLoadOptions = {}
) => {
  const { isVisible, ref, hasBeenVisible } = useLazyLoad(options);
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { default: LoadedComponent } = await componentLoader();
      setComponent(() => LoadedComponent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el componente');
    } finally {
      setIsLoading(false);
    }
  }, [componentLoader, Component, isLoading]);

  useEffect(() => {
    if (isVisible && !Component) {
      loadComponent();
    }
  }, [isVisible, Component, loadComponent]);

  // Recargar componente si las dependencias cambian
  useEffect(() => {
    if (hasBeenVisible && Component) {
      setComponent(null);
      loadComponent();
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ref,
    Component,
    isLoading,
    error,
    isVisible,
    reload: loadComponent
  };
};

export default useLazyLoad;
