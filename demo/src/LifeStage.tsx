import type { LifeConfig, LifeControls } from 'conways-life';
import { useEffect, useRef } from 'react';
import { useLife } from './useLife';

interface LifeStageProps {
  config: LifeConfig;
  paused: boolean;
  showGrid: boolean;
  onReady: (controls: LifeControls | null) => void;
}

/** Owns the canvas + engine lifecycle. Remount (via `key`) to swap rules. */
export function LifeStage({ config, paused, showGrid, onReady }: LifeStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useLife(canvasRef, config);

  useEffect(() => {
    onReady(controls);
    return () => onReady(null);
  }, [controls, onReady]);

  useEffect(() => {
    controls?.setPaused(paused);
  }, [controls, paused]);

  useEffect(() => {
    controls?.setShowGrid(showGrid);
  }, [controls, showGrid]);

  return <canvas ref={canvasRef} className="life-canvas" />;
}
