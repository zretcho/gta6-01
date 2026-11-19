// Sound: everything is synthesized with WebAudio — no audio files.
// A low engine hum, a two-tone siren while wanted, one-shot effects, and a
// simple bass-and-hat groove that loops while the game runs.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
  }

  // Must be called from a user gesture at least once (start button / key).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // Engine: a quiet sawtooth whose pitch follows the car speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      // Siren: a sine that alternates between two notes.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (m && this.engineGain) this.engineGain.gain.value = 0;
    if (m && this.sirenGain) this.sirenGain.gain.value = 0;
  }

  // Short blip / noise burst. `kind` picks the shape; all synthesis, no files.
  play(kind) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    const conf = {
      shoot: { type: 'square', f0: 900, f1: 120, dur: 0.12, vol: 0.16 },
      punch: { type: 'sine', f0: 160, f1: 60, dur: 0.1, vol: 0.25 },
      swing: { type: 'sine', f0: 300, f1: 180, dur: 0.08, vol: 0.08 },
      thud: { type: 'sine', f0: 110, f1: 40, dur: 0.16, vol: 0.3 },
      steal: { type: 'triangle', f0: 300, f1: 520, dur: 0.18, vol: 0.14 },
      door: { type: 'triangle', f0: 220, f1: 140, dur: 0.1, vol: 0.12 },
      step: { type: 'triangle', f0: 520, f1: 760, dur: 0.12, vol: 0.14 },
      win: { type: 'triangle', f0: 520, f1: 1040, dur: 0.5, vol: 0.16 },
      lose: { type: 'sawtooth', f0: 220, f1: 70, dur: 0.7, vol: 0.14 },
      hurt: { type: 'square', f0: 200, f1: 90, dur: 0.15, vol: 0.18 },
      mission: { type: 'triangle', f0: 440, f1: 880, dur: 0.3, vol: 0.14 },
      alarm: { type: 'square', f0: 660, f1: 660, dur: 0.4, vol: 0.12 },
      sirenBlip: { type: 'sine', f0: 880, f1: 1180, dur: 0.25, vol: 0.1 },
    }[kind] || { type: 'sine', f0: 440, f1: 440, dur: 0.1, vol: 0.1 };
    osc.type = conf.type;
    osc.frequency.setValueAtTime(conf.f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, conf.f1), t + conf.dur);
    gain.gain.setValueAtTime(conf.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + conf.dur);
    osc.start(t);
    osc.stop(t + conf.dur + 0.02);
  }

  // Called every frame: engine pitch from speed, siren wail while wanted,
  // and the groove: a bass note each beat with a hat tick between.
  update(G, dt) {
    if (!this.ctx || this.muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      if (this.sirenGain) this.sirenGain.gain.value = 0;
      return;
    }
    const p = G.player;
    const speed = p.car ? Math.abs(p.car.speed) : Math.abs(p.speed || 0);
    if (this.engineGain) {
      const target = p.car ? 0.05 + Math.min(0.09, speed / 4000) : 0;
      this.engineGain.gain.value += (target - this.engineGain.gain.value) * Math.min(1, 6 * dt);
      if (this.engineOsc) this.engineOsc.frequency.value = 50 + speed * 0.35;
    }
    if (this.sirenGain) {
      const wanted = G.wantedStars > 0 && G.screen === 'play';
      this.sirenGain.gain.value += ((wanted ? 0.045 : 0) - this.sirenGain.gain.value) * Math.min(1, 4 * dt);
      if (wanted) {
        this.sirenPhase += dt;
        const note = Math.floor(this.sirenPhase * 2.2) % 2 === 0 ? 715 : 950;
        this.sirenOsc.frequency.value = note;
      }
    }
    // Groove: 112 BPM, A minor bass line, only while playing.
    if (G.screen === 'play') {
      this.musicTimer -= dt;
      if (this.musicTimer <= 0) {
        this.musicTimer += 60 / 112 / 2;
        const bassNotes = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
        const note = bassNotes[this.musicStep % bassNotes.length];
        this.musicStep += 1;
        if (this.musicStep % 2 === 1) this._note(note, 'triangle', 0.24, 0.07);
        else this._note(880, 'square', 0.03, 0.015); // hat tick
      }
    }
  }

  _note(freq, type, dur, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
