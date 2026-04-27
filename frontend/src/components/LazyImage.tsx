import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  generateOptimizedImageUrl,
  generateResponsiveSources,
  preloadImage,
  calculateOptimalDimensions,
  ImageOptions
} from '../utils/imageOptimization';

interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  placeholderSrc?: string;
  webp?: boolean;
  responsive?: boolean;
  breakpoints?: { width: number; height?: number }[];
  imageOptions?: Omit<ImageOptions, 'width' | 'height'>;
  onLoad?: () => void;
  onError?: (error: Event) => void;
  enablePreload?: boolean;
  containerWidth?: number;
  containerHeight?: number;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholderSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMSAxIiByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMSIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==',
  webp = true,
  responsive = true,
  breakpoints = [
    { width: 320 },
    { width: 640 },
    { width: 768 },
    { width: 1024 },
    { width: 1280 },
    { width: 1536 }
  ],
  imageOptions = {},
  onLoad,
  onError,
  enablePreload = false,
  containerWidth,
  containerHeight,
  alt,
  style,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(placeholderSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate optimized image URL
  const getOptimizedSrc = useCallback(() => {
    if (!src) return placeholderSrc;

    if (containerWidth || containerHeight) {
      const dimensions = calculateOptimalDimensions(
        containerWidth || 800,
        containerHeight,
        undefined // aspect ratio not available in filtered options
      );
      
      return generateOptimizedImageUrl(src, {
        ...imageOptions,
        width: dimensions.width,
        height: dimensions.height,
        format: webp ? 'webp' : 'jpeg'
      });
    }

    return generateOptimizedImageUrl(src, {
      ...imageOptions,
      format: webp ? 'webp' : 'jpeg'
    });
  }, [src, containerWidth, containerHeight, imageOptions, webp, placeholderSrc]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const optimizedSrc = getOptimizedSrc();
    
    if (enablePreload) {
      preloadImage(optimizedSrc)
        .then(() => {
          setImgSrc(optimizedSrc);
          setIsLoading(false);
          onLoad?.();
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
          onError?.(err);
        });
    } else {
      const img = new Image();
      img.src = optimizedSrc;
      img.onload = () => {
        setImgSrc(optimizedSrc);
        setIsLoading(false);
        onLoad?.();
      };
      img.onerror = (err) => {
        setError(err.message);
        setIsLoading(false);
        onError?.(err);
      };
    }
  }, [isInView, src, getOptimizedSrc, enablePreload, onLoad, onError]);

  // Generate responsive sources
  const sources = responsive && src ? generateResponsiveSources(src, breakpoints, imageOptions) : [];

  if (error) {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#6b7280',
          fontSize: '14px',
          ...style
        }}
        {...props}
      >
        Failed to load image
      </div>
    );
  }

  if (responsive && sources.length > 0) {
    return (
      <picture ref={containerRef}>
        {sources.map((source, index) => (
          <source
            key={index}
            srcSet={source.srcSet}
            type={source.type}
            sizes={source.sizes}
          />
        ))}
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt}
          loading="lazy"
          style={{
            ...style,
            filter: isLoading ? 'blur(10px)' : 'none',
            transition: 'filter 0.3s ease-in-out',
            opacity: isLoading ? 0.7 : 1
          }}
          {...props}
        />
      </picture>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      loading="lazy"
      style={{
        ...style,
        filter: isLoading ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s ease-in-out',
        opacity: isLoading ? 0.7 : 1
      }}
      {...props}
    />
  );
};

export default LazyImage;
