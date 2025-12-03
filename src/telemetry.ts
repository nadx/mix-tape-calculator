import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { 
  SEMRESATTRS_SERVICE_NAME, 
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_WEBENGINE_NAME,
} from '@opentelemetry/semantic-conventions';
import { trace, SpanKind } from '@opentelemetry/api';
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

// Honeycomb configuration
const HONEYCOMB_API_KEY = import.meta.env.VITE_HONEYCOMB_API_KEY;
const HONEYCOMB_ENDPOINT = 'https://api.honeycomb.io/v1/traces';

// Create OTLP exporter for Honeycomb (only if API key is configured)
const exporter = HONEYCOMB_API_KEY ? new OTLPTraceExporter({
  url: HONEYCOMB_ENDPOINT,
  headers: {
    'x-honeycomb-team': HONEYCOMB_API_KEY,
    'x-honeycomb-dataset': 'mixtape-creator-tool',
  },
}) : null;

// Detect browser engine from user agent
function detectBrowserEngine(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chromium';
  if (ua.includes('firefox')) return 'gecko';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'webkit';
  if (ua.includes('edg')) return 'chromium';
  return 'unknown';
}

// Create resource with service information following semantic conventions
const resource = resourceFromAttributes({
  [SEMRESATTRS_SERVICE_NAME]: 'mixtape-creator-tool',
  [SEMRESATTRS_SERVICE_VERSION]: '0.1.0',
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) || 'production',
  [SEMRESATTRS_WEBENGINE_NAME]: detectBrowserEngine(),
});

// Create tracer provider with batch processor (only if exporter is configured)
if (exporter) {
  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        // Batch configuration for efficient export
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
      }),
    ],
  });

  // Register the provider with ZoneContextManager for async support
  provider.register({
    contextManager: new ZoneContextManager(),
  });
}

// Register auto-instrumentations using the meta package (only if exporter is configured)
if (exporter) {
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        // Configure individual instrumentations if needed
        '@opentelemetry/instrumentation-xml-http-request': {
          enabled: true,
          clearTimingResources: true,
          // Ignore Supabase Edge Function endpoints and Honeycomb API to prevent interference
          ignoreUrls: [
            /supabase\.co/,
            /api\.honeycomb\.io/,
          ],
        },
        '@opentelemetry/instrumentation-fetch': {
          enabled: true,
          // Ignore Supabase Edge Function endpoints and Honeycomb API to prevent interference
          // Honeycomb API calls should not be instrumented (they're telemetry exports themselves)
          ignoreUrls: [
            /supabase\.co/,
            /api\.honeycomb\.io/,
          ],
        },
        '@opentelemetry/instrumentation-user-interaction': {
          enabled: true,
          // Instrument click and keypress events
          eventNames: ['click', 'keypress'],
        },
        '@opentelemetry/instrumentation-document-load': {
          enabled: true,
          // Ensure document load instrumentation captures all timing events
          // This will create spans for documentFetch, documentLoad, and resourceFetch
        },
      }),
    ],
  });
}

// Get tracer for Core Web Vitals
const tracer = trace.getTracer('mixtape-creator-tool', '0.1.0');

// Helper function to create spans for Core Web Vitals metrics
// Following OpenTelemetry semantic conventions for web performance metrics
// See: https://opentelemetry.io/docs/specs/semconv/web/web-vitals/
function reportWebVital(metric: Metric) {
  // Span name following semantic conventions
  const spanName = `web.vitals.${metric.name.toLowerCase()}`;
  
  // Build attributes following semantic conventions
  const attributes: Record<string, string | number> = {
    // Entry page path (semantic convention)
    'entry_page.path': window.location.pathname,
    // URL context following semantic conventions (see: https://opentelemetry.io/docs/specs/semconv/http/)
    'url.full': window.location.href,
    'url.path': window.location.pathname,
    'url.scheme': window.location.protocol.slice(0, -1),
    'url.host': window.location.hostname,
    // Common web vitals attributes
    'web.vitals.delta': metric.delta,
    'web.vitals.id': metric.id,
    'web.vitals.navigation_type': metric.navigationType,
  };
  
  // Map metric-specific attributes following semantic conventions
  switch (metric.name) {
    case 'LCP':
      attributes['lcp.value'] = metric.value;
      attributes['lcp.rating'] = metric.rating;
      break;
    case 'CLS':
      attributes['cls.value'] = metric.value;
      attributes['cls.rating'] = metric.rating;
      break;
    case 'INP':
      attributes['inp.value'] = metric.value;
      attributes['inp.rating'] = metric.rating;
      break;
    case 'TTFB':
      attributes['ttfb'] = metric.value;
      // TTFB doesn't have a rating in the same way, but include it for consistency
      if (metric.rating) {
        attributes['web.vitals.rating'] = metric.rating;
      }
      break;
    case 'FCP':
      // FCP uses standard web.vitals naming
      attributes['web.vitals.first_contentful_paint'] = metric.value;
      if (metric.rating) {
        attributes['web.vitals.rating'] = metric.rating;
      }
      break;
    default:
      // Fallback for any other metrics
      attributes[`web.vitals.${String(metric.name).toLowerCase()}`] = metric.value;
      if (metric.rating) {
        attributes['web.vitals.rating'] = metric.rating;
      }
  }
  
  const span = tracer.startSpan(spanName, {
    kind: SpanKind.INTERNAL, // SPAN_KIND_INTERNAL for application-internal operations
    attributes,
  });
  
  // Set status based on rating (following semantic conventions)
  // Status code 1 = OK, Status code 2 = ERROR
  if (metric.rating === 'good') {
    span.setStatus({ code: 1 }); // OK
  } else if (metric.rating === 'needs-improvement') {
    span.setStatus({ code: 2 }); // ERROR (needs improvement)
  } else {
    span.setStatus({ code: 2 }); // ERROR (poor)
  }
  
  span.end();
}

// Initialize Core Web Vitals tracking
// These metrics follow OpenTelemetry semantic conventions for web performance
if (typeof window !== 'undefined' && exporter) {
  // Largest Contentful Paint (LCP)
  onLCP(reportWebVital);
  
  // Cumulative Layout Shift (CLS)
  onCLS(reportWebVital);
  
  // First Contentful Paint (FCP)
  onFCP(reportWebVital);
  
  // Time to First Byte (TTFB)
  onTTFB(reportWebVital);
  
  // Interaction to Next Paint (INP) - new Core Web Vital
  onINP(reportWebVital);
  
  console.log('OpenTelemetry initialized for browser instrumentation with auto-instrumentations and Core Web Vitals');
}
