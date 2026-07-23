# conways-life

<!-- README_HEAD:START -->

[![npm version](https://img.shields.io/npm/v/conways-life)](https://www.npmjs.com/package/conways-life)
[![license](https://img.shields.io/npm/l/conways-life)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./tsconfig.json)
[![CI](https://github.com/jayf0x/conways-life/actions/workflows/ci.yml/badge.svg)](https://github.com/jayf0x/conways-life/actions/workflows/ci.yml)

> ⭐ **Star this [repository](https://github.com/jayf0x/conways-life) if you'd like to support its growth**

<!-- README_HEAD:END -->

A zero-dependency Game of Life engine for a `<canvas>`. Renders on WebGPU compute when available
and falls back to canvas-2D automatically — same API either way. Pluggable rule sets, colors, and
seed patterns, so it isn't locked to Conway's own rule.

**[▶ Live demo](https://jayf0x.github.io/conways-life/)**

## Features

- **WebGPU compute** for the simulation step + render, with a transparent canvas-2D fallback when
  WebGPU is unavailable — same `LifeControls` API in both modes
- **Any B/S rule** (`{ birth: number[], survive: number[] }`) — ships Conway (B3/S23) and
  Day & Night (B3678/S34678) as presets, but any cellular automaton rule works
- **Any CSS colors**, indexed by live-neighbor count — no dependency on a particular stylesheet
- **Patterns as RLE, row-strings, or coordinates** — paste directly from LifeWiki
- Optional grid lines, hover highlight, and mouse interactivity — all opt-in, no global listeners

## Install

```bash
bun add conways-life
```
||
```bash
npm install conways-life
```

## Quick start

```typescript
import { createLife } from 'conways-life';

const canvas = document.querySelector('canvas')!;
const life = createLife(canvas, {
  interactive: true, // click to toggle cells, hover to preview
  showGrid: true,
});

// life.setPaused(true);
// life.step();
// life.reset();
// life.destroy();
```

## Config

```typescript
createLife(canvas: HTMLCanvasElement, config?: LifeConfig): LifeControls
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rule` | `LifeRule` | Conway (B3/S23) | `{ birth: number[], survive: number[] }` neighbor counts. |
| `colors` | `string[]` | blue ramp | CSS colors indexed by live-neighbor count (0..8). Any valid CSS color string. |
| `patterns` | `LifePattern[]` | a few small spaceships | Seed patterns, scattered on reset. See below. |
| `targetCols` | `number` | `80` | Approximate column count; cell size derives from container width. |
| `cellSize` | `number` | — | Fixed cell size in px. Overrides `targetCols`. |
| `stepMs` | `number` | `240` | Milliseconds per generation. |
| `showGrid` | `boolean` | `true` | Draw 1px gaps between cells. |
| `hoverColor` | `string` | — | Highlight color for the hovered empty cell. Omit to disable. |
| `interactive` | `boolean` | `false` | Attach mouse hover + click-to-toggle listeners to the canvas. |
| `seed` | `boolean` | `true` | Seed patterns on start/resize. |

### Patterns

Any of three forms, mixed freely in the same array:

```typescript
'bo$2bo$3o!'                       // RLE (LifeWiki format, header lines ignored)
['.O.', '..O', 'OOO']              // row strings — any non-`.`/space char is alive
[[1, 0], [2, 1], [0, 2]]           // explicit [x, y] coordinates
```

## Controls

`createLife` returns a `LifeControls`:

| Member | Description |
| --- | --- |
| `destroy()` | Stop the loop, detach listeners, free GPU resources. |
| `setPaused(paused)` | Pause/resume. |
| `togglePaused()` | Toggle pause, returns the new state. |
| `step()` | Advance exactly one generation (works while paused). |
| `reset()` | Clear and re-seed. |
| `setCell(x, y, alive)` | Set a single cell by grid coordinate. |
| `cols`, `rows` | Current grid dimensions. |
| `mode` | `"gpu"` once WebGPU init succeeds, otherwise `"cpu"`. |

Keyboard shortcuts (pause on space, etc.) aren't wired in — attach your own listener and call
`togglePaused()`/`step()`.

## Development

```bash
bun install
bun run test          # bun test
bun run typecheck
bun run build          # vite → dist/ (ESM + .d.ts)
bun run format         # biome check --write
bun run demo:dev       # local demo site
```

## License

[MIT](./LICENSE) © [jayF0x](https://github.com/jayf0x)
