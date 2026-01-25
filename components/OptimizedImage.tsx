
import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { User } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  widthParam?: number; // Largura para otimização da API (não necessariamente a largura CSS)
  fallbackIconScale?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  className, 
  widthParam = 200, 
  fallbackIconScale = 1,
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Se já deu erro, mostra fallback visual
  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-400 ${className}`}>
        <User size={24 * fallbackIconScale} />
      </div>
    );
  }

  const optimizedSrc = getOptimizedImageUrl(src, widthParam);

  return (
    <img
      src={optimizedSrc}
      alt={alt || ''}
      className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default OptimizedImage;
