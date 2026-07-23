import { CONWAY, DAY_NIGHT, type LifeConfig, type LifeControls, type LifeRule } from 'conways-life';
import { useCallback, useEffect, useState } from 'react';
import { LifeStage } from './LifeStage';

interface RulePreset {
  name: string;
  rule: LifeRule;
  colors?: string[];
  hoverColor: string;
}

const RULES: RulePreset[] = [
  {
    name: 'Conway',
    rule: CONWAY,
    hoverColor: 'rgba(200, 220, 255, 0.14)',
  },
  {
    name: 'Day & Night',
    rule: DAY_NIGHT,
    colors: ['#fff5dc', '#ffd796', '#ffb446', '#ffb000', '#da5a08', '#b93704', '#961c02', '#730a01', '#4e0301'],
    hoverColor: 'rgba(255, 220, 160, 0.16)',
  },
];

export default function App() {
  const [ruleIndex, setRuleIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [controls, setControls] = useState<LifeControls | null>(null);
  const [mode, setMode] = useState<'cpu' | 'gpu' | null>(null);

  const preset = RULES[ruleIndex];
  const config: LifeConfig = {
    rule: preset.rule,
    colors: preset.colors,
    hoverColor: preset.hoverColor,
    showGrid,
  };

  const handleReady = useCallback((c: LifeControls | null) => {
    setControls(c);
    setMode(c?.mode ?? null);
  }, []);

  // mode flips from "cpu" to "gpu" async once WebGPU init resolves
  useEffect(() => {
    if (!controls) return;
    const id = setInterval(() => setMode(controls.mode), 150);
    const timeout = setTimeout(() => clearInterval(id), 2000);
    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [controls]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <LifeStage key={ruleIndex} config={config} paused={paused} showGrid={showGrid} onReady={handleReady} />

      <header className="masthead">
        <h1>
          conway&rsquo;s <em>life</em>
        </h1>
        <p>a tiny universe, breathing on your background</p>
      </header>

      <div className="console">
        <div className="console-row">
          <span className={`mode-pill mode-${mode ?? 'pending'}`}>{mode ? mode.toUpperCase() : '···'}</span>

          <fieldset className="segmented">
            <legend className="sr-only">Rule set</legend>
            {RULES.map((r, i) => (
              <button
                key={r.name}
                type="button"
                className={i === ruleIndex ? 'active' : ''}
                onClick={() => {
                  setRuleIndex(i);
                  setPaused(false);
                }}
              >
                {r.name}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="console-row">
          <button type="button" className="primary" onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
          <button type="button" disabled={!paused} onClick={() => controls?.step()}>
            ⏭ step
          </button>
          <button type="button" onClick={() => controls?.reset()}>
            ⟲ reset
          </button>
          <label className="switch">
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            <span className="track" />
            grid
          </label>
        </div>

        <p className="hint">click or drag to draw &middot; drag over a live cell to erase &middot; space to pause</p>
      </div>

      <a className="source-link" href="https://github.com/jayf0x/conways-life" target="_blank" rel="noreferrer">
        view source ↗
      </a>
    </>
  );
}
