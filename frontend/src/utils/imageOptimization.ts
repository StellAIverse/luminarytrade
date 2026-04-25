/**
 * Image optimization utilities for WebP compression and responsive images
 */

export interface ImageOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg' | 'png';
  crop?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface ResponsiveImageSources {
  srcSet: string;
  sizes?: string;
  type?: string;
}

/**
 * Check if WebP is supported in the browser
 */
export const isWebPSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Generate CDN-optimized image URL with WebP support
 */
export const generateOptimizedImageUrl = (
  baseUrl: string,
  options: ImageOptions = {}
): string => {
  const {
    quality = 80,
    width,
    height,
    format = isWebPSupported() ? 'webp' : 'jpeg',
    crop
  } = options;

  // If the URL is already a CDN URL, add parameters
  if (baseUrl.includes('cloudinary') || baseUrl.includes('imgix') || baseUrl.includes('cloudfront')) {
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    if (format) params.set('f', format);
    if (crop) params.set('c', crop);
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  }

  // For local images, we'll create a simple optimization path
  const extension = format === 'webp' ? 'webp' : 'jpg';
  const pathParts = baseUrl.split('.');
  pathParts[pathParts.length - 1] = extension;
  
  let optimizedUrl = pathParts.join('');
  
  // Add size parameters for local images
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality && quality !== 80) params.set('q', quality.toString());
  
  if (params.toString()) {
    optimizedUrl += `?${params.toString()}`;
  }
  
  return optimizedUrl;
};

/**
 * Generate responsive image sources for different screen sizes
 */
export const generateResponsiveSources = (
  baseUrl: string,
  breakpoints: { width: number; height?: number }[] = [
    { width: 320 },
    { width: 640 },
    { width: 768 },
    { width: 1024 },
    { width: 1280 },
    { width: 1536 }
  ],
  options: Omit<ImageOptions, 'width' | 'height'> = {}
): ResponsiveImageSources[] => {
  const sources: ResponsiveImageSources[] = [];
  
  // WebP sources
  if (isWebPSupported()) {
    const webpSrcSet = breakpoints
      .map(bp => `${generateOptimizedImageUrl(baseUrl, { ...options, ...bp, format: 'webp' })} ${bp.width}w`)
      .join(', ');
    
    sources.push({
      srcSet: webpSrcSet,
      type: 'image/webp'
    });
  }
  
  // Fallback JPEG/PNG sources
  const fallbackSrcSet = breakpoints
    .map(bp => `${generateOptimizedImageUrl(baseUrl, { ...options, ...bp, format: 'jpeg' })} ${bp.width}w`)
    .join(', ');
  
  sources.push({
    srcSet: fallbackSrcSet,
    type: 'image/jpeg'
  });
  
  return sources;
};

/**
 * Calculate optimal image dimensions based on container
 */
export const calculateOptimalDimensions = (
  containerWidth: number,
  containerHeight?: number,
  aspectRatio?: number
): { width: number; height: number } => {
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  
  let width = Math.ceil(containerWidth * devicePixelRatio);
  let height: number;
  
  if (containerHeight) {
    height = Math.ceil(containerHeight * devicePixelRatio);
  } else if (aspectRatio) {
    height = Math.ceil(width / aspectRatio);
  } else {
    height = width; // Default to square
  }
  
  // Cap maximum dimensions to prevent excessively large images
  const maxDimension = 2048;
  width = Math.min(width, maxDimension);
  height = Math.min(height, maxDimension);
  
  return { width, height };
};

/**
 * Preload critical images
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Batch preload multiple images
 */
export const preloadImages = async (srcs: string[]): Promise<void[]> => {
  const promises = srcs.map(src => preloadImage(src));
  return Promise.all(promises);
};

/**
 * Estimate file size reduction with WebP
 */
export const estimateWebPSavings = (originalSize: number): number => {
  // WebP typically provides 25-35% reduction in file size
  return Math.floor(originalSize * 0.3);
};
