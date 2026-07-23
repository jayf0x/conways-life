import { tintFor } from '../utils/colors.js';

/** One placed cell. Labeled (A/B/C) blocks render in the accent color; everything else is a quiet
 * neutral tint, so the eye reads weight/area rather than color. */
export function Block({ i, weight, label }) {
  if (label) {
    return (
      <div className="rect-enter flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-md bg-accent text-sm font-medium tracking-tight text-white">
        <span>{label}</span>
        <span className="text-[11px] font-normal opacity-80">{weight}×</span>
      </div>
    );
  }
  return (
    <div
      className="rect-enter flex h-full w-full items-center justify-center rounded-md border border-black/[0.04] font-mono text-[11px] text-ink/40"
      style={{ background: tintFor(i), animationDelay: `${Math.min(i, 24) * 10}ms` }}
    >
      {i}
    </div>
  );
}
