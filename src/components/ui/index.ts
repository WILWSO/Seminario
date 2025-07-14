// Exportaciones de componentes UI granulares

// Skeleton components
export { SkeletonText } from './skeletons/SkeletonText';
export { SkeletonCard } from './skeletons/SkeletonCard';
export { SkeletonList } from './skeletons/SkeletonList';
export { SkeletonProvider, useSkeletonConfig } from './skeletons/SkeletonProvider';

// Loader components
export { LazyLoader } from './loaders/LazyLoader';
export { ProgressiveLoader } from './loaders/ProgressiveLoader';
export { LoaderProvider, useLoaderConfig } from './loaders/LoaderProvider';

// Performance components
export { CacheProvider, useCacheContext } from './performance/CacheProvider';
export { OptimizedComponent } from './performance/OptimizedComponent';
export { VirtualizedList } from './performance/VirtualizedList';

// Skeleton components para backward compatibility
export { 
  CourseHeaderSkeleton,
  ProgressSkeleton,
  ModulesSkeleton,
  ModuleContentSkeleton,
  SkeletonLoader
} from './skeletons/SkeletonComponents';
