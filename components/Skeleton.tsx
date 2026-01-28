
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200/80 dark:bg-white/5 rounded-2xl ${className}`} />
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
                <div className="flex gap-2 mt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

// Skeleton desenhado para imitar exatamente o Header do ProfileView
export const SkeletonProfileHeader = () => (
    <div className="relative w-full overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-2xl bg-gray-200 dark:bg-gray-800 min-h-[240px] md:min-h-[280px] flex items-end animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="relative z-30 w-full max-w-7xl mx-auto pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 pt-24">
            <div className="shrink-0 relative">
                <div className="w-20 h-20 md:w-44 md:h-44 rounded-full shadow-2xl overflow-hidden bg-gray-300 dark:bg-gray-700 border-[4px] border-white/10"></div>
            </div>
            <div className="flex-1 text-center md:text-left w-full mb-2">
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                    <Skeleton className="w-16 h-6 rounded-full" />
                    <Skeleton className="w-12 h-6 rounded-full" />
                </div>
                <Skeleton className="h-10 md:h-16 w-3/4 md:w-1/2 mb-3 mx-auto md:mx-0" />
                <Skeleton className="h-4 w-1/3 mx-auto md:mx-0" />
            </div>
        </div>
    </div>
);

// Skeleton para os gráficos de barras (Presença) e Dashboard
export const SkeletonStats = () => (
    <div className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-10 border border-white/20 dark:border-white/10 shadow-sm w-full mb-8">
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-white/10 pb-4">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-xl" />
                <Skeleton className="h-8 w-16 rounded-xl" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
            <div className="space-y-4">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-4 w-full rounded-full" />
                <div className="flex justify-between mt-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-4 w-full rounded-full" />
                <div className="flex justify-between mt-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-8 w-1/2 mt-4" />
            </div>
        </div>
    </div>
);
