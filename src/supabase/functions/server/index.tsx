import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { searchSpotifyTrack } from "./spotify.tsx";

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
  try {
    const { songName, artist } = await c.req.json();
    
    if (!songName) {
      return c.json({ error: "Song name is required" }, 400);
    }

    const result = await searchSpotifyTrack(songName, artist);
    
    if (result.error) {
      return c.json({ error: result.error }, 500);
    }

    return c.json(result);
  } catch (error) {
    console.log(`Error searching for track: ${error}`);
    return c.json({ error: "Failed to search for track" }, 500);
  }
});

Deno.serve(app.fetch);