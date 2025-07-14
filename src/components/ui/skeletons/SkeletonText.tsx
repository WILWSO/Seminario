import React from 'react';

interface SkeletonTextProps {
  lines?: number;
  width?: string | string[];
  height?: string;
  className?: string;
  animated?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  width = '100%',
  height = '1rem',
  className = '',
  animated = true
}) => {
  const getWidth = (index: number): string => {
    if (Array.isArray(width)) {
      return width[index] || width[width.length - 1];
    }
    return width;
  };

  const getHeightClass = () => {
    switch (height) {
      case '0.75rem':
        return 'h-3';
      case '1rem':
        return 'h-4';
      case '1.25rem':
        return 'h-5';
      case '1.5rem':
        return 'h-6';
      case '2rem':
        return 'h-8';
      default:
        return 'h-4';
    }
  };

  const getWidthClass = (w: string) => {
    switch (w) {
      case '25%':
        return 'w-1/4';
      case '50%':
        return 'w-1/2';
      case '75%':
        return 'w-3/4';
      case '100%':
        return 'w-full';
      default:
        return w.startsWith('w-') ? w : 'w-full';
    }
  };

  const baseClasses = `bg-slate-200 dark:bg-slate-700 rounded ${animated ? 'animate-pulse' : ''} ${getHeightClass()} ${className}`;

  if (lines === 1) {
    return <div className={`${baseClasses} ${getWidthClass(width as string)}`} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${getWidthClass(getWidth(index))}`}
        />
      ))}
    </div>
  );
};

export default SkeletonText;
