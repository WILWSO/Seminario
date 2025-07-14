interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private defaultTtl: number;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(maxSize = 100, defaultTtl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  // Obtener valor del caché
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Verificar si ha expirado
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data as T;
  }

  // Establecer valor en el caché
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTtl,
      accessCount: 0,
      lastAccessed: now
    };

    // Si el caché está lleno, hacer espacio
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    this.cache.set(key, entry);
  }

  // Verificar si existe una clave
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Eliminar entrada específica
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Limpiar todo el caché
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  // Invalidar entradas que coincidan con un patrón
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  // Limpiar entradas expiradas
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Política de desalojo: LFU (Least Frequently Used)
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let minAccessCount = Infinity;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minAccessCount || 
          (entry.accessCount === minAccessCount && entry.lastAccessed < oldestAccess)) {
        minAccessCount = entry.accessCount;
        oldestAccess = entry.lastAccessed;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  // Obtener estadísticas del caché
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses
    };
  }

  // Obtener todas las claves
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Obtener tamaño actual
  get size(): number {
    return this.cache.size;
  }

  // Serializar caché para persistencia
  serialize(): string {
    const data = Array.from(this.cache.entries());
    return JSON.stringify({
      data,
      stats: this.stats,
      timestamp: Date.now()
    });
  }

  // Deserializar caché desde persistencia
  deserialize(serializedData: string): void {
    try {
      const { data, stats, timestamp } = JSON.parse(serializedData);
      const now = Date.now();

      this.cache.clear();
      this.stats = stats || { hits: 0, misses: 0 };

      // Restaurar solo entradas no expiradas
      for (const [key, entry] of data) {
        if (now - entry.timestamp <= entry.ttl) {
          this.cache.set(key, entry);
        }
      }
    } catch (error) {
      console.warn('Error al deserializar caché:', error);
    }
  }

  // Método para obtener múltiples valores
  getMany<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    
    for (const key of keys) {
      result.set(key, this.get<T>(key));
    }
    
    return result;
  }

  // Método para establecer múltiples valores
  setMany<T>(entries: Array<[string, T, number?]>): void {
    for (const [key, value, ttl] of entries) {
      this.set(key, value, ttl);
    }
  }
}

// Instancia global del caché
export const globalCache = new AdvancedCache(200, 10 * 60 * 1000); // 200 items, 10 minutos TTL

// Funciones de utilidad para el caché
export const cache = {
  // Métodos básicos
  get: <T>(key: string) => globalCache.get<T>(key),
  set: <T>(key: string, data: T, ttl?: number) => globalCache.set(key, data, ttl),
  has: (key: string) => globalCache.has(key),
  delete: (key: string) => globalCache.delete(key),
  clear: () => globalCache.clear(),
  
  // Métodos avanzados
  invalidatePattern: (pattern: string) => globalCache.invalidatePattern(pattern),
  cleanup: () => globalCache.cleanup(),
  getStats: () => globalCache.getStats(),
  
  // Métodos de persistencia
  save: () => globalCache.serialize(),
  load: (data: string) => globalCache.deserialize(data),
  
  // Métodos batch
  getMany: <T>(keys: string[]) => globalCache.getMany<T>(keys),
  setMany: <T>(entries: Array<[string, T, number?]>) => globalCache.setMany(entries)
};

// Hook personalizado para caché con auto-cleanup
export const setupCacheCleanup = (intervalMs = 60000) => {
  const cleanup = () => {
    const cleaned = globalCache.cleanup();
    if (process.env.NODE_ENV === 'development' && cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  };

  const interval = setInterval(cleanup, intervalMs);
  
  return () => clearInterval(interval);
};

// Decorador para funciones con caché automático
export const withCache = <T extends (...args: any[]) => any>(
  fn: T,
  getCacheKey: (...args: Parameters<T>) => string,
  ttl?: number
): T => {
  return ((...args: Parameters<T>) => {
    const cacheKey = getCacheKey(...args);
    const cached = globalCache.get(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    const result = fn(...args);
    
    // Si es una promesa, manejar de forma asíncrona
    if (result instanceof Promise) {
      return result.then(data => {
        globalCache.set(cacheKey, data, ttl);
        return data;
      });
    }
    
    globalCache.set(cacheKey, result, ttl);
    return result;
  }) as T;
};

export default globalCache;
