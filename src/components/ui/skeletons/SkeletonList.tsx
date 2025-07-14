import React from 'react';
import { SkeletonText } from './SkeletonText';
import { SkeletonCard } from './SkeletonCard';

interface SkeletonListProps {
  items?: number;
  itemType?: 'card' | 'text' | 'custom';
  showHeader?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  items = 3,
  itemType = 'card',
  showHeader = true,
  className = '',
  children
}) => {
  const renderItem = (index: number) => {
    switch (itemType) {
      case 'card':
        return <SkeletonCard key={index} />;
      case 'text':
        return (
          <div key={index} className="py-2">
            <SkeletonText width="100%" height="h-4" />
          </div>
        );
      case 'custom':
        return children ? React.cloneElement(children as React.ReactElement, { key: index }) : null;
      default:
        return <SkeletonCard key={index} />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="mb-6">
          <SkeletonText width="40%" height="h-8" className="mb-2" />
          <SkeletonText width="70%" height="h-4" />
        </div>
      )}
      
      <div className="space-y-4">
        {Array.from({ length: items }, (_, index) => renderItem(index))}
      </div>
    </div>
  );
};
