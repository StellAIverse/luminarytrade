/**
 * Example component demonstrating image optimization features
 */

import React, { useState } from 'react';
import OptimizedImage from '../OptimizedImage';
import LazyImage from '../LazyImage';
import { useImagePerformance, useImageBatchPerformance } from '../../hooks/useImagePerformance';
import { configureCDN } from '../../utils/cdnConfig';

// Configure CDN for this example
configureCDN({
  provider: 'custom',
  baseUrl: 'https://cdn.luminarytrade.com/image',
  defaultQuality: 80,
  enableWebP: true
});

const ImageOptimizationExample: React.FC = () => {
  const [showMetrics, setShowMetrics] = useState(false);
  const { metrics: singleMetrics, getPerformanceSummary } = useImagePerformance({
    enableLogging: true,
    trackLoadTime: true,
    trackFileSize: true
  });
  
  const { batchMetrics, getBatchSummary } = useImageBatchPerformance();

  const sampleImages = [
    {
      id: 1,
      url: 'https://picsum.photos/800/600?random=1',
      alt: 'Sample landscape image 1',
      width: 800,
      height: 600
    },
    {
      id: 2,
      url: 'https://picsum.photos/600/400?random=2',
      alt: 'Sample landscape image 2',
      width: 600,
      height: 400
    },
    {
      id: 3,
      url: 'https://picsum.photos/400/400?random=3',
      alt: 'Sample square image',
      width: 400,
      height: 400
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ 
        fontSize: '32px', 
        fontWeight: 'bold', 
        marginBottom: '24px',
        color: '#1f2937'
      }}>
        Image Optimization Examples
      </h1>

      {/* Performance Summary */}
      <div style={{
        background: '#f3f4f6',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '32px'
      }}>
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: showMetrics ? '16px' : '0'
          }}
        >
          {showMetrics ? 'Hide' : 'Show'} Performance Metrics
        </button>

        {showMetrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {singleMetrics && (
              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Last Image Performance
                </h3>
                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  <div>Load Time: {singleMetrics.loadTime.toFixed(2)}ms</div>
                  <div>Format: {singleMetrics.format}</div>
                  <div>Dimensions: {singleMetrics.dimensions.width}x{singleMetrics.dimensions.height}</div>
                  <div>WebP Supported: {singleMetrics.webpSupported ? 'Yes' : 'No'}</div>
                  <div>Cached: {singleMetrics.cached ? 'Yes' : 'No'}</div>
                  {singleMetrics.fileSize && (
                    <div>Estimated Size: {(singleMetrics.fileSize / 1024).toFixed(2)} KB</div>
                  )}
                </div>
              </div>
            )}

            {getBatchSummary() && (
              <div style={{
                background: 'white',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Batch Performance Summary
                </h3>
                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  <div>Images Loaded: {getBatchSummary()!.imageCount}</div>
                  <div>Average Load Time: {getBatchSummary()!.averageLoadTime}</div>
                  <div>Cache Hit Rate: {getBatchSummary()!.cacheHitRate}</div>
                  <div>WebP Adoption: {getBatchSummary()!.webpAdoptionRate}</div>
                  <div>Performance: {getBatchSummary()!.performance}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Basic Optimized Image */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#374151' }}>
          Basic Optimized Image
        </h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Fully optimized with WebP, lazy loading, and performance tracking.
        </p>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          <OptimizedImage
            src="https://picsum.photos/800/400?random=basic"
            alt="Basic optimized image example"
            width={800}
            height={400}
            quality={80}
            format="webp"
            enablePerformanceTracking={true}
            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
          />
        </div>
      </section>

      {/* Responsive Images */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#374151' }}>
          Responsive Images with Multiple Breakpoints
        </h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Automatically serves different image sizes based on viewport.
        </p>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          <OptimizedImage
            src="https://picsum.photos/1200/600?random=responsive"
            alt="Responsive image example"
            responsive={true}
            breakpoints={[
              { width: 320, height: 160 },
              { width: 640, height: 320 },
              { width: 1024, height: 512 },
              { width: 1200, height: 600 }
            ]}
            quality={75}
            format="webp"
            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
          />
        </div>
      </section>

      {/* Priority Image (Above the Fold) */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#374151' }}>
          Priority Image (Above the Fold)
        </h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Preloaded for immediate display, no lazy loading.
        </p>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          <OptimizedImage
            src="https://picsum.photos/600/300?random=priority"
            alt="Priority image example"
            width={600}
            height={300}
            priority={true}
            lazy={false}
            quality={85}
            format="webp"
            enablePerformanceTracking={true}
            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
          />
        </div>
      </section>

      {/* Image Gallery */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#374151' }}>
          Image Gallery with Lazy Loading
        </h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Multiple images with lazy loading and performance tracking.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {sampleImages.map((image) => (
            <div key={image.id} style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
              <OptimizedImage
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                quality={70}
                format="webp"
                lazy={true}
                responsive={true}
                enablePerformanceTracking={true}
                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* CDN Integration */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#374151' }}>
          CDN Integration
        </h2>
        <p style={{ marginBottom: '16px', color: '#6b7280' }}>
          Images proxied through CDN with automatic optimization.
        </p>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          <OptimizedImage
            src="https://picsum.photos/800/500?random=cdn"
            alt="CDN optimized image example"
            width={800}
            height={500}
            useCDN={true}
            quality={75}
            format="webp"
            style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
          />
        </div>
      </section>

      {/* Usage Instructions */}
      <section style={{ 
        background: '#eff6ff', 
        padding: '24px', 
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#1e40af' }}>
          Usage Instructions
        </h2>
        <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#1e40af' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>Basic Usage:</strong>
          </p>
          <pre style={{ 
            background: '#f0f9ff', 
            padding: '12px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
{`<OptimizedImage
  src="path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  quality={80}
  format="webp"
  lazy={true}
  responsive={true}
/>`}
          </pre>

          <p style={{ marginBottom: '12px', marginTop: '16px' }}>
            <strong>Performance Benefits:</strong>
          </p>
          <ul style={{ marginLeft: '20px' }}>
            <li>WebP format reduces file size by ~30%</li>
            <li>Lazy loading improves initial page load</li>
            <li>Responsive images serve appropriate sizes</li>
            <li>CDN integration provides automatic optimization</li>
            <li>Performance tracking helps identify issues</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default ImageOptimizationExample;
