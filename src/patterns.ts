import type { LifePattern, LifeRule } from './types.js';

/** Conway's Game of Life: B3/S23. */
export const CONWAY: LifeRule = { birth: [3], survive: [2, 3] };

/** Day & Night: B3678/S34678 (self-complementary). */
export const DAY_NIGHT: LifeRule = {
  birth: [3, 6, 7, 8],
  survive: [3, 4, 6, 7, 8],
};

/** Live coordinates relative to a pattern's top-left, plus its extent. */
export interface NormalizedPattern {
  cells: Array<[number, number]>;
  width: number;
  height: number;
}

/**
 * Parse an RLE body (the `b`/`o`/`$`/`!` run-length string). Header lines
 * starting with `#` and an `x = ..., y = ...` line are skipped. Unknown state
 * chars beyond `b`/`o` are treated as alive, which is close enough for the
 * multi-state patterns we care about here.
 */
function parseRLE(rle: string): Array<[number, number]> {
  const body = rle
    .split('\n')
    .filter((l) => !l.startsWith('#') && !/^\s*x\s*=/.test(l))
    .join('');
  const cells: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  let count = '';
  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      count += ch;
      continue;
    }
    const n = count ? parseInt(count, 10) : 1;
    count = '';
    if (ch === '$') {
      y += n;
      x = 0;
    } else if (ch === '!') {
      break;
    } else if (ch === 'b') {
      x += n; // dead run
    } else if (!/\s/.test(ch)) {
      for (let i = 0; i < n; i++) cells.push([x++, y]); // 'o' or any live state
    }
  }
  return cells;
}

function parseRows(rows: string[]): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c !== '.' && c !== ' ' && c !== '0') cells.push([x, y]);
    }
  }
  return cells;
}

/** Coerce any accepted {@link LifePattern} form into coordinates + extent. */
export function normalizePattern(pattern: LifePattern): NormalizedPattern {
  let cells: Array<[number, number]>;
  if (typeof pattern === 'string') {
    cells = parseRLE(pattern);
  } else if (pattern.length > 0 && typeof pattern[0] === 'string') {
    cells = parseRows(pattern as string[]);
  } else {
    cells = (pattern as Array<[number, number]>).map(([x, y]) => [x, y]);
  }
  let width = 0;
  let height = 0;
  for (const [x, y] of cells) {
    if (x + 1 > width) width = x + 1;
    if (y + 1 > height) height = y + 1;
  }
  return { cells, width, height };
}

/** Named starter patterns (coordinate form). Drop into `patterns` or `setCells`. */
export const GLIDER: Array<[number, number]> = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
];
export const BLINKER: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [2, 0],
];
export const BLOCK: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

/** Default spaceships/oscillators, one shared set (row-string form). */
export const DEFAULT_PATTERNS: LifePattern[] = [
  ['.O.', 'O..', 'OOO'],
  ['.O..O', 'O....', 'O...O', 'OOOO.'],
  ['...O..', '.O...O', 'O.....', 'O....O', 'OOOOO.'],
  ['...OO..', '.O....O', 'O......', 'O.....O', 'OOOOOO.'],
];
