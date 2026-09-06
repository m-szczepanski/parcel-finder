# Parcel Finder

A personal web app for exploring a map and discovering likely unused/undeveloped land by hovering over areas — no cadastral registry connection required.

> See [docs/parcel-finder-app-documentation.md](./docs/parcel-finder-app-documentation.md) for purpose, tech stack, and dependencies.
> See [docs/parcel-finder-technical-implementation.md](./docs/parcel-finder-technical-implementation.md) for architecture and implementation details.

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

## Getting started

```bash
# install dependencies
npm install

# start dev server
npm run dev

# build for production
npm run build

# preview production build
npm run preview
```

## Initial project structure

```text
src/
├── components/
│   ├── map/
│   ├── sidebar/
│   └── ui/
├── hooks/
├── lib/
├── styles/
├── types/
├── App.tsx
├── main.tsx
└── vite-env.d.ts
public/
├── favicon.svg
└── robots.txt
index.html
vite.config.ts
postcss.config.js
tsconfig.json
```

See the technical implementation doc for the full breakdown.

## Status

Personal learning project, work in progress. No official releases planned.
