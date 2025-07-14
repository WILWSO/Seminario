import React, { useState, useCallback, useMemo, ReactNode } from 'react';

interface VirtualizedListProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  overscan?: number;
  className?: string;
}

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = ''
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = items.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const offsetY = startIndex * itemHeight;

  return (
    <div
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      {...(containerHeight && { 
        style: { height: `${containerHeight}px` } 
      })}
    >
      <div 
        className="relative"
        {...(totalHeight && { 
          style: { height: `${totalHeight}px` } 
        })}
      >
        <div
          className="absolute inset-x-0 top-0"
          {...(offsetY && { 
            style: { transform: `translateY(${offsetY}px)` } 
          })}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              {...(itemHeight && { 
                style: { height: `${itemHeight}px` } 
              })}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VirtualizedList;
