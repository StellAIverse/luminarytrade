/**
 * CDN configuration and optimization utilities
 */

export interface CDNConfig {
  provider: 'cloudinary' | 'imgix' | 'cloudfront' | 'custom';
  baseUrl: string;
  defaultQuality?: number;
  enableWebP?: boolean;
  enableAutoOptimization?: boolean;
}

export interface CDNTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  crop?: 'fill' | 'crop' | 'scale' | 'fit';
  gravity?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

class CDNManager {
  private config: CDNConfig;

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * Generate CDN-optimized URL based on provider
   */
  generateUrl(originalUrl: string, options: CDNTransformOptions = {}): string {
    const {
      width,
      height,
      quality = this.config.defaultQuality || 80,
      format = this.config.enableWebP ? 'webp' : 'jpeg',
      crop = 'fill',
      gravity = 'center'
    } = options;

    // If already a CDN URL, transform it
    if (this.isCDNUrl(originalUrl)) {
      return this.transformExistingUrl(originalUrl, options);
    }

    // For external images, proxy through CDN
    return this.proxyThroughCDN(originalUrl, options);
  }

  private isCDNUrl(url: string): boolean {
    return url.includes(this.config.baseUrl);
  }

  private transformExistingUrl(url: string, options: CDNTransformOptions): string {
    const { provider } = this.config;

    switch (provider) {
      case 'cloudinary':
        return this.transformCloudinaryUrl(url, options);
      case 'imgix':
        return this.transformImgixUrl(url, options);
      case 'cloudfront':
        return this.transformCloudfrontUrl(url, options);
      case 'custom':
        return this.transformCustomUrl(url, options);
      default:
        return url;
    }
  }

  private transformCloudinaryUrl(url: string, options: CDNTransformOptions): string {
    const { width, height, quality, format, crop, gravity } = options;
    
    // Extract existing transformation
    const baseUrl = url.split('/upload/')[0] + '/upload';
    const publicId = url.split('/upload/')[1]?.split('?')[0] || '';
    
    let transformation = '';
    if (width || height || quality || format || crop) {
      const params = [];
      if (width) params.push(`w_${width}`);
      if (height) params.push(`h_${height}`);
      if (quality) params.push(`q_${quality}`);
      if (format) params.push(`f_${format}`);
      if (crop) params.push(`c_${crop}`);
      if (gravity && crop !== 'scale') params.push(`g_${gravity}`);
      
      transformation = params.join(',') + '/';
    }

    return `${baseUrl}/${transformation}${publicId}`;
  }

  private transformImgixUrl(url: string, options: CDNTransformOptions): string {
    const { width, height, quality, format, crop, gravity } = options;
    
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    if (format) params.set('fm', format);
    if (crop) params.set('fit', crop);
    if (gravity) params.set('crop', gravity);

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  private transformCloudfrontUrl(url: string, options: CDNTransformOptions): string {
    const { width, height, quality, format } = options;
    
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    if (format) params.set('f', format);

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  private transformCustomUrl(url: string, options: CDNTransformOptions): string {
    const { width, height, quality, format } = options;
    
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    if (format) params.set('f', format);

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  private proxyThroughCDN(originalUrl: string, options: CDNTransformOptions): string {
    const { width, height, quality, format } = options;
    
    const encodedUrl = encodeURIComponent(originalUrl);
    const params = new URLSearchParams();
    
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    if (quality) params.set('q', quality.toString());
    if (format) params.set('f', format);
    params.set('url', encodedUrl);

    return `${this.config.baseUrl}?${params.toString()}`;
  }

  /**
   * Get provider-specific features
   */
  getProviderFeatures(): string[] {
    switch (this.config.provider) {
      case 'cloudinary':
        return ['auto-format', 'quality-auto', 'face-detection', 'background-removal'];
      case 'imgix':
        return ['auto-format', 'quality-auto', 'palette', 'watermark'];
      case 'cloudfront':
        return ['basic-transformations'];
      case 'custom':
        return ['basic-transformations'];
      default:
        return [];
    }
  }

  /**
   * Estimate bandwidth savings
   */
  estimateSavings(originalSize: number, options: CDNTransformOptions): number {
    const { quality = 80, format } = options;
    
    let savings = 0;
    
    // Quality-based savings
    if (quality < 100) {
      savings += (100 - quality) * 0.5; // Rough estimate
    }
    
    // Format-based savings
    if (format === 'webp') {
      savings += 30; // WebP typically saves 30%
    } else if (format === 'avif') {
      savings += 50; // AVIF typically saves 50%
    }
    
    return Math.floor(originalSize * (savings / 100));
  }
}

// Default CDN configuration
const defaultCDNConfig: CDNConfig = {
  provider: 'custom',
  baseUrl: 'https://cdn.luminarytrade.com/image',
  defaultQuality: 80,
  enableWebP: true,
  enableAutoOptimization: true
};

// Create singleton instance
export const cdnManager = new CDNManager(defaultCDNConfig);

/**
 * Configure CDN settings
 */
export const configureCDN = (config: Partial<CDNConfig>): void => {
  Object.assign(defaultCDNConfig, config);
  // Recreate manager with new config
  (cdnManager as any).config = { ...defaultCDNConfig, ...config };
};

/**
 * Generate optimized image URL using CDN
 */
export const getOptimizedImageUrl = (
  url: string,
  options: CDNTransformOptions = {}
): string => {
  return cdnManager.generateUrl(url, options);
};

/**
 * Generate responsive image sources using CDN
 */
export const generateCDNResponsiveSources = (
  url: string,
  breakpoints: { width: number; height?: number }[] = [
    { width: 320 },
    { width: 640 },
    { width: 768 },
    { width: 1024 },
    { width: 1280 },
    { width: 1536 }
  ],
  baseOptions: Omit<CDNTransformOptions, 'width' | 'height'> = {}
): Array<{ srcSet: string; type?: string; sizes?: string }> => {
  const sources: Array<{ srcSet: string; type?: string; sizes?: string }> = [];
  
  // WebP sources
  const webpSrcSet = breakpoints
    .map(bp => `${getOptimizedImageUrl(url, { ...baseOptions, ...bp, format: 'webp' })} ${bp.width}w`)
    .join(', ');
  
  sources.push({
    srcSet: webpSrcSet,
    type: 'image/webp'
  });
  
  // Fallback JPEG sources
  const jpegSrcSet = breakpoints
    .map(bp => `${getOptimizedImageUrl(url, { ...baseOptions, ...bp, format: 'jpeg' })} ${bp.width}w`)
    .join(', ');
  
  sources.push({
    srcSet: jpegSrcSet,
    type: 'image/jpeg'
  });
  
  return sources;
};
