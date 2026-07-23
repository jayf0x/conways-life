import { CONWAY, createLife, DAY_NIGHT } from 'conways-life';

const canvas = document.querySelector<HTMLCanvasElement>('#life')!;
const modeEl = document.querySelector<HTMLSpanElement>('#mode')!;
const pauseBtn = document.querySelector<HTMLButtonElement>('#pause')!;
const stepBtn = document.querySelector<HTMLButtonElement>('#step')!;
const resetBtn = document.querySelector<HTMLButtonElement>('#reset')!;
const ruleBtn = document.querySelector<HTMLButtonElement>('#rule')!;

const rules = [
  { name: 'Conway', rule: CONWAY, colors: undefined },
  {
    name: 'Day & Night',
    rule: DAY_NIGHT,
    colors: ['#fff5dc', '#ffd796', '#ffb446', '#ffb000', '#da5a08', '#b93704', '#961c02', '#730a01', '#4e0301'],
  },
];
let ruleIndex = 0;
let life = mount();

function mount() {
  const { rule, colors } = rules[ruleIndex];
  return createLife(canvas, {
    rule,
    colors,
    interactive: true,
    showGrid: true,
    hoverColor: 'rgba(200, 220, 255, 0.12)',
  });
}

const syncMode = () => {
  modeEl.textContent = life.mode.toUpperCase();
};
// mode flips async (WebGPU init), poll briefly rather than plumb a callback through
const modePoll = setInterval(syncMode, 200);
setTimeout(() => clearInterval(modePoll), 3000);
syncMode();

let paused = false;
pauseBtn.addEventListener('click', () => {
  paused = life.togglePaused();
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});
stepBtn.addEventListener('click', () => life.step());
resetBtn.addEventListener('click', () => life.reset());
ruleBtn.addEventListener('click', () => {
  ruleIndex = (ruleIndex + 1) % rules.length;
  life.destroy();
  life = mount();
  ruleBtn.textContent = `Rule: ${rules[ruleIndex].name}`;
  pauseBtn.textContent = 'Pause';
  paused = false;
  syncMode();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    pauseBtn.click();
  }
});
