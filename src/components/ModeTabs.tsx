import { MODE_META, MODE_ORDER, type Mode, type Settings } from '../lib/types';

interface ModeTabsProps {
  mode: Mode;
  settings: Settings;
  onSelect: (m: Mode) => void;
}

const DUR_LABEL: Record<Mode, (s: Settings) => string> = {
  focus: (s) => `${s.focusMin} min`,
  short: (s) => `${s.shortMin} min`,
  long: (s) => `${s.longMin} min`,
};

export default function ModeTabs({ mode, settings, onSelect }: ModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Timer mode"
      className="inline-flex items-center gap-1 rounded-full border border-line bg-panel p-1"
    >
      {MODE_ORDER.map((m) => {
        const meta = MODE_META[m];
        const active = m === mode;
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(m)}
            className="rounded-full px-3.5 py-2 text-center transition-all duration-300 sm:px-5"
            style={
              active
                ? { background: meta.soft, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}55` }
                : { color: 'var(--color-moss)' }
            }
          >
            <span className={`block text-[13px] font-semibold leading-tight ${active ? '' : 'hover:text-cream'}`}>
              {meta.label}
            </span>
            <span className="tnum block text-[10px] font-medium opacity-70">{DUR_LABEL[m](settings)}</span>
          </button>
        );
      })}
    </div>
  );
}
