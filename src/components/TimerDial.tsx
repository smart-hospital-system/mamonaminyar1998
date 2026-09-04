import { MODE_META, fmtClock, type Mode, type Status } from '../lib/types';

interface TimerDialProps {
  remainingMs: number;
  totalMs: number;
  mode: Mode;
  status: Status;
  flash: boolean;
  subtitle: string;
}

const R = 148;
const CIRC = 2 * Math.PI * R;

export default function TimerDial({ remainingMs, totalMs, mode, status, flash, subtitle }: TimerDialProps) {
  const meta = MODE_META[mode];
  const frac = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0;
  const [mm, ss] = fmtClock(remainingMs).split(':');
  const running = status === 'running';

  return (
    <div className={`relative mx-auto w-[min(82vw,390px)] select-none ${flash ? 'dial-flash' : ''}`}>
      <svg viewBox="0 0 380 380" className="block h-auto w-full">
        {/* outer dashed orbit — spins while the timer runs */}
        <g className={running ? 'spin-slow' : ''} opacity={running ? 0.55 : 0.16}>
          <circle
            cx="190"
            cy="190"
            r="184"
            fill="none"
            stroke={meta.color}
            strokeOpacity="0.4"
            strokeWidth="1.2"
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
        </g>

        {/* minute ticks */}
        <g>
          {Array.from({ length: 60 }, (_, i) => {
            const major = i % 5 === 0;
            const a = (i * 6 * Math.PI) / 180;
            const r1 = 173;
            const r2 = major ? 162 : 167;
            return (
              <line
                key={i}
                x1={190 + r1 * Math.sin(a)}
                y1={190 - r1 * Math.cos(a)}
                x2={190 + r2 * Math.sin(a)}
                y2={190 - r2 * Math.cos(a)}
                stroke="#edf2e4"
                strokeOpacity={major ? 0.24 : 0.09}
                strokeWidth={major ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* track */}
        <circle cx="190" cy="190" r={R} fill="none" stroke="#edf2e4" strokeOpacity="0.07" strokeWidth="10" />

        {/* progress */}
        <circle
          cx="190"
          cy="190"
          r={R}
          fill="none"
          stroke={meta.color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - frac)}
          transform="rotate(-90 190 190)"
          style={{
            filter: running ? `drop-shadow(0 0 12px ${meta.color}66)` : undefined,
            transition: 'stroke-dashoffset 0.3s linear, stroke 0.5s ease',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.34em] transition-colors duration-500"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="font-display tnum text-[clamp(64px,17vw,98px)] font-extrabold leading-none tracking-tight">
          {mm}
          <span className={running ? 'colon-run' : ''}>:</span>
          {ss}
        </span>
        <span className="flex items-center gap-2 text-[13px] font-medium text-moss">
          {running && (
            <span className="anim-breathe h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
          )}
          {subtitle}
        </span>
      </div>
    </div>
  );
}
