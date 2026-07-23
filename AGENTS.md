# AGENTS.md

Guidance for agents working in this repo. Keep it short; keep it true.

## What this is

`conways-life` — a tiny, hyper-fast Game of Life library. WebGPU compute with an automatic
canvas-2D fallback. Zero runtime dependencies, strict TypeScript, a tree-shakeable React entry.

## Layout

- `src/engine.ts` — `createLife(canvas, config)`, the WebGPU/canvas-2D engine. Returns `LifeControls`.
- `src/interaction.ts` — `attachDrawInteraction`, opt-in pointer drawing.
- `src/patterns.ts` — rules (`CONWAY`, `DAY_NIGHT`), named patterns (`GLIDER`, …), RLE/row/coord parsing.
- `src/react.tsx` — `conways-life/react`: `<Conways>` component + `useLife` hook. React is an optional peer dep.
- `src/types.ts` — `LifeConfig`, `LifeControls`, `LifePattern`, `LifeRule`.
- `demo/` — React demo app on the public API.
- `tests/` — bun test.

## Commands

```bash
bun run test        # bun test
bun run typecheck   # tsc --noEmit
bun run build       # vite → dist/ (ESM + .d.ts)
bun run format      # biome check --write
bun run size        # size-limit budgets
```

## Conventions

- Run `typecheck` + `build` before calling anything done; `dist/react.js` must keep React external.
- Keep it small — respect the `size-limit` budgets in `package.json`. No runtime dependencies.
- Two public entries (`.` and `./react`) — update `exports`, `vite.config.ts`, and `size-limit` together when adding one.
- Don't commit unless asked.

## Roadmap sync

When you resolve a [backlog.md](./backlog.md) item, tick it off the Roadmap in [README.md](./README.md)
too (the `ROADMAP:START`/`END` block).
