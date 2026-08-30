# 10 — Heuristics tuning

**Depends on:** 03-05 working end to end (something to tune)
**Status:** not started

## Goal

Answer the remaining open questions from the app doc (section 8) with observations instead of
guesses, and centralize the knobs so tuning is a config change, not a code hunt.

## Current state

- Query tags are hard-coded in two templates (client + possibly server after step 09).
- `classifyLandUse` table is minimal; `MIN_ZOOM = 15` and `MIN_AREA_M2 = 50` are single
  constants; nothing has been validated against real data yet.

## Tasks

- [ ] Extract tuning knobs into one module (e.g. `lib/config.ts`): `QUERY_TAGS`, `MIN_ZOOM`,
      `MIN_AREA_M2`, classify/exclude tables — each with a one-line rationale comment.
- [ ] Experiment: what counts as "free land"? Test at least these policies over a known area: - only buildings subtracted, all landuse kept (most permissive); - exclude water/forest/park/protected (`natural=water|wood`, `leisure=park`,
      `boundary=protected_area`) — probably correct for "undeveloped land";
      record which policy feels right and set it as default.
- [ ] Tune `MIN_ZOOM` against response size and latency: compare zoom 14 vs 15 vs 16 on the
      same city area (bytes, elements count, seconds). Pick and record.
- [ ] Tune `MIN_AREA_M2`: sample the smallest polygons that are still meaningful on screen;
      adjust so slivers disappear without losing real plots.
- [ ] Land-use coverage check: collect actual `landuse`/`natural`/`leisure` tag values returned
      in a typical session; make sure `classifyLandUse` handles the frequent ones (no
      `unknown` flood).
- [ ] Write conclusions back into the app doc (section 8) as part of this step's PR.

## Implementation notes

- The UI does not change in this step except where a knob's effect is visible.
- Overpass etiquette: run comparisons on small bboxes, ideally against the same instance, and
  space requests out.

## Exit criteria

- [ ] All knobs live in one config module; no magic numbers left in `lib/`.
- [ ] Every section-8 open question has a recorded answer in the docs.
- [ ] lint / typecheck / test / build all green.

## Files touched

`src/lib/config.ts` (new), `src/lib/overpass.ts`, `src/lib/geometry.ts`,
`src/hooks/useViewportData.ts`, docs.
