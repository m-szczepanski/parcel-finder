# Parcel Finder — Project Documentation

**Type:** Personal learning project (web app)
**Status:** Concept / early design

## 1. Purpose

Parcel Finder is a web application that helps a user visually discover **likely unused / undeveloped land** within a map area they are exploring.

The core interaction is exploratory, not query-based:

1. The user opens the app and is shown an interactive map (OpenStreetMap-based, satellite toggle available).
2. The user navigates to a location of interest.
3. As the user moves the mouse over the map, any polygon representing land classified as likely empty (no buildings, no obvious development) is **highlighted on hover**.
4. When a polygon is highlighted, a **sidebar panel** shows available data about it — e.g. land-use type, estimated area, and (optionally) a nearby address.

There is **no dependency on official cadastral registries**. All spatial data is sourced from OpenStreetMap, computed client-side (or via a thin caching proxy) using open geometry tooling. The identified "free sites" are therefore a **heuristic approximation**, not a legal/cadastral statement — this is explicitly a discovery/exploration tool, not a source of truth for property boundaries or ownership.

### Goals

- Learn a modern, practical frontend + geospatial stack end to end.
- Build a genuinely fun, playable "explore the map" experience.
- Keep the whole stack free / API-key-free where possible.

### Non-goals (for v1)

- Legal accuracy of parcel boundaries or ownership data.
- Automatic land subdivision / buildability analysis (possible future stretch goal).
- Mobile-native app — this is a web app only.

## 2. Core User Flow

```
Open app → Map loads (last known / default location)
   → User pans/zooms to an area of interest
   → App fetches OSM data (buildings + landuse) for current viewport
      (only above a minimum zoom level, debounced, cached per bbox)
   → App computes "candidate free land" polygons
      (landuse/landcover polygons minus building footprints)
   → Polygons rendered as an interactive GeoJSON layer
   → On mouseover: polygon highlights, sidebar updates with its data
   → On mouseout: polygon returns to default style
```

## 3. Tech Stack

| Concern                  | Choice                                         | Notes                                                                                          |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Language                 | TypeScript                                     | type safety across map/geometry code                                                           |
| Framework                | React 18+                                      | component model, large ecosystem                                                               |
| Build tool               | Vite                                           | fast dev server, minimal config                                                                |
| UI components            | shadcn/ui                                      | accessible, unstyled-by-default components (sidebar, cards, toggles, dialogs)                  |
| Styling                  | Tailwind CSS                                   | required by / pairs with shadcn/ui                                                             |
| Icons                    | lucide-react                                   | ships alongside shadcn/ui by convention                                                        |
| Mapping library          | Leaflet + react-leaflet                        | free, no API key, mature plugin ecosystem, native per-feature hover events                     |
| Base tiles               | OpenStreetMap standard tiles                   | default basemap                                                                                |
| Imagery toggle           | Esri World Imagery (free XYZ tiles)            | visual sanity-check for "is this really empty?"                                                |
| Spatial data source      | Overpass API                                   | buildings (`building=*`) and landuse/landcover (`landuse=*`, `natural=*`) for current viewport |
| Geometry engine          | Turf.js                                        | `difference`, `area`, `bbox`, optionally `booleanPointInPolygon`                               |
| Geocoding (optional)     | Nominatim (OSM)                                | reverse-geocode a nearby address for the sidebar                                               |
| Backend (optional, thin) | Node.js + Express (or a serverless function)   | proxies/caches Overpass requests to avoid CORS and client-side rate-limit issues               |
| State management         | React state / Context (or Zustand if it grows) | no need for Redux at this scale                                                                |
| Package manager          | pnpm (or npm)                                  | personal preference, pnpm is fast and disk-efficient                                           |
| Hosting                  | Vercel / Netlify / Cloudflare Pages            | free tier is sufficient for a personal project                                                 |

## 4. Dependencies

### 4.1 Runtime dependencies

```
react
react-dom
react-leaflet
leaflet
@turf/turf
tailwindcss
class-variance-authority   # used internally by shadcn/ui components
clsx
tailwind-merge
lucide-react
```

### 4.2 shadcn/ui

shadcn/ui is not installed as a single package — components are generated into the project source via its CLI, backed by Radix UI primitives. Relevant Radix packages get added automatically per component used, e.g.:

```
@radix-ui/react-dialog
@radix-ui/react-tooltip
@radix-ui/react-toggle
@radix-ui/react-slot
```

### 4.3 Dev dependencies

```
typescript
vite
@vitejs/plugin-react
@types/react
@types/react-dom
@types/leaflet
eslint
eslint-plugin-react-hooks
prettier
tailwindcss (postcss + autoprefixer)
```

### 4.4 Optional (backend proxy, if used)

```
express
node-fetch (or native fetch on modern Node)
cors
```

---

## 5. Data Sources

| Source                     | Purpose                                          | Auth required | Notes                                                                                          |
| -------------------------- | ------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| OpenStreetMap tile servers | Base map tiles                                   | No            | Standard OSM tile usage policy applies (reasonable request volume)                             |
| Esri World Imagery         | Satellite basemap toggle                         | No            | Free XYZ tile endpoint                                                                         |
| Overpass API               | Building + landuse polygons for current viewport | No            | Public instances are rate-limited; a self-hosted or cached proxy is recommended if usage grows |
| Nominatim                  | Reverse geocoding for sidebar address (optional) | No            | Usage policy limits request rate; cache results                                                |

**No connection to official cadastral/geoportal services (e.g. GUGiK WMS/WFS) is used in this version.** This is a deliberate scope decision to keep the app data-source-simple and key-free; it can be revisited later if legally accurate parcel boundaries become a goal.

---

## 6. Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  React App                    │
│  ┌───────────────┐   ┌─────────────────────┐ │
│  │   Map Panel    │   │   Sidebar (shadcn)  │ │
│  │  (Leaflet map) │──▶│  site details view  │ │
│  └───────┬────────┘   └─────────────────────┘ │
│          │ hover events (per-feature)          │
│          ▼                                     │
│  ┌────────────────────────┐                    │
│  │ GeoJSON "free land"     │                    │
│  │ layer (computed)        │                    │
│  └───────────┬─────────────┘                    │
│              │ turf.difference(landuse, bldgs)  │
│              ▼                                  │
│  ┌────────────────────────┐                     │
│  │ Overpass fetch (bbox,   │                     │
│  │ debounced on moveend)   │                     │
│  └───────────┬─────────────┘                     │
└──────────────┼────────────────────────────────────┘
               ▼
     (optional) caching proxy ──▶ Overpass API
```

## 7. Build Milestones

1. **Skeleton** — Vite + React + TS project, Tailwind + shadcn/ui set up, Leaflet map rendering with OSM base tiles.
2. **Data fetch** — Overpass query wired to map viewport (`moveend`), debounced, gated by minimum zoom.
3. **Geometry computation** — buildings subtracted from landuse polygons via Turf, rendered as a GeoJSON layer.
4. **Interaction** — hover highlight + sidebar data panel (shadcn `Sheet`/`Card`) showing land-use type, computed area, optional nearest address.
5. **Polish** — satellite imagery toggle, bbox-based caching, loading/error states, basic empty-state handling.
6. **Stretch goals** — subdivision suggestion logic, saved/favorited sites (local storage), shareable links to a given map view.

## 8. Open Questions / Decisions To Revisit

- Should "free land" heuristics also exclude protected/natural areas (parks, forests, water) or only buildings? (Affects Overpass query tags and the `difference` logic.)
- Minimum zoom level to trigger Overpass fetches — needs tuning against Overpass rate limits and UX responsiveness.
- Whether a backend proxy is needed for v1, or whether direct client-side Overpass calls are sufficient for personal use.
