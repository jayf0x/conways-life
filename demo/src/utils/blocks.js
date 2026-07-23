/**
 * Builds the demo dataset: most blocks at weight 1 (with a little organic variety so the grid
 * doesn't look uniform), plus three labeled blocks (A/B/C) at roughly 30%/50%/80% through the
 * list whose weight is driven by its own slider — spread out instead of stacked at index 0, so
 * it's obvious position holds steady as weight changes and doesn't just track "biggest item".
 */
const LABELED_FRACTIONS = { A: 0.3, B: 0.5, C: 0.8 };

export function buildBlocks(count, weights) {
  const labelByIndex = new Map();
  for (const [label, frac] of Object.entries(LABELED_FRACTIONS)) {
    labelByIndex.set(Math.min(count - 1, Math.round(count * frac)), label);
  }

  return Array.from({ length: count }, (_, i) => {
    const label = labelByIndex.get(i);
    return { i, label, weight: label ? weights[label] : i % 6 === 0 ? 2 : 1 };
  });
}
