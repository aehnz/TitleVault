import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/** Animated shimmer block used as a loading placeholder. */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-muted/60',
      className,
    )}
  />
);

/** Full-page skeleton shown while lazy-loaded route chunks are downloading. */
export const PageSkeleton: React.FC = () => (
  <div className="p-6 space-y-6 animate-fade-in">
    {/* Header skeleton */}
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>

    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>

    {/* Table skeleton */}
    <div className="rounded-xl border bg-card">
      <div className="p-4 border-b">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Table skeleton for submission lists. */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    ))}
  </div>
);

/** Editor skeleton shown while a submission is loading. */
export const EditorSkeleton: React.FC = () => (
  <div className="h-full flex flex-col">
    {/* Toolbar */}
    <div className="h-12 border-b flex items-center gap-4 px-4">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-px bg-border" />
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <div className="flex-1" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
    </div>

    {/* Content */}
    <div className="flex-1 flex">
      {/* Wizard nav */}
      <div className="w-64 border-r p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Inspector */}
      <div className="w-80 border-l p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  </div>
);

export default PageSkeleton;
