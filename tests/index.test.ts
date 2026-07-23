import { describe, expect, test } from 'bun:test';
import { CONWAY, DAY_NIGHT, normalizePattern } from '../src/patterns.js';

describe('normalizePattern', () => {
  test('parses RLE (glider)', () => {
    // bo$2bo$3o!  ->  (1,0) (2,1) (0,1) (1,2) (2,2)
    const p = normalizePattern('bo$2bo$3o!');
    expect(p.width).toBe(3);
    expect(p.height).toBe(3);
    expect(p.cells).toContainEqual([1, 0]);
    expect(p.cells).toContainEqual([2, 1]);
    expect(p.cells).toContainEqual([0, 2]);
    expect(p.cells.length).toBe(5);
  });

  test('skips RLE header lines', () => {
    const p = normalizePattern('#N Glider\nx = 3, y = 3, rule = B3/S23\nbo$2bo$3o!');
    expect(p.cells.length).toBe(5);
  });

  test('parses row strings, treating . space 0 as dead', () => {
    const p = normalizePattern(['.O.', '..O', 'OOO']);
    expect(p.width).toBe(3);
    expect(p.height).toBe(3);
    expect(p.cells).toContainEqual([1, 0]);
    expect(p.cells.length).toBe(5);
  });

  test('passes coordinate lists through with correct extent', () => {
    const p = normalizePattern([
      [1, 0],
      [2, 1],
      [0, 2],
    ]);
    expect(p.width).toBe(3);
    expect(p.height).toBe(3);
    expect(p.cells.length).toBe(3);
  });
});

test('rule presets are the standard B/S forms', () => {
  expect(CONWAY).toEqual({ birth: [3], survive: [2, 3] });
  expect(DAY_NIGHT).toEqual({ birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] });
});
