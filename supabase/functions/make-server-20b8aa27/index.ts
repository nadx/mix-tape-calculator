import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { searchSpotifyTrack } from "./spotify.ts";
import { tracer, SpanKind, ATTR, setSpanError, setSpanSuccess } from "./tracing.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-20b8aa27/health", (c) => {
  return c.json({ status: "ok" });
});

// Spotify track search endpoint
app.post("/make-server-20b8aa27/search-track", async (c) => {
  return tracer.startActiveSpan("workflow.search_track", {
    kind: SpanKind.SERVER,
    attributes: {
      [ATTR.HTTP_REQUEST_METHOD]: "POST",
      [ATTR.URL_FULL]: c.req.url,
      "http.route": "/make-server-20b8aa27/search-track",
    },
  }, async (span) => {
    try {
      const { songName, artist } = await c.req.json();
      span.setAttribute("spotify.search.song_name", songName || "");
      span.setAttribute("spotify.search.artist", artist || "");
      
      if (!songName) {
        span.setAttribute(ATTR.HTTP_RESPONSE_STATUS_CODE, 400);
        setSpanError(span, "Song name is required", "validation_error");
        return c.json({ error: "Song name is required" }, 400);
      }

      const result = await searchSpotifyTrack(songName, artist);
      
      if (result.error) {
        span.setAttribute(ATTR.HTTP_RESPONSE_STATUS_CODE, 500);
        setSpanError(span, result.error, "spotify_error");
        return c.json({ error: result.error }, 500);
      }

      span.setAttribute(ATTR.HTTP_RESPONSE_STATUS_CODE, 200);
      setSpanSuccess(span);
      return c.json(result);
    } catch (error) {
      console.log(`Error searching for track: ${error}`);
      span.setAttribute(ATTR.HTTP_RESPONSE_STATUS_CODE, 500);
      setSpanError(span, error, "internal_error");
      return c.json({ error: "Failed to search for track" }, 500);
    }
  });
});

Deno.serve(app.fetch);