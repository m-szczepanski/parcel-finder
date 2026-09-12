# Implementation Steps

One feature per file, ordered by dependency. Work top to bottom; files 06-08 and 12 can run in
parallel once the core chain (01-05) is done.

## Order and dependencies

```text
01 Map view ──► 02 Overpass pipeline ──► 03 Free-land geometry ──► 04 Free-land layer ──► 05 Side panel
                                                        │
06 Basemap toggle ──────────────────────────────────────┤ (needs 01)
07 Viewport caching ────────────────────────────────────┤ (needs 02)
08 States and feedback ─────────────────────────────────┤ (needs 02-05)
12 Taken sites on the map ──────────────────────────────┤ (needs 03-05)
09 Proxy: build or delete ──────────────────────────────┤ (decision after 02-08 usage)
10 Heuristics tuning ───────────────────────────────────┤ (needs 03-05 to experiment on)
11 Docs and repo hygiene ───────────────────────────────┘ (anytime, do before closing the milestone)
```

Interaction model (product decision): hover highlights **empty** sites only (transparent gray);
clicking a site opens a side panel from the right — taken sites (buildings, forest, water) show
a "taken" notice in the same panel instead of any hover effect. The selected site keeps a
highlighted outline (emerald for empty, red for taken) and the panel dims the map lightly
without blurring. Step 12 implemented: taken sites are also marked red on the map, and landuse
polygons containing buildings count as taken as a whole (no green remainder with a hole).

## Status

| Step | Feature                | Status |
| ---- | ---------------------- | ------ |
| 01   | Map view               | done   |
| 02   | Overpass data pipeline | done   |
| 03   | Free-land geometry     | done   |
| 04   | Free-land layer        | done   |
| 05   | Side panel (Sheet)     | done   |
| 06   | Basemap toggle         | done   |
| 07   | Viewport caching       | done   |
| 08   | States and feedback    | done   |
| 09   | Proxy: build or delete | done   |
| 10   | Heuristics tuning      | done   |
| 11   | Docs and repo hygiene  | done   |
| 12   | Taken sites on the map | done   |

## Ground rules

- Minimal dependencies: hand-roll small utilities (debounce, formatting) before adding packages.
- Every step ends with `npm run lint && npm run typecheck && npm test && npm run build` green.
- One PR/commit-series per step keeps reviews and revert paths clean.
- Anything requiring a product decision gets recorded in the step file, then synced back into
  `docs/parcel-finder-app-documentation.md` (section 8) as part of step 11.
