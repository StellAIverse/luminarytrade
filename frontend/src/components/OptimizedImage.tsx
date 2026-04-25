/**
 * Fully optimized image component with WebP, lazy loading, CDN, and performance tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import LazyImage from './LazyImage';
import { useImagePerformance } from '../hooks/useImagePerformance';
import { generateOptimizedImageUrl, generateResponsiveSources, calculateOptimalDimensions } from '../utils/imageOptimization';
import { getOptimizedImageUrl, generateCDNResponsiveSources } from '../utils/cdnConfig';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  lazy?: boolean;
  responsive?: boolean;
  breakpoints?: { width: number; height?: number }[];
  useCDN?: boolean;
  enablePerformanceTracking?: boolean;
  placeholder?: string;
  fadeIn?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  containerWidth?: number;
  containerHeight?: number;
  priority?: boolean; // For above-the-fold images
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'webp',
  lazy = true,
  responsive = true,
  breakpoints = [
    { width: 320 },
    { width: 640 },
    { width: 768 },
    { width: 1024 },
    { width: 1280 },
    { width: 1536 }
  ],
  useCDN = true,
  enablePerformanceTracking = false,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMSAxIiByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMSIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==',
  fadeIn = true,
  objectFit = 'cover',
  onLoad,
  onError,
  containerWidth,
  containerHeight,
  priority = false,
  style,
  className,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const { startTracking, endTracking, metrics, getPerformanceSummary } = useImagePerformance({
    trackLoadTime: enablePerformanceTracking,
    trackFileSize: enablePerformanceTracking,
    trackCache: enablePerformanceTracking,
    enableLogging: enablePerformanceTracking
  });

  // Generate optimized image URL
  const generateSrc = useCallback(() => {
    if (!src) return '';

    let optimizedSrc: string;
    
    if (useCDN) {
      optimizedSrc = getOptimizedImageUrl(src, {
        width,
        height,
        quality,
        format
      });
    } else {
      optimizedSrc = generateOptimizedImageUrl(src, {
        width,
        height,
        quality,
        format
      });
    }

    return optimizedSrc;
  }, [src, width, height, quality, format, useCDN]);

  // Generate responsive sources
  const generateSources = useCallback(() => {
    if (!responsive || !src) return [];

    if (useCDN) {
      return generateCDNResponsiveSources(src, breakpoints, {
        quality,
        format
      });
    } else {
      return generateResponsiveSources(src, breakpoints, {
        quality,
        format
      });
    }
  }, [src, responsive, breakpoints, quality, format, useCDN]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
    
    if (imgRef.current && enablePerformanceTracking) {
      endTracking(imgRef.current);
    }
    
    onLoad?.();
  }, [onLoad, enablePerformanceTracking, endTracking]);

  // Handle image error
  const handleError = useCallback((error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setError('Failed to load image');
    
    if (imgRef.current && enablePerformanceTracking) {
      endTracking(imgRef.current, 'load-error');
    }
    
    onError?.(error);
  }, [onError, enablePerformanceTracking, endTracking]);

  // Initialize image source
  useEffect(() => {
    const optimizedSrc = generateSrc();
    setImageSrc(optimizedSrc);
    
    if (enablePerformanceTracking) {
      startTracking(optimizedSrc, format);
    }
  }, [generateSrc, enablePerformanceTracking, startTracking, format]);

  // Preload priority images
  useEffect(() => {
    if (priority && imageSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageSrc;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, imageSrc]);

  // Generate responsive sources
  const sources = generateSources();

  // Computed styles
  const imageStyle: React.CSSProperties = {
    objectFit,
    transition: fadeIn ? 'opacity 0.3s ease-in-out' : 'none',
    opacity: isLoading ? 0.7 : 1,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    ...style
  };

  // Error fallback
  if (error) {
    return (
      <div
        className={`optimized-image-error ${className || ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#6b7280',
          fontSize: '14px',
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : '200px',
          border: '1px dashed #d1d5db',
          borderRadius: '4px',
          ...style
        }}
        {...props}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖼️</div>
          <div>Failed to load image</div>
          {enablePerformanceTracking && metrics && (
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Load time: {metrics.loadTime.toFixed(2)}ms
            </div>
          )}
        </div>
      </div>
    );
  }

  // Use LazyImage for lazy loading
  if (lazy && !priority) {
    return (
      <LazyImage
        src={src}
        alt={alt}
        placeholderSrc={placeholder}
        webp={format === 'webp'}
        responsive={responsive}
        breakpoints={breakpoints}
        imageOptions={{
          quality,
          format
        }}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        onLoad={handleLoad}
        onError={handleError as any}
        enablePreload={priority}
        style={imageStyle}
        className={`optimized-image ${className || ''}`}
        {...props}
      />
    );
  }

  // Render with picture element for responsive images
  if (responsive && sources.length > 0) {
    return (
      <picture className={`optimized-image-picture ${className || ''}`}>
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
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={imageStyle}
          {...props}
        />
        {enablePerformanceTracking && metrics && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '10px',
              padding: '2px 4px',
              borderRadius: '2px',
              pointerEvents: 'none'
            }}
          >
            {metrics.loadTime.toFixed(0)}ms
          </div>
        )}
      </picture>
    );
  }

  // Simple img element
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={imageStyle}
        className={`optimized-image ${className || ''}`}
        {...props}
      />
      {enablePerformanceTracking && metrics && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: '10px',
            padding: '2px 4px',
            borderRadius: '2px',
            pointerEvents: 'none'
          }}
        >
          {metrics.loadTime.toFixed(0)}ms
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
