import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  MODE_META,
  dayKey,
  durationOf,
  fmtClock,
  type Mode,
  type Settings,
  type Status,
  type StatsMap,
} from './lib/types';
import { useStoredState } from './hooks/useStoredState';
import { chime, unlockAudio } from './lib/sound';
import TimerDial from './components/TimerDial';
import ModeTabs from './components/ModeTabs';
import Controls from './components/Controls';
import StatsPanel from './components/StatsPanel';
import SettingsModal from './components/SettingsModal';
import { IconSliders, IconVolume, IconVolumeOff, TomatoIcon } from './components/Icons';

interface ToastState {
  id: number;
  msg: string;
  color: string;
}

export default function App() {
  /* ---------------- persisted state ---------------- */
  const [settings, setSettings] = useStoredState<Settings>('pomo.settings.v1', DEFAULT_SETTINGS);
  const [stats, setStats] = useStoredState<StatsMap>('pomo.stats.v1', {});
  const [cyclePos, setCyclePos] = useStoredState<number>('pomo.cycle.v1', 0);

  /* ---------------- timer state ---------------- */
  const [mode, setMode] = useState<Mode>('focus');
  const [status, setStatus] = useState<Status>('idle');
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => durationOf('focus', settings));

  /* ---------------- ui state ---------------- */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const flashTimer = useRef<number | null>(null);

  const showToast = (msg: string, color: string) => setToast({ id: Date.now(), msg, color });

  const triggerFlash = () => {
    setFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 950);
  };

  /* ---------------- stats helpers ---------------- */
  const addMinutes = (mins: number) => {
    if (mins <= 0) return;
    setStats((prev) => {
      const k = dayKey();
      const day = prev[k] ?? { sessions: 0, minutes: 0, log: [] };
      return { ...prev, [k]: { ...day, minutes: day.minutes + mins } };
    });
  };

  const recordSession = () => {
    setStats((prev) => {
      const k = dayKey();
      const day = prev[k] ?? { sessions: 0, minutes: 0, log: [] };
      return {
        ...prev,
        [k]: {
          sessions: day.sessions + 1,
          minutes: day.minutes + settings.focusMin,
          log: [...day.log, Date.now()],
        },
      };
    });
  };

  const advanceTo = (nextMode: Mode, auto: boolean) => {
    const dur = durationOf(nextMode, settings);
    setMode(nextMode);
    setRemainingMs(dur);
    if (auto) {
      setStatus('running');
      setEndsAt(Date.now() + dur);
    } else {
      setStatus('idle');
      setEndsAt(null);
    }
  };

  /* ---------------- session completion ---------------- */
  const finishRef = useRef<(completed: boolean) => void>(() => {});
  finishRef.current = (completed: boolean) => {
    const total = durationOf(mode, settings);
    const elapsed = completed ? total : total - remainingMs;
    let nextMode: Mode;
    let nextCycle = cyclePos;
    let msg: string;

    if (mode === 'focus') {
      if (completed) recordSession();
      else addMinutes(Math.floor(elapsed / 60_000));
      nextCycle = cyclePos + 1;
      nextMode = nextCycle >= settings.cyclesBeforeLong ? 'long' : 'short';
      msg = completed
        ? nextMode === 'long'
          ? 'Cycle complete — long break time'
          : 'Focus complete — short break time'
        : 'Skipped ahead to your break';
    } else {
      if (mode === 'long') nextCycle = 0;
      nextMode = 'focus';
      msg = completed ? 'Break over — back to focus' : 'Skipped ahead to focus';
    }

    setCyclePos(nextCycle);
    advanceTo(nextMode, mode === 'focus' ? settings.autoBreaks : settings.autoFocus);
    if (settings.sound) chime(mode === 'focus' ? 'focusDone' : 'breakDone');
    triggerFlash();
    showToast(msg, MODE_META[nextMode].color);
  };

  /* ---------------- countdown engine ---------------- */
  useEffect(() => {
    if (status !== 'running' || endsAt === null) return;
    const id = window.setInterval(() => {
      const left = endsAt - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        finishRef.current(true);
      } else {
        setRemainingMs(left);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [status, endsAt]);

  /* ---------------- actions ---------------- */
  const toggleRun = () => {
    if (status === 'running') {
      setStatus('paused');
      setEndsAt(null);
      return;
    }
    unlockAudio();
    const base = status === 'paused' ? remainingMs : durationOf(mode, settings);
    setRemainingMs(base);
    setStatus('running');
    setEndsAt(Date.now() + base);
  };

  const resetTimer = () => {
    if (mode === 'focus' && status !== 'idle') {
      addMinutes(Math.floor((durationOf('focus', settings) - remainingMs) / 60_000));
    }
    setStatus('idle');
    setEndsAt(null);
    setRemainingMs(durationOf(mode, settings));
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    if (mode === 'focus' && status !== 'idle') {
      addMinutes(Math.floor((durationOf('focus', settings) - remainingMs) / 60_000));
    }
    setMode(m);
    setStatus('idle');
    setEndsAt(null);
    setRemainingMs(durationOf(m, settings));
  };

  /* keyboard shortcuts */
  const actionsRef = useRef({ toggleRun, resetTimer, skip: () => finishRef.current(false) });
  actionsRef.current = { toggleRun, resetTimer, skip: () => finishRef.current(false) };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        actionsRef.current.toggleRun();
      } else if (e.code === 'KeyR') {
        actionsRef.current.resetTimer();
      } else if (e.code === 'KeyS') {
        actionsRef.current.skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  /* keep the idle dial in sync with edited durations */
  useEffect(() => {
    if (status === 'idle') setRemainingMs(durationOf(mode, settings));
    setCyclePos((c) => Math.min(c, settings.cyclesBeforeLong));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  /* living document title */
  useEffect(() => {
    document.title =
      status === 'idle'
        ? 'Pomodoro — Focus Timer'
        : `${fmtClock(remainingMs)} · ${MODE_META[mode].label} — Pomodoro`;
  }, [remainingMs, status, mode]);

  /* toast lifecycle */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* ---------------- derived ---------------- */
  const totalMs = durationOf(mode, settings);
  const nextMode: Mode =
    mode === 'focus' ? (cyclePos + 1 >= settings.cyclesBeforeLong ? 'long' : 'short') : 'focus';
  const subtitle =
    status === 'paused'
      ? 'Paused — resume when ready'
      : status === 'running'
        ? mode === 'focus'
          ? 'Deep work in progress'
          : mode === 'short'
            ? 'Stretch, sip water, breathe'
            : 'Step away from the desk'
        : mode === 'focus'
          ? 'Ready when you are'
          : 'Ready to recharge';

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-full border border-line text-moss transition-all duration-200 hover:-translate-y-0.5 hover:border-cream/30 hover:text-cream active:translate-y-0 active:scale-95';

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ambient mode-tinted light + grain */}
      <div className={`amb amb-focus ${mode === 'focus' ? 'on' : ''}`} />
      <div className={`amb amb-short ${mode === 'short' ? 'on' : ''}`} />
      <div className={`amb amb-long ${mode === 'long' ? 'on' : ''}`} />
      <div className="grain" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <header className="anim-rise flex items-center justify-between gap-4 border-b border-line py-5">
          <div className="flex items-center gap-3">
            <TomatoIcon className="h-9 w-9" />
            <div>
              <p className="font-display text-xl font-bold leading-none tracking-tight">Pomodoro</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-moss">
                Focus timer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="mr-1 hidden text-sm font-medium text-moss sm:block">{todayLabel}</span>
            <button
              onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
              aria-label={settings.sound ? 'Mute completion chime' : 'Unmute completion chime'}
              title={settings.sound ? 'Chime on' : 'Chime off'}
              className={iconBtn}
            >
              {settings.sound ? <IconVolume className="h-4.5 w-4.5" /> : <IconVolumeOff className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Open timer settings"
              title="Timer settings"
              className={iconBtn}
            >
              <IconSliders className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <main className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 lg:py-12">
          {/* ------------ timer column ------------ */}
          <section className="flex flex-col items-center gap-8">
            <div className="anim-rise" style={{ animationDelay: '40ms' }}>
              <ModeTabs mode={mode} settings={settings} onSelect={switchMode} />
            </div>

            <div className="anim-rise w-full" style={{ animationDelay: '110ms' }}>
              <TimerDial
                remainingMs={remainingMs}
                totalMs={totalMs}
                mode={mode}
                status={status}
                flash={flash}
                subtitle={subtitle}
              />
            </div>

            {/* cycle progress toward the long break */}
            <div className="anim-rise flex items-center gap-2" style={{ animationDelay: '170ms' }} aria-label="Cycle progress">
              {Array.from({ length: settings.cyclesBeforeLong }, (_, i) => {
                const done = i < cyclePos;
                const current = i === cyclePos && mode === 'focus';
                return (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      done ? 'w-6 bg-focus' : current ? 'anim-breathe w-6 bg-focus/45' : 'w-2 bg-cream/15'
                    }`}
                  />
                );
              })}
              <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-moss">
                {Math.min(cyclePos, settings.cyclesBeforeLong)}/{settings.cyclesBeforeLong} to long break
              </span>
            </div>

            <div className="anim-rise" style={{ animationDelay: '220ms' }}>
              <Controls
                status={status}
                mode={mode}
                onToggle={toggleRun}
                onReset={resetTimer}
                onSkip={() => finishRef.current(false)}
              />
            </div>

            <p className="anim-rise flex items-center gap-2 text-[13px] font-medium text-moss" style={{ animationDelay: '270ms' }}>
              Next up
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: MODE_META[nextMode].color }} />
              <span className="font-semibold text-cream/85">{MODE_META[nextMode].label}</span>
              <span className="tnum">· {durationOf(nextMode, settings) / 60_000} min</span>
            </p>

            <div
              className="anim-rise flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-medium text-moss/80"
              style={{ animationDelay: '320ms' }}
            >
              <span className="flex items-center gap-1.5">
                <kbd className="kbd">Space</kbd> start / pause
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="kbd">R</kbd> reset
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="kbd">S</kbd> skip
              </span>
            </div>
          </section>

          {/* ------------ stats column ------------ */}
          <aside className="lg:pt-1">
            <StatsPanel stats={stats} settings={settings} />
          </aside>
        </main>
      </div>

      {/* toast */}
      {toast && (
        <div
          key={toast.id}
          className="anim-toast fixed bottom-6 left-1/2 z-50 flex items-center gap-2.5 rounded-full border border-line bg-panel-2 px-4 py-2.5 text-sm font-medium shadow-xl shadow-black/40"
          role="status"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: toast.color }} />
          {toast.msg}
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onPatch={(p) => setSettings((s) => ({ ...s, ...p }))}
        onClose={() => setSettingsOpen(false)}
        onDefaults={() => {
          setSettings({ ...DEFAULT_SETTINGS });
          showToast('Settings restored to defaults', '#8ba392');
        }}
        onClear={() => {
          setStats({});
          setCyclePos(0);
          showToast('Focus history cleared', '#ff5d47');
        }}
      />
    </div>
  );
}
