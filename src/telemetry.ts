import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
  ATTR_URL_PATH,
  ATTR_URL_SCHEME,
} from '@opentelemetry/semantic-conventions';
import type { Context, Link, Span, SpanContext } from '@opentelemetry/api';
import { context as otelContext, trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

const SERVICE_NAME = 'mixtape-creator-tool';
const SERVICE_VERSION = '0.1.0';

const HONEYCOMB_API_KEY = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_HONEYCOMB_API_KEY) || '';
const HONEYCOMB_ENDPOINT = 'https://api.honeycomb.io/v1/traces';
const telemetryEnabled = Boolean(HONEYCOMB_API_KEY);

const exporter = telemetryEnabled
  ? new OTLPTraceExporter({
      url: HONEYCOMB_ENDPOINT,
      headers: {
        'x-honeycomb-team': HONEYCOMB_API_KEY,
        'x-honeycomb-dataset': 'mixtape-creator-tool',
      },
    })
  : null;

function detectBrowserEngine(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chromium';
  if (ua.includes('firefox')) return 'gecko';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'webkit';
  if (ua.includes('edg')) return 'chromium';
  return 'unknown';
}

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  'deployment.environment.name': (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) || 'production',
  'webengine.name': detectBrowserEngine(),
});

class FilteringSpanProcessor implements SpanProcessor {
  private readonly ignoredSpanNames = new Set([
    'fetchStart',
    'responseStart',
    'responseEnd',
    'connectStart',
    'connectEnd',
    'domainLookupStart',
    'domainLookupEnd',
    'secureConnectionStart',
    'requestStart',
  ]);

  constructor(private readonly delegate: SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.delegate.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    this.delegate.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (this.ignoredSpanNames.has(span.name)) return;
    this.delegate.onEnd(span);
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }
}

const provider = new WebTracerProvider({
  resource,
  spanProcessors: exporter
    ? [
        new FilteringSpanProcessor(new BatchSpanProcessor(exporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        })),
      ]
    : [],
});

provider.register({
  contextManager: new ZoneContextManager(),
});

function getInteractionTargetLabel(element: Element): string {
  const htmlElement = element as HTMLElement;
  const explicitLabel =
    htmlElement.getAttribute('aria-label') ||
    htmlElement.getAttribute('name') ||
    htmlElement.id ||
    htmlElement.getAttribute('data-testid');

  if (explicitLabel) return explicitLabel.trim().toLowerCase().replace(/\s+/g, '_');

  const textLabel = (htmlElement.textContent || '').trim().slice(0, 40).toLowerCase().replace(/\s+/g, '_');
  if (textLabel) return textLabel;
  return htmlElement.tagName.toLowerCase();
}

let latestInteractionSpanContext: SpanContext | null = null;

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-xml-http-request': {
        enabled: true,
        clearTimingResources: true,
        ignoreUrls: [/api\.honeycomb\.io/],
      },
      '@opentelemetry/instrumentation-fetch': {
        enabled: true,
        ignoreUrls: [/api\.honeycomb\.io/],
      },
      '@opentelemetry/instrumentation-user-interaction': {
        enabled: true,
        eventNames: ['click', 'keypress'],
        shouldPreventSpanCreation: (event: Event, element: Element, span: Span) => {
          const htmlElement = element as HTMLElement;
          const interactionLabel = getInteractionTargetLabel(element);
          span.setAttribute('user.event.type', event.type);
          span.setAttribute('user.event.target_tag', htmlElement.tagName.toLowerCase());
          span.setAttribute('user.event.target_label', interactionLabel);
          span.setAttribute('user.event.path', window.location.pathname);

          const spanWithUpdate = span as Span & { updateName?: (name: string) => void };
          if (typeof spanWithUpdate.updateName === 'function') {
            spanWithUpdate.updateName(`user.${event.type}.${interactionLabel}`);
          }
          latestInteractionSpanContext = span.spanContext();
          return false;
        },
      },
      '@opentelemetry/instrumentation-document-load': {
        enabled: true,
      },
    }),
  ],
});

const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
let pageLifecycleSpan: Span | null = null;
let pageLifecycleContext = otelContext.active();
let pageLifecycleEnded = false;

function startPageLifecycleSpan(): void {
  if (typeof window === 'undefined' || pageLifecycleSpan) return;

  pageLifecycleSpan = tracer.startSpan('page.lifecycle', {
    kind: SpanKind.INTERNAL,
    attributes: {
      [ATTR_URL_FULL]: window.location.href,
      [ATTR_URL_PATH]: window.location.pathname,
      [ATTR_URL_SCHEME]: window.location.protocol.slice(0, -1),
      'url.domain': window.location.hostname,
      'page.title': document.title || 'unknown',
    },
  });
  pageLifecycleContext = trace.setSpan(otelContext.active(), pageLifecycleSpan);
}

function endPageLifecycleSpan(reason: string): void {
  if (!pageLifecycleSpan || pageLifecycleEnded) return;
  pageLifecycleSpan.setStatus({ code: SpanStatusCode.OK, message: reason });
  pageLifecycleSpan.end();
  pageLifecycleEnded = true;
}

function reportWebVital(metric: Metric) {
  const spanName = `web_vital.${metric.name.toLowerCase()}`;
  const attributes: Record<string, string | number | boolean> = {
    [ATTR_URL_FULL]: window.location.href,
    [ATTR_URL_PATH]: window.location.pathname,
    [ATTR_URL_SCHEME]: window.location.protocol.slice(0, -1),
    'url.domain': window.location.hostname,
    'web_vital.name': metric.name,
    'web_vital.value': metric.value,
    'web_vital.delta': metric.delta,
    'web_vital.id': metric.id,
    'web_vital.rating': metric.rating,
    'web_vital.navigation_type': metric.navigationType,
  };

  const metricKey = metric.name.toLowerCase();
  attributes[`${metricKey}.value_ms`] = metric.value;
  attributes[`${metricKey}.rating`] = metric.rating;

  const links: Link[] = [];
  if (metric.name === 'INP' && latestInteractionSpanContext) {
    links.push({
      context: latestInteractionSpanContext,
      attributes: { 'link.type': 'causal.user_interaction' },
    });
  }

  const span = tracer.startSpan(spanName, {
    kind: SpanKind.INTERNAL,
    attributes,
    links,
  }, pageLifecycleContext);

  if (metric.rating === 'good') {
    span.setStatus({ code: SpanStatusCode.OK });
  } else if (metric.rating === 'poor') {
    span.setStatus({ code: SpanStatusCode.ERROR, message: `Poor ${metric.name} performance: ${metric.value}` });
  }

  span.end();
}

if (typeof window !== 'undefined') {
  startPageLifecycleSpan();

  window.addEventListener('pagehide', () => endPageLifecycleSpan('pagehide'), { once: true });
  window.addEventListener('beforeunload', () => endPageLifecycleSpan('beforeunload'), { once: true });

  if (document.readyState === 'complete') {
    window.setTimeout(() => endPageLifecycleSpan('document_complete_timeout'), 15000);
  } else {
    window.addEventListener('load', () => {
      window.setTimeout(() => endPageLifecycleSpan('window_load_timeout'), 15000);
    }, { once: true });
  }

  onLCP(reportWebVital);
  onCLS(reportWebVital);
  onFCP(reportWebVital);
  onTTFB(reportWebVital);
  onINP(reportWebVital);

  if (!telemetryEnabled && (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV)) {
    console.warn('[OpenTelemetry] Honeycomb disabled: VITE_HONEYCOMB_API_KEY not set');
  }
}
