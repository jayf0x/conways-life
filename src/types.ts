/** A cellular-automaton rule as birth/survival neighbor counts (Golly B/S form). */
export interface LifeRule {
  /** Neighbor counts (0..8) that turn a dead cell alive. */
  birth: number[];
  /** Neighbor counts (0..8) that keep a live cell alive. */
  survive: number[];
}

/**
 * A seed pattern in any of three accepted forms:
 * - RLE string, e.g. `"bo$2bo$3o!"` (LifeWiki format; header lines ignored)
 * - row strings, e.g. `[".O.", "..O", "OOO"]` (any non-`.`/non-space char = alive)
 * - explicit live coordinates, e.g. `[[1, 0], [2, 1], [0, 2]]`
 */
export type LifePattern = string | string[] | Array<[number, number]>;

export interface LifeConfig {
  /** Rule set. Default: Conway (B3/S23). */
  rule?: LifeRule;
  /**
   * Cell colors indexed by live-neighbor count. Any CSS color string
   * (hex, rgb(), hsl(), named). Index 0 is used for isolated cells, up to
   * index 8. Fewer than 9 entries are clamped to the last; more are ignored.
   * Default: a blue ramp.
   */
  colors?: string[];
  /** Seed patterns scattered on reset. Default: a few small spaceships. */
  patterns?: LifePattern[];
  /** Approximate number of columns; cell size is derived from container width. */
  targetCols?: number;
  /** Fixed cell size in px. Overrides `targetCols` when set. */
  cellSize?: number;
  /** Milliseconds per generation. Default: 240. */
  stepMs?: number;
  /** Draw 1px gaps between cells. Default: true. */
  showGrid?: boolean;
  /** Highlight color for the hovered empty cell. Omit to disable. */
  hoverColor?: string;
  /** Attach mouse hover + click-to-toggle listeners to the canvas. Default: false. */
  interactive?: boolean;
  /** Seed patterns on start / resize. Default: true. */
  seed?: boolean;
}

export interface LifeControls {
  /** Stop the loop, detach listeners, free GPU resources. */
  destroy: () => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => boolean;
  /** Advance exactly one generation (works while paused). */
  step: () => void;
  /** Clear and re-seed. */
  reset: () => void;
  /** Set a single cell alive/dead by grid coordinate. */
  setCell: (x: number, y: number, alive: boolean) => void;
  /** Current grid dimensions. */
  readonly cols: number;
  readonly rows: number;
  /** "gpu" once WebGPU init succeeds, otherwise "cpu". */
  readonly mode: "cpu" | "gpu";
}
