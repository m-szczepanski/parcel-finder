# 11 — Docs and repo hygiene

**Depends on:** none (anytime; must land before closing the implementation milestone)
**Status:** done

## Goal

The docs have drifted from reality during setup (known and tracked). Bring them back in sync
and capture the toolchain knowledge in `AGENTS.md` so future sessions/agents use the right
commands.

## Known drift to fix

- [x] Stack table: React 19, react-leaflet 5, Tailwind CSS v4 (CSS-first — no
      `tailwind.config.js`), TypeScript 5.9 (7.0 exists but typescript-eslint does not support
      it yet — tracked in typescript-eslint#10940).
- [x] Dependencies section 4.2: shadcn now uses the consolidated `radix-ui` package, not
      individual `@radix-ui/react-*`; `tw-animate-css` replaces `tailwindcss-animate`;
      `@fontsource-variable/geist` dropped for a system font stack.
- [x] Overpass conversion: `osmtogeojson` rejected (vulnerable transitive deps, unused for
      `[out:json]`) — custom mapper in `lib/overpass.ts` instead.
- [x] Testing section 6: vitest 4 + React Testing Library + happy-dom (not jsdom);
      `@testing-library/jest-dom` dropped (plain assertions).
- [x] Structure trees in both docs + README: add `components/ui/*` (generated), `*.test.ts`
      files, remove `src/types/turf.d.ts`, remove `public/` claim or create the folder
      (favicon/robots) — decide one way.
- [x] README: npm (not pnpm) commands are already correct; re-verify the `server/` section
      against the step 09 outcome.
- [x] App doc section 8: close resolved questions (answers land from steps 09/10).

## Tasks

- [x] `AGENTS.md` at repo root: commands (`npm run dev|build|lint|typecheck|test|format`),
      code style (prettier: single quotes, width 100; no comments unless asked), stack summary,
      and the "update docs in the same PR as behavior changes" rule.
- [x] Update `docs/parcel-finder-app-documentation.md` and
      `docs/parcel-finder-technical-implementation.md` per the checklist above.
- [x] Cross-link `docs/steps/` from the README so the roadmap is discoverable.
- [x] Verify every command in all three docs actually runs.

## Exit criteria

- [x] A fresh reader can trust the docs without checking package.json.
- [x] `AGENTS.md` exists and reflects real scripts.
- [x] Docs pass `npm run format --check` (they are Prettier-formatted).

## Files touched

`README.md`, `AGENTS.md` (new), both `docs/` files, possibly `public/`.
