import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createLife } from './engine.js';
import { attachDrawInteraction, type DrawInteractionOptions } from './interaction.js';
import type { LifeConfig, LifeControls } from './types.js';

/** Enable pointer drawing: `true` for defaults, or pass {@link DrawInteractionOptions}. */
export type DrawProp = boolean | DrawInteractionOptions;

/**
 * Mount a Game of Life on a canvas and get its {@link LifeControls} back
 * reactively (`null` until mounted). `config`/`draw` are read once on mount —
 * to swap the rule, remount via a React `key`; tweak everything else through
 * the returned controls.
 *
 * ```tsx
 * const { canvasRef, controls } = useLife({ stepMs: 120 }, { draw: true });
 * return <canvas ref={canvasRef} />;
 * ```
 */
export function useLife(config: LifeConfig = {}, opts: { draw?: DrawProp } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controls, setControls] = useState<LifeControls | null>(null);
  // Mount-time snapshot: later prop changes don't re-create the engine.
  const configRef = useRef(config);
  const drawRef = useRef(opts.draw);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const life = createLife(canvas, configRef.current);
    const draw = drawRef.current;
    const detach = draw
      ? attachDrawInteraction(canvas, life, draw === true ? undefined : draw)
      : undefined;
    setControls(life);
    return () => {
      detach?.();
      life.destroy();
      setControls(null);
    };
  }, []);

  return { canvasRef, controls };
}

export interface ConwaysProps extends LifeConfig {
  /** Wire click/drag-to-draw pointer interaction. Default: off (no listeners). */
  draw?: DrawProp;
  /** Called once the engine is live. */
  onReady?: (controls: LifeControls) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * One-line Game of Life. Forwards a ref to the live {@link LifeControls}.
 *
 * ```tsx
 * <Conways draw style={{ width: '100%', height: 400 }} />
 * ```
 */
export const Conways = forwardRef<LifeControls, ConwaysProps>(function Conways(
  { draw, onReady, className, style, ...config },
  ref,
) {
  const { canvasRef, controls } = useLife(config, { draw });

  // Ref reads null until the engine mounts, same as any DOM ref.
  useImperativeHandle(ref, () => controls as LifeControls, [controls]);
  useEffect(() => {
    if (controls) onReady?.(controls);
    // onReady intentionally not a dep — fire once per engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls]);

  return <canvas ref={canvasRef} className={className} style={style} />;
});
