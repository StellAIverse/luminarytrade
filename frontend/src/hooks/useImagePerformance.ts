/**
 * Performance monitoring hook for image optimization
 */

import { useEffect, useRef, useState } from 'react';

export interface ImagePerformanceMetrics {
  loadTime: number;
  fileSize?: number;
  format: string;
  dimensions: { width: number; height: number };
  webpSupported: boolean;
  cached: boolean;
  error?: string;
}

export interface UseImagePerformanceOptions {
  trackLoadTime?: boolean;
  trackFileSize?: boolean;
  trackCache?: boolean;
  enableLogging?: boolean;
}

export const useImagePerformance = (options: UseImagePerformanceOptions = {}) => {
  const {
    trackLoadTime = true,
    trackFileSize = false,
    trackCache = true,
    enableLogging = false
  } = options;

  const [metrics, setMetrics] = useState<ImagePerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<number>(0);
  const metricsRef = useRef<ImagePerformanceMetrics | null>(null);

  /**
   * Start tracking image load
   */
  const startTracking = (url: string, format: string = 'unknown') => {
    setIsLoading(true);
    startTimeRef.current = performance.now();
    
    // Check if WebP is supported
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    // Check if image is likely cached
    const isCached = trackCache ? checkImageCache(url) : false;

    metricsRef.current = {
      loadTime: 0,
      format,
      dimensions: { width: 0, height: 0 },
      webpSupported,
      cached: isCached
    };
  };

  /**
   * End tracking and record metrics
   */
  const endTracking = (img: HTMLImageElement, error?: string) => {
    if (!startTimeRef.current) return;

    const loadTime = performance.now() - startTimeRef.current;
    
    const finalMetrics: ImagePerformanceMetrics = {
      ...metricsRef.current!,
      loadTime,
      dimensions: {
        width: img.naturalWidth,
        height: img.naturalHeight
      },
      error
    };

    // Estimate file size if tracking is enabled
    if (trackFileSize && !error) {
      finalMetrics.fileSize = estimateFileSize(img);
    }

    metricsRef.current = finalMetrics;
    setMetrics(finalMetrics);
    setIsLoading(false);

    // Log performance data if enabled
    if (enableLogging) {
      logPerformance(finalMetrics);
    }

    // Send to analytics service (placeholder)
    sendToAnalytics(finalMetrics);
  };

  /**
   * Check if image is likely cached
   */
  const checkImageCache = (url: string): boolean => {
    try {
      const img = new Image();
      img.src = url;
      return img.complete || img.naturalHeight !== 0;
    } catch {
      return false;
    }
  };

  /**
   * Estimate file size based on image dimensions and format
   */
  const estimateFileSize = (img: HTMLImageElement): number => {
    const { width, height } = img;
    const pixels = width * height;
    
    // Rough estimates based on format and compression
    const format = metricsRef.current?.format || 'jpeg';
    const bytesPerPixel = {
      'webp': 0.3,
      'jpeg': 0.4,
      'png': 1.2,
      'avif': 0.2
    }[format] || 0.5;

    return Math.floor(pixels * bytesPerPixel);
  };

  /**
   * Log performance metrics to console
   */
  const logPerformance = (metrics: ImagePerformanceMetrics) => {
    const { loadTime, fileSize, format, dimensions, webpSupported, cached, error } = metrics;
    
    console.group(`🖼️ Image Performance: ${format}`);
    console.log(`⏱️ Load Time: ${loadTime.toFixed(2)}ms`);
    console.log(`📏 Dimensions: ${dimensions.width}x${dimensions.height}`);
    console.log(`🌐 WebP Supported: ${webpSupported}`);
    console.log(`💾 Cached: ${cached}`);
    
    if (fileSize) {
      console.log(`📦 Estimated Size: ${(fileSize / 1024).toFixed(2)} KB`);
    }
    
    if (error) {
      console.error(`❌ Error: ${error}`);
    }
    
    console.groupEnd();
  };

  /**
   * Send metrics to analytics service
   */
  const sendToAnalytics = (metrics: ImagePerformanceMetrics) => {
    // This would integrate with your analytics service
    // For now, we'll store in localStorage for debugging
    try {
      const existingMetrics = JSON.parse(localStorage.getItem('imageMetrics') || '[]');
      existingMetrics.push({
        ...metrics,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
      
      // Keep only last 100 entries
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }
      
      localStorage.setItem('imageMetrics', JSON.stringify(existingMetrics));
    } catch (error) {
      console.warn('Failed to store image metrics:', error);
    }
  };

  /**
   * Get performance summary
   */
  const getPerformanceSummary = () => {
    if (!metrics) return null;

    const { loadTime, fileSize, format, webpSupported, cached } = metrics;
    
    return {
      performance: loadTime < 500 ? 'excellent' : loadTime < 1000 ? 'good' : 'needs-improvement',
      loadTime: `${loadTime.toFixed(2)}ms`,
      estimatedSize: fileSize ? `${(fileSize / 1024).toFixed(2)} KB` : 'unknown',
      format,
      optimized: webpSupported && format === 'webp',
      cached,
      savings: cached ? '100% (cached)' : webpSupported && format === 'webp' ? '~30%' : '0%'
    };
  };

  /**
   * Reset metrics
   */
  const reset = () => {
    setMetrics(null);
    setIsLoading(false);
    startTimeRef.current = 0;
    metricsRef.current = null;
  };

  return {
    metrics,
    isLoading,
    startTracking,
    endTracking,
    getPerformanceSummary,
    reset
  };
};

/**
 * Hook to track multiple images
 */
export const useImageBatchPerformance = () => {
  const [batchMetrics, setBatchMetrics] = useState<ImagePerformanceMetrics[]>([]);
  const startTimeRef = useRef<number>(0);

  const startBatch = () => {
    startTimeRef.current = performance.now();
  };

  const addImageMetric = (metric: ImagePerformanceMetrics) => {
    setBatchMetrics(prev => [...prev, metric]);
  };

  const getBatchSummary = () => {
    if (batchMetrics.length === 0) return null;

    const totalLoadTime = batchMetrics.reduce((sum, m) => sum + m.loadTime, 0);
    const averageLoadTime = totalLoadTime / batchMetrics.length;
    const totalSize = batchMetrics.reduce((sum, m) => sum + (m.fileSize || 0), 0);
    const cachedCount = batchMetrics.filter(m => m.cached).length;
    const webpCount = batchMetrics.filter(m => m.format === 'webp').length;

    return {
      imageCount: batchMetrics.length,
      totalLoadTime: `${totalLoadTime.toFixed(2)}ms`,
      averageLoadTime: `${averageLoadTime.toFixed(2)}ms`,
      totalSize: totalSize ? `${(totalSize / 1024).toFixed(2)} KB` : 'unknown',
      cacheHitRate: `${((cachedCount / batchMetrics.length) * 100).toFixed(1)}%`,
      webpAdoptionRate: `${((webpCount / batchMetrics.length) * 100).toFixed(1)}%`,
      performance: averageLoadTime < 500 ? 'excellent' : averageLoadTime < 1000 ? 'good' : 'needs-improvement'
    };
  };

  const resetBatch = () => {
    setBatchMetrics([]);
    startTimeRef.current = 0;
  };

  return {
    batchMetrics,
    startBatch,
    addImageMetric,
    getBatchSummary,
    resetBatch
  };
};
