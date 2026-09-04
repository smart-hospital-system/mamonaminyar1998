let ctx: AudioContext | null = null;

/** Create/resume the AudioContext — call from a user gesture. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable — silently ignore */
  }
}

function tone(freq: number, at: number, dur: number, peak: number, c: AudioContext): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** Small ascending chime played when a session ends. */
export function chime(kind: 'focusDone' | 'breakDone'): void {
  try {
    unlockAudio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.03;
    const notes = kind === 'focusDone' ? [523.25, 659.25, 783.99, 1046.5] : [392, 493.88, 587.33];
    notes.forEach((f, i) => tone(f, t + i * 0.13, 0.55, 0.11, ctx as AudioContext));
  } catch {
    /* ignore */
  }
}
