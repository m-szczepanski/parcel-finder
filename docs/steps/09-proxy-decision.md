# 09 — Proxy: build or delete

**Depends on:** usage experience from 02-08
**Status:** done — proxy deleted

## Goal

Resolve open question 3 from the app documentation (section 8): is the thin Express proxy
needed for v1, or do direct client-side Overpass calls suffice? Then either finish `server/`
properly or remove it. Do not leave it half-wired.

## Decision criteria

Build the proxy if, during steps 02-08, any of these happen repeatedly:

- Overpass responds 429/504 (rate limiting) during normal personal use;
- CORS or timeout flakiness degrades the experience;
- cache hit rate stays low because fresh bboxes are common.

Delete/defer if direct calls feel stable across a few weeks of casual use.

## Decision

**Deleted.** During development across steps 02-08, direct client-side Overpass calls were
stable: no persistent 429/504 rate limiting, no CORS issues, and no timeout flakiness during
normal use. Request volume stays low thanks to grid-snapped bbox caching (step 07), zoom
gating, and debouncing, with two-endpoint failover + one retry covering occasional transient
rate limits. `server/` was only a never-run prototype (no `package.json`) with no caching, no
bbox validation, and a query template that had drifted from the client's — building it out
would have added complexity for no observed benefit. Revisit if usage grows (e.g. multiple
users or heavy daily use), at which point an in-memory cache behind a single forwarder is the
smallest viable option.

## If building

- [ ] ~~`server/package.json` (express, cors, tsx as dev runner) + README note~~ — n/a, deleted
- [ ] ~~Validate `bbox` against `/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/`~~ — n/a, deleted
- [ ] ~~Reuse the same query template as the client~~ — n/a, deleted
- [ ] ~~In-memory response cache keyed by grid-snapped bbox~~ — n/a, deleted
- [ ] ~~Client switches endpoint via `VITE_OVERPASS_PROXY_URL` env~~ — n/a, deleted
- [ ] ~~try/catch around fetch/JSON + timeout on the outbound request~~ — n/a, deleted

## If deleting

- [x] Remove `server/`, update README (proxy section) and both docs (stack table row,
      section 3.6, deployment note).
- [x] Keep the decision recorded in the app doc's open-questions section (closed: direct).

## Exit criteria

- [x] Decision recorded with 2-3 sentences of observed evidence in this file.
- [x] Either outcome leaves the repo consistent: no dead code, README matches reality.
- [x] lint / typecheck / test / build all green.

## Files touched

`server/*` (deleted), `README.md`, both `docs/` files.