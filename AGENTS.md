# AGENTS.md

Guidance for coding agents working in this repo.

## Commands

```bash
npm run dev        # dev server (Vite, port 5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run typecheck  # tsc -b
npm run test       # vitest run
npm run format     # prettier --write .
```

Run `npm run lint && npm run typecheck && npm test && npm run build` before finishing any change.

## Stack

- React 19 + TypeScript 5.9 + Vite
- Tailwind CSS v4 (CSS-first, configured in `src/styles/globals.css` — no `tailwind.config.js`)
- shadcn/ui on the consolidated `radix-ui` package
- Leaflet + react-leaflet 5, Turf.js, Overpass API
- Vitest 4 + React Testing Library + happy-dom (`@/` path alias, globals enabled)

## Code style

- Prettier: single quotes, print width 100 (`npm run format` before committing).
- No comments unless asked.
- Reuse existing helpers; hand-roll small utilities before adding packages.

## Docs

Update `README.md` and the files in `docs/` in the same PR as any behavior change they
describe. The step files in `docs/steps/` track the implementation roadmap; keep their
status tables current.
