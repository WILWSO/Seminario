import { useState, useCallback, useRef, useEffect } from 'react';

interface OptimizedState<T> {
  value: T;
  timestamp: number;
  version: number;
}

interface UseOptimizedStateOptions<T> {
  debounceMs?: number;
  throttleMs?: number;
  enableHistory?: boolean;
  maxHistorySize?: number;
  validator?: (value: T) => boolean;
  transformer?: (value: T) => T;
  onStateChange?: (newValue: T, oldValue: T) => void;
  equalityFn?: (a: T, b: T) => boolean;
}

interface UseOptimizedStateReturn<T> {
  state: T;
  setState: (value: T | ((prev: T) => T)) => void;
  setStateImmediate: (value: T | ((prev: T) => T)) => void;
  history: T[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  version: number;
  isDebouncing: boolean;
  reset: () => void;
}

export const useOptimizedState = <T>(
  initialValue: T,
  options: UseOptimizedStateOptions<T> = {}
): UseOptimizedStateReturn<T> => {
  const {
    debounceMs = 0,
    throttleMs = 0,
    enableHistory = false,
    maxHistorySize = 10,
    validator,
    transformer,
    onStateChange,
    equalityFn = (a, b) => a === b
  } = options;

  // Estado principal
  const [internalState, setInternalState] = useState<OptimizedState<T>>({
    value: initialValue,
    timestamp: Date.now(),
    version: 0
  });

  // Estados adicionales
  const [history, setHistory] = useState<T[]>(enableHistory ? [initialValue] : []);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Referencias para timers y valores
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastThrottleTime = useRef<number>(0);
  const pendingValueRef = useRef<T | null>(null);

  // Función para actualizar el estado interno
  const updateInternalState = useCallback((newValue: T) => {
    setInternalState(prevState => {
      // Verificar igualdad
      if (equalityFn(prevState.value, newValue)) {
        return prevState;
      }

      // Validar si hay validator
      if (validator && !validator(newValue)) {
        console.warn('Estado rechazado por validator:', newValue);
        return prevState;
      }

      // Transformar si hay transformer
      const finalValue = transformer ? transformer(newValue) : newValue;

      // Crear nuevo estado
      const newState: OptimizedState<T> = {
        value: finalValue,
        timestamp: Date.now(),
        version: prevState.version + 1
      };

      // Llamar callback de cambio
      if (onStateChange) {
        onStateChange(finalValue, prevState.value);
      }

      // Actualizar historial si está habilitado
      if (enableHistory) {
        setHistory(prevHistory => {
          const newHistory = [...prevHistory.slice(0, historyIndex + 1), finalValue];
          return newHistory.slice(-maxHistorySize);
        });
        setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
      }

      return newState;
    });
  }, [validator, transformer, onStateChange, enableHistory, equalityFn, historyIndex, maxHistorySize]);

  // Función para establecer estado con debounce/throttle
  const setState = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' 
      ? (value as (prev: T) => T)(internalState.value)
      : value;

    pendingValueRef.current = newValue;

    // Aplicar throttle si está configurado
    if (throttleMs > 0) {
      const now = Date.now();
      if (now - lastThrottleTime.current < throttleMs) {
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current);
        }
        throttleTimeoutRef.current = setTimeout(() => {
          if (pendingValueRef.current !== null) {
            updateInternalState(pendingValueRef.current);
            pendingValueRef.current = null;
            lastThrottleTime.current = Date.now();
          }
        }, throttleMs - (now - lastThrottleTime.current));
        return;
      }
      lastThrottleTime.current = now;
    }

    // Aplicar debounce si está configurado
    if (debounceMs > 0) {
      setIsDebouncing(true);
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        if (pendingValueRef.current !== null) {
          updateInternalState(pendingValueRef.current);
          pendingValueRef.current = null;
        }
        setIsDebouncing(false);
      }, debounceMs);
      return;
    }

    // Actualizar inmediatamente si no hay debounce/throttle
    updateInternalState(newValue);
  }, [internalState.value, debounceMs, throttleMs, updateInternalState]);

  // Función para establecer estado inmediatamente (sin debounce/throttle)
  const setStateImmediate = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' 
      ? (value as (prev: T) => T)(internalState.value)
      : value;

    // Cancelar timers pendientes
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

    setIsDebouncing(false);
    pendingValueRef.current = null;
    updateInternalState(newValue);
  }, [internalState.value, updateInternalState]);

  // Funciones de historial
  const undo = useCallback(() => {
    if (!enableHistory || historyIndex === 0) return;
    
    const newIndex = historyIndex - 1;
    const previousValue = history[newIndex];
    
    setHistoryIndex(newIndex);
    setInternalState(prev => ({
      ...prev,
      value: previousValue,
      timestamp: Date.now(),
      version: prev.version + 1
    }));
  }, [enableHistory, historyIndex, history]);

  const redo = useCallback(() => {
    if (!enableHistory || historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const nextValue = history[newIndex];
    
    setHistoryIndex(newIndex);
    setInternalState(prev => ({
      ...prev,
      value: nextValue,
      timestamp: Date.now(),
      version: prev.version + 1
    }));
  }, [enableHistory, historyIndex, history]);

  // Función de reset
  const reset = useCallback(() => {
    // Cancelar timers
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    setInternalState({
      value: initialValue,
      timestamp: Date.now(),
      version: 0
    });

    if (enableHistory) {
      setHistory([initialValue]);
      setHistoryIndex(0);
    }

    setIsDebouncing(false);
    pendingValueRef.current = null;
  }, [initialValue, enableHistory]);

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  return {
    state: internalState.value,
    setState,
    setStateImmediate,
    history,
    undo,
    redo,
    canUndo: enableHistory && historyIndex > 0,
    canRedo: enableHistory && historyIndex < history.length - 1,
    version: internalState.version,
    isDebouncing,
    reset
  };
};

export default useOptimizedState;
