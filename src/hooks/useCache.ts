import { useCallback } from 'react';
import { useCacheContext } from '../components/ui/performance/CacheProvider';

interface CacheHookOptions {
  defaultTtl?: number;
  enableLogging?: boolean;
}

export const useCache = () => {
  const cache = useCacheContext();
  
  const getCached = useCallback(<T>(key: string): T | null => {
    return cache.get<T>(key);
  }, [cache]);

  const setCached = useCallback(<T>(
    key: string, 
    data: T, 
    ttl?: number
  ): void => {
    cache.set(key, data, ttl);
  }, [cache]);

  const removeCached = useCallback((key: string): void => {
    cache.remove(key);
  }, [cache]);

  const clearCache = useCallback((): void => {
    cache.clear();
  }, [cache]);

  const hasCached = useCallback((key: string): boolean => {
    return cache.has(key);
  }, [cache]);

  const invalidatePattern = useCallback((pattern: string): void => {
    cache.invalidatePattern(pattern);
  }, [cache]);

  const getCacheSize = useCallback((): number => {
    return cache.size;
  }, [cache]);

  // Hook para manejar caché con validación de dependencias
  const useCachedValue = useCallback(<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    dependencies: any[] = [],
    ttl?: number
  ) => {
    const depsKey = `${key}_deps`;
    const currentDeps = JSON.stringify(dependencies);
    const cachedDeps = getCached<string>(depsKey);

    // Si las dependencias cambiaron, limpiar el caché
    if (cachedDeps && cachedDeps !== currentDeps) {
      removeCached(key);
      removeCached(depsKey);
    }

    const cachedValue = getCached<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }

    // Si no está en caché, ejecutar fetcher
    const result = fetcher();
    
    if (result instanceof Promise) {
      result.then((data) => {
        setCached(key, data, ttl);
        setCached(depsKey, currentDeps, ttl);
      });
      return null; // Retorna null mientras se resuelve la promesa
    } else {
      setCached(key, result, ttl);
      setCached(depsKey, currentDeps, ttl);
      return result;
    }
  }, [getCached, setCached, removeCached]);

  return {
    get: getCached,
    set: setCached,
    remove: removeCached,
    clear: clearCache,
    has: hasCached,
    invalidatePattern,
    size: getCacheSize,
    useCachedValue
  };
};

// Hook especializado para caché de API
export const useApiCache = (options: CacheHookOptions = {}) => {
  const { defaultTtl = 5 * 60 * 1000, enableLogging = false } = options;
  const cacheHook = useCache();

  const cacheApiCall = useCallback(async <T>(
    endpoint: string,
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T> => {
    const cacheKey = `api_${endpoint}`;
    const cachedData = cacheHook.get<T>(cacheKey);

    if (cachedData !== null) {
      if (enableLogging) {
        console.log(`Cache hit for ${endpoint}`);
      }
      return cachedData;
    }

    if (enableLogging) {
      console.log(`Cache miss for ${endpoint}, fetching...`);
    }

    try {
      const data = await fetcher();
      cacheHook.set(cacheKey, data, customTtl || defaultTtl);
      return data;
    } catch (error) {
      if (enableLogging) {
        console.error(`Error fetching ${endpoint}:`, error);
      }
      throw error;
    }
  }, [cacheHook, defaultTtl, enableLogging]);

  const invalidateApiCache = useCallback((pattern: string) => {
    cacheHook.invalidatePattern(`api_${pattern}`);
  }, [cacheHook]);

  return {
    ...cacheHook,
    cacheApiCall,
    invalidateApiCache
  };
};

export default useCache;
