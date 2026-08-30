# Parcel Finder

A personal web app for exploring a map and discovering likely unused/undeveloped land by hovering over areas — no cadastral registry connection required.

> See [`parcel-finder-app-documentation.md`](./parcel-finder-app-documentation.md) for purpose, tech stack, and dependencies.
> See [`parcel-finder-technical-implementation.md`](./parcel-finder-technical-implementation.md) for architecture and implementation details.

## What it does

1. Open the app — a map loads (OpenStreetMap tiles, satellite toggle available).
2. Pan/zoom to an area of interest.
3. Hover over the map: any polygon likely representing empty land (landuse minus building footprints) highlights.
4. The sidebar shows details about the hovered site — land-use type, estimated area, nearby address (optional).

All spatial data comes from OpenStreetMap (via the Overpass API) — no API keys, no official registry integration.

## Tech stack

- React + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- Leaflet + react-leaflet
- Turf.js
- Overpass API (OSM data) + optional Nominatim reverse-geocoding
- Optional thin Express/serverless proxy for Overpass caching

## Getting started

```bash
# install dependencies
pnpm install

# start dev server
pnpm dev

# build for production
pnpm build

# preview production build
pnpm preview
```

If using the optional backend proxy:

```bash
cd server
pnpm install
pnpm dev
```

## Project structure

```
src/
├── components/   # map, sidebar, shadcn ui components
├── lib/          # overpass queries, geometry (turf), caching, geocoding
├── hooks/        # viewport data fetching, hover state
└── types/        # shared TS types
server/           # optional Overpass proxy (Express)
```

See the technical implementation doc for the full breakdown.

## Status

Personal learning project, work in progress. No official releases planned.
