# Instrumentation Matrix

This document standardizes span names and query fields for Honeycomb.

## Span Naming Convention

- `user.*` - direct user actions
- `workflow.*` - multi-step orchestration spans
- `mixtape.*` - core mixtape domain operations
- `spotify.*` - Spotify provider/API operations
- `db.*` - data layer operations (reserved for future persistence work)
- `page.*` - page lifecycle container spans
- `web_vital.*` - Core Web Vitals spans

## Current Span Matrix

| Span Name | Layer | Typical Parent | Purpose | Key Attributes |
|---|---|---|---|---|
| `user.fetch_spotify_track` | Frontend | `user.*` root | User trigger for Spotify search | `song.name`, `song.artist`, `user.action`, `api.endpoint` |
| `workflow.search_track` | Backend API | request root | Search endpoint orchestration | `http.route`, `spotify.search.song_name`, `http.response.status_code` |
| `spotify.search_track` | Backend provider | `workflow.search_track` | Spotify search API call | `spotify.search.song_name`, `spotify.search.result_count`, `http.response.status_code` |
| `mixtape.add_song` | Frontend | `user.*` or root | Add selected song to side | `song.name`, `song.artist`, `mixtape.side`, `mixtape.side_song_count` |
| `mixtape.remove_song` | Frontend | `user.*` or root | Remove song from side | `song.id`, `mixtape.side`, `mixtape.side_song_count` |
| `mixtape.validate_duration` | Frontend | `mixtape.*` | Side duration validation | `mixtape.duration_seconds`, `mixtape.max_duration_seconds`, `mixtape.over_limit` |
| `page.lifecycle` | Frontend | root | Parent page lifecycle trace context | `url.*`, `page.title` |
| `web_vital.fcp/lcp/cls/ttfb/inp` | Frontend | `page.lifecycle` | Performance metrics with page context | `web_vital.*`, `<metric>.value_ms`, `<metric>.rating` |

## Honeycomb Query Cookbook

### 1) Slow "Fetch from Spotify" actions

- Filter: `name = "user.fetch_spotify_track"`
- Break down by: `song.artist`, `song.name`
- Sort: `duration_ms desc`
- Inspect trace: confirm child spans include `workflow.search_track` and `spotify.search_track`.

### 2) UI -> backend correlation health check

- Filter: `trace.trace_id = <trace-id>`
- Expected: `user.fetch_spotify_track` -> `workflow.search_track` -> `spotify.search_track`
- Missing children indicates context propagation regressions.

### 3) Spotify API failures

- Filter: `name = "spotify.search_track" AND status_code = ERROR`
- Break down by: `error.type`, `http.response.status_code`

### 4) Song add/remove behavior

- Filter: `name in ("mixtape.add_song","mixtape.remove_song")`
- Break down by: `mixtape.side`, `user.action`
- Track spikes in `status_code = ERROR`.

### 5) Duration limit pressure

- Filter: `name = "mixtape.validate_duration"`
- Break down by: `mixtape.side`, `mixtape.over_limit`
- Use `COUNT` to understand which side is frequently over limit.

### 6) Poor Web Vitals with trace context

- Filter: `name starts-with "web_vital." AND web_vital.rating = "poor"`
- Break down by: `name`, `web_vital.navigation_type`
- Drill into trace to inspect adjacent user/workflow spans.
