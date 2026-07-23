# Backlog

Deferred work, roughly ordered. Refined ideas only — dump raw ideas at the bottom.

> **When you resolve a backlog item, also tick it off the Roadmap in [README.md](./README.md)**
> (the `ROADMAP:START`/`END` block). Keep the two in sync by hand until Taglify generates the
> roadmap from tagged commits.

## Zoom & pan

Turns the fixed viewport into a full Game of Life you can navigate.

- `cellAt` currently assumes an untransformed `offset / cellSize` grid, and the WebGPU render path
  has no viewport transform — both need a pan offset + zoom scale.
- Blocks the `useLifeControls` hook below.

## `useLifeControls(ref, options)` hook

React wrapper over interaction, built on top of zoom & pan. No overhead when disabled.

- `options`: `isEnabled`, `enableZoom`, `enablePan`, `enableInteraction`.
- Returns imperative helpers, e.g. `const { zoom, pan } = useLifeControls(ref, ...)`.
- Depends on zoom & pan existing first.

## Ideas (unrefined)

- Batch pattern stamping at a coordinate (`stamp(pattern, x, y)`) vs. only random seeding.
