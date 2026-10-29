export type AmbienceType = 'none' | 'cafe' | 'jazz' | 'rain';

/**
 * Project Pişti - Procedural Web Audio Sound Engine & Ambience Generator
 * Generates tactile card Foley and background atmospheres without external audio files.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.8;

  // Ambience Engine State
  private currentAmbience: AmbienceType = 'none';
  private ambienceVolume: number = 0.25;
  private ambienceMasterGain: GainNode | null = null;
  private ambienceActiveNodes: AudioNode[] = [];
  private ambienceTimers: number[] = [];

  constructor() {}

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Snappy, tactile card counting tick ("tık tık tık tık")
   */
  public playCountTick(pitchFactor: number = 1) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const baseFreq = (480 + Math.random() * 60) * pitchFactor;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.045);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.045);

    gain.gain.setValueAtTime(0.22 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Bright, rewarding chime when a special point card (Karo 10, Sinek 2, As, Vale) is set aside
   */
  public playPointCardChime(points: number = 1) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseNote = points >= 3 ? 880 : points === 2 ? 784 : 659.25; // A5, G5, E5
    const freqs = [baseNote, baseNote * 1.25, baseNote * 1.5];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.035);

      gain.gain.setValueAtTime(0.18 * this.volume, t + idx * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.035 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + idx * 0.035);
      osc.stop(t + idx * 0.035 + 0.3);
    });
  }

  /**
   * Turkish Tea Glass clink & spoon stir sound ☕
   */
  public playTeaClink() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // High glass clink
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2480, t);
    osc.frequency.exponentialRampToValueAtTime(1920, t + 0.18);

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Dynamic sound per emote
   */
  public playEmoteSound(emoji: string) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    if (emoji === '☕') {
      this.playTeaClink();
      return;
    }

    const t = this.ctx.currentTime;

    if (emoji === '🔥') {
      // Whoosh sound
      const bufferSize = this.ctx.sampleRate * 0.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.linearRampToValueAtTime(950, t + 0.18);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start(t);
      return;
    }

    // Default bubbly pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);

    gain.gain.setValueAtTime(0.18 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Riffle Shuffle fluttering sound of cards interleaving
   */
  public playRiffleShuffle() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const cardFlutters = 26;

    for (let i = 0; i < cardFlutters; i++) {
      const jitter = (Math.random() - 0.5) * 0.006;
      const flutterTime = t + i * 0.024 + jitter;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Pitch slightly rises as the deck interlaces, mimicking physical tension
      const progress = i / cardFlutters;
      const baseFreq = 280 + progress * 240 + Math.random() * 80;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, flutterTime);
      osc.frequency.exponentialRampToValueAtTime(75, flutterTime + 0.022);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + progress * 600, flutterTime);
      filter.Q.setValueAtTime(2.2, flutterTime);

      gain.gain.setValueAtTime(0.16 * this.volume, flutterTime);
      gain.gain.exponentialRampToValueAtTime(0.001, flutterTime + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(flutterTime);
      osc.stop(flutterTime + 0.025);
    }

    // Final crisp square-up deck snap at the end
    const snapTime = t + cardFlutters * 0.024 + 0.05;
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(320, snapTime);
    snapOsc.frequency.exponentialRampToValueAtTime(90, snapTime + 0.045);
    snapGain.gain.setValueAtTime(0.3 * this.volume, snapTime);
    snapGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.05);
    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(snapTime);
    snapOsc.stop(snapTime + 0.06);
  }

  /**
   * Table wash / Scramble swishing sound
   */
  public playWashScramble() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const swishTime = t + i * 0.14;
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) output[j] = Math.random() * 2 - 1;

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + i * 80, swishTime);
      filter.frequency.linearRampToValueAtTime(300, swishTime + 0.11);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14 * this.volume, swishTime);
      gain.gain.exponentialRampToValueAtTime(0.001, swishTime + 0.11);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start(swishTime);
    }
  }

  /**
   * Triple cut thud sound
   */
  public playTripleCut() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.22, 0.44, 0.72].forEach((offset, idx) => {
      const knockTime = t + offset;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260 + idx * 30, knockTime);
      osc.frequency.exponentialRampToValueAtTime(60, knockTime + 0.06);

      gain.gain.setValueAtTime(0.2 * this.volume, knockTime);
      gain.gain.exponentialRampToValueAtTime(0.001, knockTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(knockTime);
      osc.stop(knockTime + 0.07);
    });
  }

  /**
   * Swoosh when cards are swept and gathered to the player's pile
   */
  public playSweepGather() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.15);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Authentic Card Play Foley: Crisp paper flick + resonant table-felt thud with organic micro-variation
   */
  public playCardPlay() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const pitchVar = 0.94 + Math.random() * 0.12;

    // Layer 1: Resonant wooden felt thud (low frequency body)
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    const thudFilter = this.ctx.createBiquadFilter();

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(135 * pitchVar, t);
    thudOsc.frequency.exponentialRampToValueAtTime(36, t + 0.085);

    thudFilter.type = 'lowpass';
    thudFilter.frequency.setValueAtTime(340, t);
    thudFilter.frequency.exponentialRampToValueAtTime(55, t + 0.085);

    thudGain.gain.setValueAtTime(0.42 * this.volume, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);

    thudOsc.connect(thudFilter);
    thudFilter.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thudOsc.start(t);
    thudOsc.stop(t + 0.1);

    // Layer 2: Card snap friction & slap (short crisp organic noise snap)
    const snapSize = Math.floor(this.ctx.sampleRate * 0.04);
    const snapBuffer = this.ctx.createBuffer(1, snapSize, this.ctx.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let i = 0; i < snapSize; i++) {
      snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapSize * 0.22));
    }

    const snapSource = this.ctx.createBufferSource();
    snapSource.buffer = snapBuffer;

    const snapFilter = this.ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(2200 * pitchVar, t);
    snapFilter.Q.setValueAtTime(2.2, t);

    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.3 * this.volume, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    snapSource.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapSource.start(t);

    // Layer 3: Subtle card edge flick transient
    const flickOsc = this.ctx.createOscillator();
    const flickGain = this.ctx.createGain();
    flickOsc.type = 'sine';
    flickOsc.frequency.setValueAtTime(820 * pitchVar, t);
    flickOsc.frequency.exponentialRampToValueAtTime(210, t + 0.035);
    flickGain.gain.setValueAtTime(0.2 * this.volume, t);
    flickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    flickOsc.connect(flickGain);
    flickGain.connect(this.ctx.destination);
    flickOsc.start(t);
    flickOsc.stop(t + 0.04);
  }

  /**
   * Procedural Background Ambience Engine (Kıraathane, Gece Cazı, Huzurlu Yağmur)
   */
  public setAmbience(type: AmbienceType) {
    if (this.currentAmbience === type && (type === 'none' || this.ambienceActiveNodes.length > 0)) {
      return;
    }
    this.currentAmbience = type;
    this.stopAmbience();

    if (type === 'none' || !this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.ambienceVolume * this.volume, t);
    masterGain.connect(this.ctx.destination);
    this.ambienceMasterGain = masterGain;

    if (type === 'rain') {
      // Pink Noise looped buffer for continuous soft rain
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const lpFilter = this.ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(850, t);

      noiseSource.connect(lpFilter);
      lpFilter.connect(masterGain);
      noiseSource.start(t);
      this.ambienceActiveNodes.push(noiseSource, lpFilter);
    } else if (type === 'cafe') {
      // Low Room Resonance + Periodic gentle tea spoon clink
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.015;

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const lpFilter = this.ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.setValueAtTime(220, t);

      noiseSource.connect(lpFilter);
      lpFilter.connect(masterGain);
      noiseSource.start(t);
      this.ambienceActiveNodes.push(noiseSource, lpFilter);

      // Random soft tea glass clinks every 6-11s
      const clinkLoop = () => {
        if (this.currentAmbience !== 'cafe' || !this.ctx) return;
        const clinkTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2450 + Math.random() * 150, clinkTime);
        g.gain.setValueAtTime(0.045 * this.ambienceVolume, clinkTime);
        g.gain.exponentialRampToValueAtTime(0.0001, clinkTime + 0.12);
        osc.connect(g);
        g.connect(masterGain);
        osc.start(clinkTime);
        osc.stop(clinkTime + 0.15);

        const nextTimer = window.setTimeout(clinkLoop, 6500 + Math.random() * 5000);
        this.ambienceTimers.push(nextTimer);
      };
      const firstTimer = window.setTimeout(clinkLoop, 3500);
      this.ambienceTimers.push(firstTimer);
    } else if (type === 'jazz') {
      // Warm Rhodes / Pad Chords (cycling Fmaj7 -> Dm7 -> Am7)
      const chordNotes = [
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [146.83, 220.0, 261.63, 349.23], // Dm7
        [220.0, 261.63, 329.63, 392.0]   // Am7
      ];
      let currentChordIdx = 0;

      const playChord = () => {
        if (this.currentAmbience !== 'jazz' || !this.ctx) return;
        const now = this.ctx.currentTime;
        const freqs = chordNotes[currentChordIdx % chordNotes.length];
        currentChordIdx++;

        freqs.forEach(freq => {
          const osc = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(380, now);

          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(0.038 * this.ambienceVolume, now + 1.8);
          g.gain.exponentialRampToValueAtTime(0.001, now + 6.5);

          osc.connect(filter);
          filter.connect(g);
          g.connect(masterGain);

          osc.start(now);
          osc.stop(now + 6.8);
        });

        const nextTimer = window.setTimeout(playChord, 7000);
        this.ambienceTimers.push(nextTimer);
      };
      playChord();
    }
  }

  public stopAmbience() {
    this.ambienceTimers.forEach(t => window.clearTimeout(t));
    this.ambienceTimers = [];

    this.ambienceActiveNodes.forEach(node => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {}
    });
    this.ambienceActiveNodes = [];

    if (this.ambienceMasterGain) {
      try {
        this.ambienceMasterGain.disconnect();
      } catch {}
      this.ambienceMasterGain = null;
    }
  }

  public setAmbienceVolume(vol: number) {
    this.ambienceVolume = Math.max(0, Math.min(1, vol));
    if (this.ambienceMasterGain && this.ctx) {
      this.ambienceMasterGain.gain.setValueAtTime(
        this.ambienceVolume * this.volume,
        this.ctx.currentTime
      );
    }
  }

  public getAmbience(): AmbienceType {
    return this.currentAmbience;
  }

  public getAmbienceVolume(): number {
    return this.ambienceVolume;
  }

  /**
   * Card deal / whoosh sound with tactile paper slide
   */
  public playCardDeal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.08);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  /**
   * Normal matching card trick capture (crisp coin chime)
   */
  public playMatchSweep() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);

      gain.gain.setValueAtTime(0.2 * this.volume, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.22);
    });
  }

  /**
   * Vale (Jack) Power Sweep (golden vortex resonance)
   */
  public playJackSweep() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.35);

    gain.gain.setValueAtTime(0.25 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(2200, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  /**
   * PİŞTİ SLAM! Massive 808 bass punch + metallic crack
   */
  public playPistiSlam() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Sub Bass Drop (808 style punch)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(180, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.4);

    subGain.gain.setValueAtTime(0.6 * this.volume, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.5);

    // 2. High Impact Crack
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'triangle';
    crackOsc.frequency.setValueAtTime(680, t);
    crackOsc.frequency.exponentialRampToValueAtTime(120, t + 0.12);

    crackGain.gain.setValueAtTime(0.4 * this.volume, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    crackOsc.connect(crackGain);
    crackGain.connect(this.ctx.destination);
    crackOsc.start(t);
    crackOsc.stop(t + 0.16);

    // 3. Victory Crystal Chime Arpeggio
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    fanfareNotes.forEach((note, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, t + 0.08 + i * 0.055);

      g.gain.setValueAtTime(0.22 * this.volume, t + 0.08 + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + i * 0.055 + 0.4);

      osc.connect(g);
      g.connect(this.ctx!.destination);

      osc.start(t + 0.08 + i * 0.055);
      osc.stop(t + 0.08 + i * 0.055 + 0.45);
    });
  }

  /**
   * ÇİFT PİŞTİ (Double Pişti / J on J)
   */
  public playDoublePisti() {
    if (!this.enabled) return;
    this.playPistiSlam();

    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.2;
    const chords = [659.25, 830.61, 987.77, 1318.51];
    chords.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  /**
   * Clean UI Button Click
   */
  public playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * UNO: Reverse Direction Whoosh Sound
   */
  public playUnoReverse() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.38);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(3, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.24 * this.volume, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  /**
   * UNO: Skip Turn Laser Strike Sound
   */
  public playUnoSkip() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * UNO: Wild Card 4-Color Harmonic Chime
   */
  public playUnoWild() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * UNO: Dramatic & Radiant "UNO!" Shout Fanfare
   */
  public playUnoShout() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    // Rich bright triad fanfare (C5 -> E5 -> G5 -> C6 sweep)
    const chords = [523.25, 659.25, 783.99, 1046.5];
    chords.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.04;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.24 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  /**
   * UNO: Draw 2 / Draw 4 Impact Thump
   */
  public playUnoDrawPenalty() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.28);

    gain.gain.setValueAtTime(0.32 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }
}

export const sound = new SoundEngine();
