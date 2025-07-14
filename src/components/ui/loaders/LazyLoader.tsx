import React, { Suspense, useState, useEffect, ReactNode } from 'react';

interface LazyLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
  threshold?: number;
  className?: string;
}

export const LazyLoader: React.FC<LazyLoaderProps> = ({
  children,
  fallback = <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-32"></div>,
  delay = 0,
  threshold = 0,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, delay, threshold]);

  return (
    <div ref={setRef} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
};
