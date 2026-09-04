export type Mode = 'focus' | 'short' | 'long';
export type Status = 'idle' | 'running' | 'paused';

export interface Settings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cyclesBeforeLong: number;
  autoBreaks: boolean;
  autoFocus: boolean;
  sound: boolean;
  dailyGoalMin: number;
}

export interface DayStats {
  sessions: number;
  minutes: number;
  /** timestamps (ms) of completed focus sessions */
  log: number[];
}

export type StatsMap = Record<string, DayStats>;

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  cyclesBeforeLong: 4,
  autoBreaks: true,
  autoFocus: false,
  sound: true,
  dailyGoalMin: 120,
};

export const MODE_META: Record<Mode, { label: string; color: string; soft: string }> = {
  focus: { label: 'Focus', color: '#ff5d47', soft: 'rgba(255,93,71,0.13)' },
  short: { label: 'Short break', color: '#5ec97a', soft: 'rgba(94,201,122,0.12)' },
  long: { label: 'Long break', color: '#f0b64b', soft: 'rgba(240,182,75,0.12)' },
};

export const MODE_ORDER: Mode[] = ['focus', 'short', 'long'];

export function durationOf(mode: Mode, s: Settings): number {
  const min = mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortMin : s.longMin;
  return min * 60_000;
}

/** 1499800ms -> "25:00", 0 -> "00:00" */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

/** local-date key, e.g. "2026-02-14" */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}
