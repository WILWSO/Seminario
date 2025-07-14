import { useState, useEffect, useCallback, useRef } from 'react';
import { useCache } from './useCache';

interface UseProgressiveLoadOptions<T> {
  fetcher: () => Promise<T>;
  cacheKey?: string;
  dependencies?: any[];
  delay?: number;
  cacheTtl?: number;
  enableCache?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseProgressiveLoadReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  refresh: () => void;
  hasCachedData: boolean;
}

export const useProgressiveLoad = <T>(
  options: UseProgressiveLoadOptions<T>
): UseProgressiveLoadReturn<T> => {
  const {
    fetcher,
    cacheKey,
    dependencies = [],
    delay = 0,
    cacheTtl = 5 * 60 * 1000, // 5 minutos
    enableCache = true,
    retryAttempts = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentRetry, setCurrentRetry] = useState(0);
  
  const cache = enableCache ? useCache() : null;
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar si hay datos en caché
  const hasCachedData = enableCache && cacheKey ? cache?.has(cacheKey) || false : false;

  // Función para cargar datos
  const loadData = useCallback(async (isRetry = false) => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Crear nuevo abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      // Verificar caché primero
      if (enableCache && cacheKey && cache && !isRetry) {
        const cachedData = cache.get<T>(cacheKey);
        if (cachedData !== null) {
          setData(cachedData);
          setIsLoading(false);
          if (onSuccess) onSuccess(cachedData);
          return;
        }
      }

      // Aplicar delay si está configurado
      if (delay > 0) {
        await new Promise(resolve => {
          timeoutRef.current = setTimeout(resolve, delay);
        });
      }

      // Verificar si fue cancelado durante el delay
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // Ejecutar fetcher
      const result = await fetcher();

      // Verificar si fue cancelado después del fetch
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // Guardar en caché si está habilitado
      if (enableCache && cacheKey && cache) {
        cache.set(cacheKey, result, cacheTtl);
      }

      setData(result);
      setCurrentRetry(0);
      if (onSuccess) onSuccess(result);

    } catch (err) {
      if (abortControllerRef.current.signal.aborted) {
        return; // Ignorar errores de requests cancelados
      }

      const error = err instanceof Error ? err : new Error('Error desconocido');
      
      if (currentRetry < retryAttempts) {
        // Intentar de nuevo después del delay
        setTimeout(() => {
          setCurrentRetry(prev => prev + 1);
          loadData(true);
        }, retryDelay * Math.pow(2, currentRetry)); // Exponential backoff
      } else {
        setError(error);
        if (onError) onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    fetcher,
    cacheKey,
    delay,
    cacheTtl,
    enableCache,
    cache,
    retryAttempts,
    retryDelay,
    currentRetry,
    onSuccess,
    onError
  ]);

  // Función para reintentar
  const retry = useCallback(() => {
    setCurrentRetry(0);
    loadData(true);
  }, [loadData]);

  // Función para refrescar (forzar nueva carga)
  const refresh = useCallback(() => {
    if (enableCache && cacheKey && cache) {
      cache.remove(cacheKey);
    }
    setCurrentRetry(0);
    loadData(true);
  }, [enableCache, cacheKey, cache, loadData]);

  // Efecto para cargar datos cuando cambien las dependencias
  useEffect(() => {
    loadData();

    return () => {
      // Cleanup: cancelar requests y timeouts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isLoading,
    error,
    retry,
    refresh,
    hasCachedData
  };
};

// Hook para carga progresiva de listas
export const useProgressiveList = <T>(
  options: UseProgressiveLoadOptions<T[]> & {
    pageSize?: number;
    loadNextPage?: (page: number, pageSize: number) => Promise<T[]>;
  }
) => {
  const baseHook = useProgressiveLoad(options);
  const [allItems, setAllItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { pageSize = 20, loadNextPage } = options;

  // Función para cargar más elementos
  const loadMore = useCallback(async () => {
    if (!loadNextPage || isLoadingMore || !hasNextPage) return;

    try {
      setIsLoadingMore(true);
      const nextPageItems = await loadNextPage(currentPage + 1, pageSize);
      
      if (nextPageItems.length === 0) {
        setHasNextPage(false);
      } else {
        setAllItems(prev => [...prev, ...nextPageItems]);
        setCurrentPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [loadNextPage, isLoadingMore, hasNextPage, currentPage, pageSize]);

  // Sincronizar con los datos base
  useEffect(() => {
    if (baseHook.data) {
      setAllItems(baseHook.data);
    }
  }, [baseHook.data]);

  return {
    ...baseHook,
    data: allItems,
    loadMore,
    isLoadingMore,
    hasNextPage,
    currentPage
  };
};

export default useProgressiveLoad;
