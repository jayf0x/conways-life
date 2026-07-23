# conways-life

<!-- README_HEAD:START -->

[![npm version](https://img.shields.io/npm/v/conways-life)](https://www.npmjs.com/package/conways-life)
[![license](https://img.shields.io/npm/l/conways-life)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](./tsconfig.json)
[![CI](https://github.com/jayf0x/conways-life/actions/workflows/ci.yml/badge.svg)](https://github.com/jayf0x/conways-life/actions/workflows/ci.yml)

![Preview](./assets/preview.png)

> **Leave a ⭐ if you found it useful**

<!-- README_HEAD:END -->

Conway's Game of Life for the web. Runs the simulation on **WebGPU compute** when the browser has
it, falls back to **canvas-2D** automatically. Tiny, fully typed, zero dependencies, with a
one-line React component.

**[▶ Live demo](https://jayf0x.github.io/conways-life/)**

## Features

- **WebGPU compute, canvas-2D fallback** — same API and visuals either way; it picks the fast path
  silently.
- **One-line React component** — `<Conways />` from `conways-life/react`, tree-shakeable, React as
  an optional peer dependency.
- **Any rule** — feed it any birth/survival rule set, not just Conway's B3/S23 (Day & Night ships
  as a preset).
- **Draw on it** — opt-in click-and-drag paints live cells and erases over them.
- **Bring your own patterns** — RLE from LifeWiki, ASCII rows, or `[x, y]` coordinates.
- **Small & typed** — a few kB minified, zero runtime dependencies, strict TypeScript.

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
import { attachDrawInteraction, createLife } from "conways-life";

const canvas = document.querySelector("canvas")!;
const life = createLife(canvas);

// Optional: click-and-drag to draw / erase cells.
attachDrawInteraction(canvas, life);

// life.setPaused(true);
// life.step();
// life.reset();
// life.destroy();
```

One call: it sizes itself to the canvas's container and starts running. Everything below is for
when you want to control it.

## Config

```typescript
createLife(canvas: HTMLCanvasElement, config?: LifeConfig): LifeControls
```

| Option       | Type            | Default                | Description                                                                             |
| ------------ | --------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `rule`       | `LifeRule`      | Conway (B3/S23)        | `{ birth: number[], survive: number[] }` neighbor counts.                               |
| `colors`     | `string[]`      | blue ramp              | CSS colors indexed by live-neighbor count (0..8). Any valid CSS color string.           |
| `patterns`   | `LifePattern[]` | a few small spaceships | Seed patterns, scattered on reset. See below.                                           |
| `targetCols` | `number`        | `80`                   | Approximate column count; cell size derives from container width.                       |
| `cellSize`   | `number`        | —                      | Fixed cell size in px. Overrides `targetCols`.                                          |
| `stepMs`     | `number`        | `240`                  | Milliseconds per generation.                                                            |
| `showGrid`   | `boolean`       | `true`                 | Draw 1px gaps between cells. Can be flipped at runtime too, see `setShowGrid`.          |
| `hoverColor` | `string`        | —                      | Color used by `setHover`/`attachDrawInteraction` for the hovered cell. Omit to disable. |
| `seed`       | `boolean`       | `true`                 | Seed patterns on start/resize.                                                          |

### Patterns

Any of three forms, mixed freely in the same array:

```typescript
"bo$2bo$3o!"              // RLE (LifeWiki format, header lines ignored)
[".O.", "..O", "OOO"]     // row strings — any non-`.`/space char is alive
[[1, 0], [2, 1], [0, 2]]  // explicit [x, y] coordinates
```

`GLIDER`, `BLINKER`, and `BLOCK` are exported as ready-made coordinate patterns.

## Controls

`createLife` returns a `LifeControls`. It's a plain object of imperative methods — no events, no
listeners attached on your behalf. Wire your own input, or use the interaction helper below.

| Member                     | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `destroy()`                | Stop the loop, detach listeners, free GPU resources.                       |
| `setPaused(paused)`        | Pause/resume.                                                              |
| `togglePaused()`           | Toggle pause, returns the new state.                                       |
| `step()`                   | Advance exactly one generation (works while paused).                       |
| `reset()`                  | Clear and re-seed.                                                         |
| `setCell(x, y, alive)`     | Set a single cell by grid coordinate.                                      |
| `setCells(coords, alive?)` | Set many cells at once. `alive` defaults to `true`.                        |
| `getAlive()`               | Coordinates of every live cell. Allocates — for inspection, not per-frame. |
| `isAlive(x, y)`            | Whether a cell is alive. Out-of-bounds is `false`.                         |
| `cellAt(offsetX, offsetY)` | Convert canvas-local pixels (`event.offsetX/Y`) to a grid cell.            |
| `setHover(x, y)`           | Highlight a cell with `hoverColor`, or `setHover(null, null)` to clear it. |
| `setShowGrid(show)`        | Toggle grid lines at runtime.                                              |
| `cols`, `rows`, `cellSize` | Current grid dimensions and cell size in px.                               |
| `mode`                     | `"gpu"` once WebGPU init succeeds, otherwise `"cpu"`.                      |

### Drawing on the grid

The engine deliberately doesn't attach mouse or touch listeners itself — one canvas might sit
behind a page where you never want it interactive, another might be the entire app. What it does
give you is enough to build any interaction scheme on top: `cellAt`, `isAlive`, `setCell`,
`setHover`.

For the common case — mouse-down draws, and dragging back over a live cell erases — there's a
ready-made helper:

```typescript
import { attachDrawInteraction } from "conways-life";

const detach = attachDrawInteraction(canvas, life);
// detach() removes the listeners
```

Keyboard shortcuts, touch gestures, anything fancier: write it against the primitives above.

## React

`conways-life/react` is a separate, tree-shakeable entry. React is an optional peer dependency —
importing it pulls in nothing unless you use it.

```tsx
import { Conways } from "conways-life/react";

<Conways draw stepMs={120} style={{ width: "100%", height: 400 }} />;
```

`<Conways>` takes every `LifeConfig` option as a prop, plus `draw` (wire click/drag, no listeners
when off) and `onReady`. It forwards a ref to the live `LifeControls`:

```tsx
const ref = useRef<LifeControls>(null);
<Conways ref={ref} />;
// ref.current?.setCells(GLIDER);
```

Prefer a hook? `useLife(config, { draw })` returns `{ canvasRef, controls }` — bind `canvasRef` to
your own `<canvas>` and drive it through `controls`.

`config` and `draw` are read once on mount; remount via a React `key` to swap the `rule`.

## Roadmap

<!-- ROADMAP:START -->

- [x] WebGPU compute with canvas-2D fallback
- [x] Custom rules (any birth/survival set)
- [x] Click-and-drag drawing
- [x] React entry — `<Conways>` + `useLife`
- [x] Batch cell editing (`setCells`) and readback (`getAlive`)
- [ ] Zoom & pan
- [ ] `useLifeControls` hook (zoom/pan/interaction toggles)

<!-- ROADMAP:END -->

> generated using [Taglify](https://www.npmjs.com/package/taglify).

## Development

```bash
bun install
bun run test          # bun test
bun run typecheck
bun run build          # vite → dist/ (ESM + .d.ts)
bun run format         # biome check --write
bun run demo:dev       # local demo site (React)
```

## License

[MIT](./LICENSE) © [jayF0x](https://github.com/jayf0x)
