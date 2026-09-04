import { MODE_META, type Mode, type Status } from '../lib/types';
import { IconPause, IconPlay, IconReset, IconSkip } from './Icons';

interface ControlsProps {
  status: Status;
  mode: Mode;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export default function Controls({ status, mode, onToggle, onReset, onSkip }: ControlsProps) {
  const color = MODE_META[mode].color;
  const label = status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={onReset}
        aria-label="Reset timer"
        className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-moss transition-all duration-200 hover:-translate-y-0.5 hover:border-cream/30 hover:text-cream active:translate-y-0 active:scale-95"
      >
        <IconReset className="h-4 w-4" />
        Reset
      </button>

      <button
        onClick={onToggle}
        className="font-display inline-flex min-w-[176px] items-center justify-center gap-2.5 rounded-full px-9 py-4 text-lg font-bold text-[#170d0a] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.97]"
        style={{ background: color, boxShadow: `0 12px 32px -10px ${color}99` }}
      >
        {status === 'running' ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
        {label}
      </button>

      <button
        onClick={onSkip}
        aria-label="Skip to next session"
        className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-moss transition-all duration-200 hover:-translate-y-0.5 hover:border-cream/30 hover:text-cream active:translate-y-0 active:scale-95"
      >
        <IconSkip className="h-4 w-4" />
        Skip
      </button>
    </div>
  );
}
