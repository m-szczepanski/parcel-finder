# Implementation Steps

One feature per file, ordered by dependency. Work top to bottom; files 06-08 can run in
parallel once the core chain (01-05) is done.

## Order and dependencies

```text
01 Map view ──► 02 Overpass pipeline ──► 03 Free-land geometry ──► 04 Free-land layer ──► 05 Side panel
                                                        │
06 Basemap toggle ──────────────────────────────────────┤ (needs 01)
07 Viewport caching ────────────────────────────────────┤ (needs 02)
08 States and feedback ─────────────────────────────────┤ (needs 02-05)
09 Proxy: build or delete ──────────────────────────────┤ (decision after 02-08 usage)
10 Heuristics tuning ───────────────────────────────────┤ (needs 03-05 to experiment on)
11 Docs and repo hygiene ───────────────────────────────┘ (anytime, do before closing the milestone)
```

Interaction model (product decision): hover highlights **empty** sites only (transparent gray);
clicking a site opens a side panel from the right — taken sites (buildings, forest, water) show
a "taken" notice in the same panel instead of any hover effect.

## Status

| Step | Feature                | Status           |
| ---- | ---------------------- | ---------------- |
| 01   | Map view               | not started      |
| 02   | Overpass data pipeline | not started      |
| 03   | Free-land geometry     | not started      |
| 04   | Free-land layer        | not started      |
| 05   | Side panel (Sheet)     | not started      |
| 06   | Basemap toggle         | not started      |
| 07   | Viewport caching       | not started      |
| 08   | States and feedback    | not started      |
| 09   | Proxy: build or delete | pending decision |
| 10   | Heuristics tuning      | not started      |
| 11   | Docs and repo hygiene  | not started      |

## Ground rules

- Minimal dependencies: hand-roll small utilities (debounce, formatting) before adding packages.
- Every step ends with `npm run lint && npm run typecheck && npm test && npm run build` green.
- One PR/commit-series per step keeps reviews and revert paths clean.
- Anything requiring a product decision gets recorded in the step file, then synced back into
  `docs/parcel-finder-app-documentation.md` (section 8) as part of step 11.
