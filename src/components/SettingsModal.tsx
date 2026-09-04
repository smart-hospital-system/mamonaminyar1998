import { useEffect, useState } from 'react';
import type { Settings } from '../lib/types';
import { IconClose, IconMinus, IconPlus } from './Icons';

interface SettingsModalProps {
  open: boolean;
  settings: Settings;
  onPatch: (p: Partial<Settings>) => void;
  onClose: () => void;
  onDefaults: () => void;
  onClear: () => void;
}

const STEP_BTN =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-moss transition-all duration-150 hover:border-cream/30 hover:text-cream active:scale-90 disabled:pointer-events-none disabled:opacity-25';

function Stepper({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease"
        className={STEP_BTN}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <IconMinus className="h-3.5 w-3.5" />
      </button>
      <span className="font-display tnum w-20 text-center text-lg font-bold">
        {value}
        {unit && <span className="ml-1 font-body text-[11px] font-medium text-moss">{unit}</span>}
      </span>
      <button
        type="button"
        aria-label="Increase"
        className={STEP_BTN}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <IconPlus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
        on ? 'bg-short' : 'bg-cream/15'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-transform duration-300 ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

export default function SettingsModal({ open, settings, onPatch, onClose, onDefaults, onClear }: SettingsModalProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 2600);
    return () => window.clearTimeout(id);
  }, [armed]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Timer settings"
        className="anim-pop relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-panel-2 p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Timer settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-moss transition hover:border-cream/30 hover:text-cream"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {/* durations */}
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-moss">Durations</p>
        <div className="mt-2 divide-y divide-line/70">
          {(
            [
              ['Focus length', 'One deep-work block', 'focusMin', 5, 90, 5, 'min'],
              ['Short break', 'Between focus blocks', 'shortMin', 1, 30, 1, 'min'],
              ['Long break', 'Reward after a full cycle', 'longMin', 5, 45, 5, 'min'],
            ] as const
          ).map(([label, desc, key, min, max, step, unit]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-cream">{label}</p>
                <p className="text-[12px] text-moss">{desc}</p>
              </div>
              <Stepper
                value={settings[key]}
                min={min}
                max={max}
                step={step}
                unit={unit}
                onChange={(v) => onPatch({ [key]: v } as Partial<Settings>)}
              />
            </div>
          ))}

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-cream">Cycle length</p>
              <p className="text-[12px] text-moss">Focus runs before a long break</p>
            </div>
            <Stepper
              value={settings.cyclesBeforeLong}
              min={2}
              max={8}
              step={1}
              unit=""
              onChange={(v) => onPatch({ cyclesBeforeLong: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-cream">Daily goal</p>
              <p className="text-[12px] text-moss">Minutes of focus per day</p>
            </div>
            <Stepper
              value={settings.dailyGoalMin}
              min={30}
              max={480}
              step={15}
              unit="min"
              onChange={(v) => onPatch({ dailyGoalMin: v })}
            />
          </div>
        </div>

        {/* behaviour */}
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-moss">Behaviour</p>
        <div className="mt-2 divide-y divide-line/70">
          {(
            [
              ['Auto-start breaks', 'Roll straight into short and long breaks', 'autoBreaks'],
              ['Auto-start focus', 'Begin the next focus block automatically', 'autoFocus'],
              ['Completion chime', 'Play a small sound when a session ends', 'sound'],
            ] as const
          ).map(([label, desc, key]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-cream">{label}</p>
                <p className="text-[12px] text-moss">{desc}</p>
              </div>
              <Toggle on={settings[key]} label={label} onClick={() => onPatch({ [key]: !settings[key] } as Partial<Settings>)} />
            </div>
          ))}
        </div>

        {/* danger zone */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button
            onClick={onDefaults}
            className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-moss transition hover:border-cream/30 hover:text-cream active:scale-95"
          >
            Restore defaults
          </button>
          <button
            onClick={() => {
              if (armed) {
                onClear();
                setArmed(false);
              } else {
                setArmed(true);
              }
            }}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 ${
              armed
                ? 'bg-focus font-bold text-[#170d0a]'
                : 'border border-focus/40 text-focus hover:border-focus hover:bg-focus/10'
            }`}
          >
            {armed ? 'Click again to confirm' : 'Clear history'}
          </button>
          <p className="w-full text-[12px] leading-snug text-moss/80">
            Settings and history are stored locally in your browser — nothing leaves this device.
          </p>
        </div>
      </div>
    </div>
  );
}
