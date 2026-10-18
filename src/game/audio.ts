// Tiny WebAudio sfx so we don't ship any audio files.
export class Sfx {
  private ctx?: AudioContext;
  muted = false; // the player's own sound toggle
  suspended = false; // set by the portal (ad playing / platform mute)

  /** call from a user gesture */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    void this.ctx?.resume();
  }

  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'square', delay = 0) {
    const c = this.ctx;
    if (!c || this.muted || this.suspended) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  jump() { this.tone(420, 820, 0.14, 0.05); }
  point() { this.tone(880, 880, 0.07, 0.05); this.tone(1175, 1175, 0.09, 0.05, 'square', 0.1); }
  die() { this.tone(360, 70, 0.4, 0.07); this.tone(180, 50, 0.4, 0.05, 'square', 0.08); }
}
