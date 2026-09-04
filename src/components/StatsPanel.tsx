import { dayKey, fmtMinutes, type Settings, type StatsMap } from '../lib/types';
import { IconCheck, IconFlame, TomatoIcon } from './Icons';

interface StatsPanelProps {
  stats: StatsMap;
  settings: Settings;
}

function calcStreak(stats: StatsMap): number {
  const d = new Date();
  // a quiet today shouldn't break the streak yet
  if ((stats[dayKey(d)]?.sessions ?? 0) === 0) d.setDate(d.getDate() - 1);
  let streak = 0;
  while ((stats[dayKey(d)]?.sessions ?? 0) > 0) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default function StatsPanel({ stats, settings }: StatsPanelProps) {
  const todayKey = dayKey();
  const today = stats[todayKey] ?? { sessions: 0, minutes: 0, log: [] };
  const streak = calcStreak(stats);
  const goalPct = Math.min(100, Math.round((today.minutes / Math.max(1, settings.dailyGoalMin)) * 100));
  const goalReached = today.minutes >= settings.dailyGoalMin;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return {
      key: k,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1),
      minutes: stats[k]?.minutes ?? 0,
      isToday: k === todayKey,
    };
  });
  const maxScale = Math.max(settings.dailyGoalMin, ...week.map((d) => d.minutes), 30);

  const log = [...today.log].sort((a, b) => b - a).slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- today ---------- */}
      <section className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-moss">Today</h2>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-long/30 bg-long/10 px-2.5 py-1 text-[11px] font-semibold text-long">
              <IconFlame className="h-3.5 w-3.5" />
              {streak}-day streak
            </span>
          )}
        </div>

        <div className="mt-4 flex items-end gap-3">
          <span className="font-display tnum text-6xl font-extrabold leading-none">{today.sessions}</span>
          <span className="pb-1 text-sm font-medium text-moss">
            focus {today.sessions === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-cream/85">
          <TomatoIcon className="h-4.5 w-4.5" />
          <span>
            <span className="font-display tnum font-bold">{fmtMinutes(today.minutes)}</span> of deep work
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-[12px] font-medium">
            <span className="text-moss">Daily goal</span>
            <span className="tnum text-cream/80">
              {today.minutes} / {settings.dailyGoalMin} min
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream/8">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                goalReached ? 'bg-short' : 'bg-focus'
              }`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          {goalReached && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-short">
              <IconCheck className="h-3.5 w-3.5" />
              Goal reached — outstanding.
            </p>
          )}
        </div>
      </section>

      {/* ---------- week ---------- */}
      <section className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '140ms' }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-moss">Last 7 days</h2>
        <div className="mt-4 flex items-end gap-2">
          {week.map((d, i) => {
            const h = d.minutes > 0 ? Math.max(6, Math.round((d.minutes / maxScale) * 88)) : 3;
            return (
              <div key={d.key} className="group flex flex-1 flex-col items-center gap-1.5" title={`${d.minutes} min`}>
                <span className={`tnum text-[10px] font-semibold ${d.minutes > 0 ? 'text-moss' : 'text-transparent'}`}>
                  {d.minutes}
                </span>
                <div className="flex h-[92px] w-full items-end rounded-sm">
                  <div
                    className="anim-grow w-full rounded-sm transition-colors duration-300"
                    style={{
                      height: `${h}px`,
                      animationDelay: `${200 + i * 55}ms`,
                      background: d.isToday ? 'var(--color-focus)' : d.minutes > 0 ? '#3d5a48' : 'rgba(237,242,228,0.08)',
                    }}
                  />
                </div>
                <span
                  className={`text-[11px] font-semibold ${d.isToday ? 'text-cream' : 'text-moss/70'}`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- session log ---------- */}
      <section className="anim-rise rounded-xl border border-line bg-panel p-5" style={{ animationDelay: '220ms' }}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-moss">Session log</h2>
        {log.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] font-medium text-moss">
            No completed sessions yet.
            <br />
            Your first focus block will land here.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line/70">
            {log.map((t, i) => (
              <li key={`${t}-${i}`} className="flex items-center justify-between py-2.5 text-sm">
                <span className="inline-flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-focus" />
                  <span className="font-medium text-cream/90">Focus session</span>
                </span>
                <span className="tnum font-display text-[13px] font-semibold text-moss">
                  {new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="mx-1.5 text-line">·</span>
                  {settings.focusMin} min
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
