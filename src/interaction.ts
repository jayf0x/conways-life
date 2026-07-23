import type { LifeControls } from './types.js';

export interface DrawInteractionOptions {
  /** Update `setHover` as the pointer moves. Default: true. */
  hover?: boolean;
}

/**
 * Opt-in pointer wiring for a canvas: pointer-down starts a stroke that
 * paints the opposite state of the cell under the cursor as you drag —
 * draw over empty ground, erase over filled ground. `createLife` itself
 * stays free of DOM listeners; call this only if you want the default
 * scheme, or write your own against `cellAt`/`setCell`/`setHover`.
 */
export function attachDrawInteraction(
  canvas: HTMLCanvasElement,
  controls: LifeControls,
  opts: DrawInteractionOptions = {},
): () => void {
  const { hover = true } = opts;
  let drawing = false;
  let paintValue = true;
  let lastX = -1;
  let lastY = -1;

  const paint = (x: number, y: number) => {
    if (x === lastX && y === lastY) return;
    lastX = x;
    lastY = y;
    controls.setCell(x, y, paintValue);
  };

  const onDown = (e: PointerEvent) => {
    const { x, y } = controls.cellAt(e.offsetX, e.offsetY);
    paintValue = !controls.isAlive(x, y);
    drawing = true;
    lastX = -1;
    lastY = -1;
    canvas.setPointerCapture(e.pointerId);
    paint(x, y);
  };
  const onMove = (e: PointerEvent) => {
    const { x, y } = controls.cellAt(e.offsetX, e.offsetY);
    if (hover) controls.setHover(x, y);
    if (drawing) paint(x, y);
  };
  const onUp = () => {
    drawing = false;
  };
  const onLeave = () => {
    if (hover) controls.setHover(null, null);
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('pointerleave', onLeave);
  };
}
