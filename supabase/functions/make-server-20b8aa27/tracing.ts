import { trace, SpanKind, SpanStatusCode, type Span } from "npm:@opentelemetry/api";

const SERVICE_NAME = "mixtape-creator-api";
const SERVICE_VERSION = Deno.env.get("SERVICE_VERSION") || "0.1.0";

export const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
export { SpanKind, SpanStatusCode };
export type { Span };

export const ATTR = {
  HTTP_REQUEST_METHOD: "http.request.method",
  HTTP_RESPONSE_STATUS_CODE: "http.response.status_code",
  URL_FULL: "url.full",
  SERVER_ADDRESS: "server.address",
  PEER_SERVICE: "peer.service",
  ERROR_TYPE: "error.type",
  ERROR_MESSAGE: "error.message",
} as const;

export function setSpanError(span: Span, error: unknown, errorType?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message });
  span.setAttribute(ATTR.ERROR_MESSAGE, message);
  if (errorType) {
    span.setAttribute(ATTR.ERROR_TYPE, errorType);
  }
  if (error instanceof Error) {
    span.recordException(error);
  }
}

export function setSpanSuccess(span: Span): void {
  span.setStatus({ code: SpanStatusCode.OK });
}
