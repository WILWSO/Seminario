import React, { ReactNode, useEffect, useState } from 'react';

interface ProgressiveLoaderProps {
  children: ReactNode;
  isLoading?: boolean;
  skeleton?: ReactNode;
  threshold?: number;
  delay?: number;
  className?: string;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  isLoading = false,
  skeleton,
  threshold = 0.1,
  delay = 0,
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
        }
      },
      { threshold }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, threshold, delay]);

  const defaultSkeleton = (
    <div className="animate-pulse">
      <div className="bg-slate-200 dark:bg-slate-700 rounded h-32 mb-4"></div>
      <div className="space-y-2">
        <div className="bg-slate-200 dark:bg-slate-700 rounded h-4 w-3/4"></div>
        <div className="bg-slate-200 dark:bg-slate-700 rounded h-4 w-1/2"></div>
      </div>
    </div>
  );

  return (
    <div ref={setRef} className={className}>
      {isLoading || !isVisible ? (
        skeleton || defaultSkeleton
      ) : (
        children
      )}
    </div>
  );
};
