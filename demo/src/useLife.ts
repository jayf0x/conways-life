import { attachDrawInteraction, createLife, type LifeConfig, type LifeControls } from 'conways-life';
import { useEffect, useRef, useState } from 'react';

/**
 * Mounts a `createLife` engine on a canvas and keeps it in sync with React.
 * `config` is only read on mount/remount (pass a `key` to force a fresh
 * engine, e.g. when the rule changes) — imperative tweaks like grid
 * visibility go through the returned controls instead.
 */
export function useLife(canvasRef: React.RefObject<HTMLCanvasElement | null>, config: LifeConfig) {
  const [controls, setControls] = useState<LifeControls | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const life = createLife(canvas, configRef.current);
    const detach = attachDrawInteraction(canvas, life);
    setControls(life);
    return () => {
      detach();
      life.destroy();
      setControls(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]);

  return controls;
}
