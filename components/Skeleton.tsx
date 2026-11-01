
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200/80 dark:bg-white/10 rounded-2xl ${className}`} />
);

export const SkeletonFeedItem = () => (
    <div className="p-4 border-b border-slate-200/70 dark:border-white/10">
        <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                     <Skeleton className="h-4 w-32 rounded" />
                     <Skeleton className="h-4 w-8 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <div className="flex gap-2 mt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);
