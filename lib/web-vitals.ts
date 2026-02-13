/**
 * Web Vitals Performance Monitoring
 *
 * Tracks Core Web Vitals (LCP, FID, CLS, FCP, TTFB) to monitor
 * real user performance and identify optimization opportunities.
 *
 * Learn more: https://web.dev/vitals/
 */

import type { Metric } from 'web-vitals'

/**
 * Performance thresholds based on Google's recommendations
 * Good: green, Needs Improvement: yellow, Poor: red
 */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte
  INP: { good: 200, poor: 500 },        // Interaction to Next Paint
}

type Rating = 'good' | 'needs-improvement' | 'poor'

/**
 * Get performance rating for a metric
 */
function getRating(metric: Metric): Rating {
  const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS]
  if (!threshold) return 'good'

  if (metric.value <= threshold.good) return 'good'
  if (metric.value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Send metric to analytics endpoint
 */
async function sendToAnalytics(metric: Metric, rating: Rating) {
  try {
    // Send to internal analytics endpoint
    await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating,
        id: metric.id,
        navigationType: metric.navigationType,
        // Additional context
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
      // Don't wait for response
      keepalive: true,
    }).catch(() => {
      // Silently fail - don't block user experience for analytics
    })
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Log metric to console in development
 */
function logMetric(metric: Metric, rating: Rating) {
  if (process.env.NODE_ENV === 'development') {
    const color = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴'
    console.log(
      `${color} Web Vital: ${metric.name}`,
      `${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}`,
      `(${rating})`
    )
  }
}

/**
 * Report Web Vitals metrics
 * Called automatically by Next.js
 */
export function reportWebVitals(metric: Metric) {
  const rating = getRating(metric)

  // Log in development
  logMetric(metric, rating)

  // Send to analytics in production
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    sendToAnalytics(metric, rating)
  }

  // Send to Vercel Analytics if available
  if (typeof window !== 'undefined' && (window as any).va) {
    (window as any).va('track', 'Web Vitals', {
      metric: metric.name,
      value: metric.value,
      rating,
    })
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this from your app component
 */
export async function initWebVitals() {
  if (typeof window === 'undefined') return

  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals')

    onCLS(reportWebVitals)
    onFCP(reportWebVitals)
    onLCP(reportWebVitals)
    onTTFB(reportWebVitals)
    onINP(reportWebVitals)
  } catch (error) {
    // Web vitals library not available
    console.warn('Web Vitals tracking not available:', error)
  }
}

/**
 * Get current performance metrics
 * Useful for debugging or displaying in admin dashboards
 */
export function getPerformanceMetrics(): Record<string, number> {
  if (typeof window === 'undefined' || !window.performance) {
    return {}
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const paint = performance.getEntriesByType('paint')

  return {
    // Navigation timing
    dns: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcp: navigation?.connectEnd - navigation?.connectStart,
    ttfb: navigation?.responseStart - navigation?.requestStart,
    download: navigation?.responseEnd - navigation?.responseStart,
    domInteractive: navigation?.domInteractive,
    domComplete: navigation?.domComplete,
    loadComplete: navigation?.loadEventEnd,

    // Paint timing
    fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,

    // Resource timing
    totalResources: performance.getEntriesByType('resource').length,
  }
}
