# 09 — Proxy: build or delete

**Depends on:** usage experience from 02-08
**Status:** pending decision

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

## If building

- [ ] `server/package.json` (express, cors, tsx as dev runner) + README note — currently the
      file cannot even run, and the README's `cd server && npm install && npm run dev` fails.
- [ ] Validate `bbox` against `/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/` before interpolating
      anything into the query (query-injection hygiene, flagged in review).
- [ ] Reuse the same query template as the client (`buildOverpassQuery` exists in both places
      today — either extract to a shared module or accept one duplicated constant and note it).
- [ ] In-memory response cache keyed by grid-snapped bbox (mirror of step 07 logic).
- [ ] Client switches endpoint via `VITE_OVERPASS_PROXY_URL` env (documented in
      `.env.example`); direct URL remains the default so the app still works with no proxy.
- [ ] try/catch around fetch/JSON (already done) + timeout on the outbound request.

## If deleting

- [ ] Remove `server/`, update README (proxy section) and both docs (stack table row,
      section 3.6, deployment note).
- [ ] Keep the decision recorded in the app doc's open-questions section (closed: direct).

## Exit criteria

- [ ] Decision recorded with 2-3 sentences of observed evidence in this file.
- [ ] Either outcome leaves the repo consistent: no dead code, README matches reality.
- [ ] lint / typecheck / test / build all green.

## Files touched

`server/*` (or its deletion), `README.md`, `.env.example`, docs.
