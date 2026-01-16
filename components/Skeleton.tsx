import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-md ${className}`} />
);

export const SkeletonFeedItem = () => (
    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
                <div className="flex justify-between">
                     <Skeleton className="h-4 w-32 rounded" />
                     <Skeleton className="h-4 w-8 rounded" />
                </div>
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-5/6 rounded" />
                <div className="flex gap-2 mt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

export const SkeletonProfileHeader = () => (
    <div className="space-y-6">
        <div className="h-40 md:h-52 bg-gray-200 dark:bg-gray-800 animate-pulse w-full"></div>
        <div className="px-6 -mt-16 flex justify-between items-end relative z-10">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-300 dark:bg-gray-700 border-[5px] border-white dark:border-gray-900 animate-pulse"></div>
            <div className="flex gap-2 mb-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="w-10 h-10 rounded-full" />
            </div>
        </div>
        <div className="px-6 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
        </div>
    </div>
);