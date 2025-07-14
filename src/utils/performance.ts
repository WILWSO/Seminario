// Tipos para métricas de performance
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: Record<string, any>;
}

interface ComponentMetrics {
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastUpdate: number;
}

// Clase para manejar métricas de performance
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private componentMetrics: Map<string, ComponentMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupObservers();
  }

  // Configurar observers de performance
  private setupObservers() {
    if (typeof window === 'undefined') return;

    try {
      // Observer para navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordMetric('navigation', entry.duration, {
              type: entry.entryType,
              name: entry.name
            });
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Observer para resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.duration > 100) {
            this.recordMetric('slow_resource', entry.duration, {
              name: entry.name,
              size: (entry as any).transferSize || 0
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observer para long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('long_task', entry.duration, {
            startTime: entry.startTime
          });
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  // Registrar métrica personalizada
  recordMetric(name: string, value: number, context?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Mantener solo las últimas 100 métricas por tipo
    if (metrics.length > 100) {
      metrics.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance metric: ${name} = ${value.toFixed(2)}ms`, context);
    }
  }

  // Medir tiempo de ejecución de una función
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric(`function_${name}`, duration);
    return result;
  }

  // Medir tiempo de ejecución de una función asíncrona
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.recordMetric(`async_function_${name}`, duration);
    return result;
  }

  // Registrar métricas de componente React
  recordComponentMetric(componentName: string, type: 'render' | 'mount' | 'update', duration: number) {
    if (!this.componentMetrics.has(componentName)) {
      this.componentMetrics.set(componentName, {
        renderTime: 0,
        mountTime: 0,
        updateCount: 0,
        lastUpdate: Date.now()
      });
    }

    const metrics = this.componentMetrics.get(componentName)!;
    
    switch (type) {
      case 'render':
        metrics.renderTime = duration;
        break;
      case 'mount':
        metrics.mountTime = duration;
        break;
      case 'update':
        metrics.updateCount++;
        break;
    }
    
    metrics.lastUpdate = Date.now();
    this.recordMetric(`component_${type}_${componentName}`, duration);
  }

  // Obtener métricas por nombre
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  // Obtener estadísticas de métricas
  getMetricStats(name: string) {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

    return { avg, min, max, median, count: values.length };
  }

  // Obtener todas las métricas de componentes
  getComponentMetrics(): Map<string, ComponentMetrics> {
    return new Map(this.componentMetrics);
  }

  // Limpiar métricas antiguas
  cleanup(olderThanMs = 5 * 60 * 1000) {
    const cutoff = Date.now() - olderThanMs;
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, filtered);
      }
    }
  }

  // Generar reporte de performance
  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([name, metrics]) => [
          name,
          this.getMetricStats(name)
        ])
      ),
      components: Object.fromEntries(this.componentMetrics),
      summary: {
        totalMetrics: this.metrics.size,
        totalComponents: this.componentMetrics.size,
        memoryUsage: typeof window !== 'undefined' && 'memory' in performance 
          ? (performance as any).memory 
          : null
      }
    };

    return JSON.stringify(report, null, 2);
  }

  // Destruir observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.componentMetrics.clear();
  }
}

// Instancia global del monitor
export const performanceMonitor = new PerformanceMonitor();

// Utilidades de throttle y debounce optimizadas
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      lastResult = func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  }) as T;
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T => {
  let timeout: NodeJS.Timeout | null;
  
  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(null, args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) return func.apply(null, args);
  }) as T;
};

// Decorator para medir performance de funciones
export const measurePerformance = <T extends (...args: any[]) => any>(
  target: T,
  name?: string
): T => {
  const functionName = name || target.name || 'anonymous';
  
  return ((...args: Parameters<T>) => {
    return performanceMonitor.measureFunction(functionName, () => target(...args));
  }) as T;
};

// Decorator para medir performance de funciones asíncronas
export const measureAsyncPerformance = <T extends (...args: any[]) => Promise<any>>(
  target: T,
  name?: string
): T => {
  const functionName = name || target.name || 'anonymous';
  
  return ((...args: Parameters<T>) => {
    return performanceMonitor.measureAsyncFunction(functionName, () => target(...args));
  }) as T;
};

// Hook para medir performance de componentes React
export const usePerformanceMeasure = (componentName: string) => {
  const measureRender = (callback: () => void) => {
    const start = performance.now();
    callback();
    const duration = performance.now() - start;
    performanceMonitor.recordComponentMetric(componentName, 'render', duration);
  };

  const measureMount = (callback: () => void) => {
    const start = performance.now();
    callback();
    const duration = performance.now() - start;
    performanceMonitor.recordComponentMetric(componentName, 'mount', duration);
  };

  const recordUpdate = () => {
    performanceMonitor.recordComponentMetric(componentName, 'update', 0);
  };

  return { measureRender, measureMount, recordUpdate };
};

// Utilidad para detectar dispositivos lentos
export const isSlowDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  // Usar Device Memory API si está disponible
  if ('deviceMemory' in navigator) {
    return (navigator as any).deviceMemory < 4; // Menos de 4GB de RAM
  }
  
  // Fallback: usar hardware concurrency
  if ('hardwareConcurrency' in navigator) {
    return navigator.hardwareConcurrency < 4; // Menos de 4 núcleos
  }
  
  return false;
};

// Utilidad para obtener información de conexión
export const getConnectionInfo = () => {
  if (typeof navigator === 'undefined') return null;
  
  const connection = (navigator as any).connection 
    || (navigator as any).mozConnection 
    || (navigator as any).webkitConnection;
    
  if (!connection) return null;
  
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
};

// Configuración automática de performance según el dispositivo
export const getOptimalPerformanceConfig = () => {
  const isSlowDev = isSlowDevice();
  const connection = getConnectionInfo();
  const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
  
  return {
    enableAnimations: !isSlowDev,
    enableLazyLoading: true,
    enableImageOptimization: isSlowConnection || isSlowDev,
    chunkSize: isSlowDev ? 10 : 20,
    cacheSize: isSlowDev ? 50 : 200,
    debounceMs: isSlowDev ? 500 : 300,
    throttleMs: isSlowDev ? 200 : 100
  };
};

export default performanceMonitor;
