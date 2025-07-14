import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl?: number) => void;
  remove: (key: string) => void;
  clear: (key?: string) => void;
  has: (key: string) => boolean;
  size: number;
  invalidate: (pattern: string) => void;
  invalidatePattern: (pattern: string) => void;
}

interface CacheProviderProps {
  children: ReactNode;
  defaultTTL?: number;
  maxSize?: number;
}

const CacheContext = createContext<CacheContextType | null>(null);

export const CacheProvider: React.FC<CacheProviderProps> = ({
  children,
  defaultTTL = 5 * 60 * 1000, // 5 minutes
  maxSize = 100
}) => {
  const cache = useMemo(() => new Map<string, CacheEntry>(), []);

  // Funciones separadas para evitar conflictos con JSX
  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.data as T;
  }, [cache]);

  const set = useCallback(<T,>(key: string, data: T, ttl = defaultTTL): void => {
    // Simple LRU: remove oldest if at max size
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, [cache, defaultTTL, maxSize]);

  const clear = useCallback((key?: string): void => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }, [cache]);

  const remove = useCallback((key: string): void => {
    cache.delete(key);
  }, [cache]);

  const invalidate = useCallback((pattern: string): void => {
    const regex = new RegExp(pattern);
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  }, [cache]);

  const has = useCallback((key: string): boolean => {
    const entry = cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return false;
    }

    return true;
  }, [cache]);

  const contextValue = useMemo<CacheContextType>(() => ({
    get,
    set,
    remove,
    clear,
    has,
    size: cache.size,
    invalidate,
    invalidatePattern: invalidate
  }), [get, set, remove, clear, has, cache.size, invalidate]);

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
};

export const useCacheContext = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCacheContext must be used within a CacheProvider');
  }
  return context;
};

export default CacheProvider;
