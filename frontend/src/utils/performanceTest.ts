/**
 * Performance testing utilities for image optimization
 */

export interface PerformanceTestResult {
  testName: string;
  loadTime: number;
  fileSize?: number;
  format: string;
  webpSupported: boolean;
  cached: boolean;
  optimized: boolean;
  savings?: number;
}

export interface BatchTestResult {
  totalImages: number;
  totalLoadTime: number;
  averageLoadTime: number;
  totalSize: number;
  averageSize: number;
  cacheHitRate: number;
  webpAdoptionRate: number;
  totalSavings: number;
}

class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  /**
   * Test single image performance
   */
  async testImage(
    url: string,
    options: {
      useWebP?: boolean;
      useCDN?: boolean;
      quality?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    
    // Test WebP support
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    // Generate optimized URL
    let testUrl = url;
    if (options.useCDN) {
      // This would integrate with your CDN utility
      testUrl = `${url}?q=${options.quality || 80}&f=${options.useWebP && webpSupported ? 'webp' : 'jpeg'}`;
    }

    // Check if cached
    const isCached = await this.checkImageCache(testUrl);

    // Load image
    const img = new Image();
    const loadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = testUrl;
    });

    await loadPromise;
    const loadTime = performance.now() - startTime;

    // Estimate file size
    const fileSize = this.estimateFileSize(img, options.useWebP && webpSupported ? 'webp' : 'jpeg');

    // Calculate savings
    const originalSize = this.estimateFileSize(img, 'jpeg');
    const savings = originalSize - fileSize;

    const result: PerformanceTestResult = {
      testName: options.useCDN ? 'CDN Optimized' : options.useWebP ? 'WebP' : 'Original',
      loadTime,
      fileSize,
      format: options.useWebP && webpSupported ? 'webp' : 'jpeg',
      webpSupported,
      cached: isCached,
      optimized: options.useWebP || options.useCDN,
      savings: savings > 0 ? savings : undefined
    };

    this.results.push(result);
    return result;
  }

  /**
   * Test multiple images
   */
  async testBatch(
    urls: string[],
    options: {
      useWebP?: boolean;
      useCDN?: boolean;
      quality?: number;
      concurrent?: boolean;
    } = {}
  ): Promise<BatchTestResult> {
    const startTime = performance.now();
    
    let results: PerformanceTestResult[];
    
    if (options.concurrent) {
      // Test concurrently
      const promises = urls.map(url => this.testImage(url, options));
      results = await Promise.all(promises);
    } else {
      // Test sequentially
      results = [];
      for (const url of urls) {
        const result = await this.testImage(url, options);
        results.push(result);
      }
    }

    const totalLoadTime = performance.now() - startTime;
    
    const batchResult: BatchTestResult = {
      totalImages: results.length,
      totalLoadTime,
      averageLoadTime: totalLoadTime / results.length,
      totalSize: results.reduce((sum, r) => sum + (r.fileSize || 0), 0),
      averageSize: results.reduce((sum, r) => sum + (r.fileSize || 0), 0) / results.length,
      cacheHitRate: (results.filter(r => r.cached).length / results.length) * 100,
      webpAdoptionRate: (results.filter(r => r.format === 'webp').length / results.length) * 100,
      totalSavings: results.reduce((sum, r) => sum + (r.savings || 0), 0)
    };

    return batchResult;
  }

  /**
   * Check if image is cached
   */
  private async checkImageCache(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const cacheHeader = response.headers.get('x-cache');
      return cacheHeader?.includes('HIT') ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Estimate file size based on image properties
   */
  private estimateFileSize(img: HTMLImageElement, format: string): number {
    const { width, height } = img;
    const pixels = width * height;
    
    // Rough estimates based on format and compression
    const bytesPerPixel = {
      'webp': 0.3,
      'jpeg': 0.4,
      'png': 1.2,
      'avif': 0.2
    }[format] || 0.5;

    return Math.floor(pixels * bytesPerPixel);
  }

  /**
   * Compare performance between different optimization strategies
   */
  async compareOptimizations(url: string): Promise<{
    original: PerformanceTestResult;
    webp: PerformanceTestResult;
    cdn: PerformanceTestResult;
    improvements: {
      webpVsOriginal: { loadTimeImprovement: number; sizeSavings: number };
      cdnVsOriginal: { loadTimeImprovement: number; sizeSavings: number };
    };
  }> {
    const [original, webp, cdn] = await Promise.all([
      this.testImage(url, { useWebP: false, useCDN: false }),
      this.testImage(url, { useWebP: true, useCDN: false }),
      this.testImage(url, { useWebP: true, useCDN: true })
    ]);

    const improvements = {
      webpVsOriginal: {
        loadTimeImprovement: ((original.loadTime - webp.loadTime) / original.loadTime) * 100,
        sizeSavings: ((original.fileSize! - webp.fileSize!) / original.fileSize!) * 100
      },
      cdnVsOriginal: {
        loadTimeImprovement: ((original.loadTime - cdn.loadTime) / original.loadTime) * 100,
        sizeSavings: ((original.fileSize! - cdn.fileSize!) / original.fileSize!) * 100
      }
    };

    return { original, webp, cdn, improvements };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No test results available.';
    }

    const totalTests = this.results.length;
    const avgLoadTime = this.results.reduce((sum, r) => sum + r.loadTime, 0) / totalTests;
    const avgSize = this.results.reduce((sum, r) => sum + (r.fileSize || 0), 0) / totalTests;
    const cacheHitRate = (this.results.filter(r => r.cached).length / totalTests) * 100;
    const webpAdoptionRate = (this.results.filter(r => r.format === 'webp').length / totalTests) * 100;
    const totalSavings = this.results.reduce((sum, r) => sum + (r.savings || 0), 0);

    return `
📊 Image Optimization Performance Report
=====================================

📈 Overall Statistics:
• Total Images Tested: ${totalTests}
• Average Load Time: ${avgLoadTime.toFixed(2)}ms
• Average File Size: ${(avgSize / 1024).toFixed(2)} KB
• Cache Hit Rate: ${cacheHitRate.toFixed(1)}%
• WebP Adoption Rate: ${webpAdoptionRate.toFixed(1)}%
• Total Bandwidth Savings: ${(totalSavings / 1024).toFixed(2)} KB

🔍 Individual Results:
${this.results.map((result, index) => `
${index + 1}. ${result.testName}
   • Load Time: ${result.loadTime.toFixed(2)}ms
   • File Size: ${result.fileSize ? (result.fileSize / 1024).toFixed(2) + ' KB' : 'Unknown'}
   • Format: ${result.format}
   • Cached: ${result.cached ? 'Yes' : 'No'}
   • Optimized: ${result.optimized ? 'Yes' : 'No'}
   ${result.savings ? `• Savings: ${(result.savings / 1024).toFixed(2)} KB` : ''}
`).join('')}

💡 Recommendations:
${webpAdoptionRate < 80 ? '• Consider increasing WebP adoption for better compression' : ''}
${cacheHitRate < 50 ? '• Implement better caching strategies' : ''}
${avgLoadTime > 1000 ? '• Consider using CDN for faster delivery' : ''}
${totalSavings > 0 ? `• Great job! You saved ${(totalSavings / 1024).toFixed(2)} KB of bandwidth` : ''}
    `.trim();
  }

  /**
   * Clear all test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Get all results
   */
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }
}

// Create singleton instance
export const performanceTester = new PerformanceTester();

/**
 * Quick performance test function
 */
export const runQuickPerformanceTest = async (
  imageUrl: string
): Promise<PerformanceTestResult> => {
  return await performanceTester.testImage(imageUrl, {
    useWebP: true,
    useCDN: true,
    quality: 80
  });
};

/**
 * Comprehensive performance test
 */
export const runComprehensiveTest = async (
  imageUrls: string[]
): Promise<BatchTestResult> => {
  return await performanceTester.testBatch(imageUrls, {
    useWebP: true,
    useCDN: true,
    quality: 80,
    concurrent: true
  });
};
