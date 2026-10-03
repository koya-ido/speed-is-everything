/**
 * Web Audio API Sound System
 * Supports low-latency AudioBuffer playback from /sounds/ with synthesis fallback,
 * independent BGM / SE volume mixing, and Safari/iOS gesture unlocking.
 */

const SOUND_FILES = {
  bgm: "/sounds/bgm.mp3",
  action: "/sounds/action.mp3",
  tick: "/sounds/tick.mp3",
  stop_godlike: "/sounds/stop_godlike.mp3",
  stop_excellent: "/sounds/stop_excellent.mp3",
  stop_normal: "/sounds/stop_normal.mp3",
  count_down: "/sounds/count_down.mp3",
  gameover: "/sounds/gameover.mp3",
  damage: "/sounds/damage.mp3",
} as const;

type SoundName = keyof typeof SOUND_FILES;

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;

  private buffers: Map<SoundName, AudioBuffer> = new Map();
  private loadPromises: Map<SoundName, Promise<AudioBuffer | null>> = new Map();

  private bgmSource: AudioBufferSourceNode | null = null;
  private tickSource: AudioBufferSourceNode | null = null;

  private isBgmPlaying: boolean = false;
  private isTickPlaying: boolean = false;
  private _isMuted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("speed_game_muted");
        this._isMuted = stored === "true";
      } catch {
        this._isMuted = false;
      }
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public setMuted(muted: boolean) {
    this._isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("speed_game_muted", String(muted));
      } catch {
        // ignore storage errors
      }
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this._isMuted);
    return this._isMuted;
  }

  /**
   * Unlock AudioContext on user gesture and initialize routing nodes.
   */
  public unlock() {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();

        // Master gain for global mute
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this._isMuted ? 0 : 1,
          this.ctx.currentTime,
        );
        this.masterGain.connect(this.ctx.destination);

        // BGM gain (attenuated so SE remains punchy and comfortable)
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // SE gain (crisp and clear)
        this.seGain = this.ctx.createGain();
        this.seGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.seGain.connect(this.masterGain);
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    // Preload audio files eagerly
    this.preloadAll();
  }

  /**
   * Preload a single audio buffer
   */
  private async loadBuffer(name: SoundName): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) {
      return this.buffers.get(name)!;
    }
    if (this.loadPromises.has(name)) {
      return this.loadPromises.get(name)!;
    }

    const promise = (async () => {
      try {
        if (!this.ctx) return null;
        const res = await fetch(SOUND_FILES[name]);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
        return audioBuffer;
      } catch {
        return null;
      }
    })();

    this.loadPromises.set(name, promise);
    return promise;
  }

  /**
   * Preload all sound assets in parallel
   */
  public preloadAll() {
    if (!this.ctx) return;
    (Object.keys(SOUND_FILES) as SoundName[]).forEach((name) => {
      this.loadBuffer(name);
    });
  }

  /**
   * Play BGM in loop
   */
  public async playBgm() {
    this.isBgmPlaying = true;
    if (typeof window === "undefined") return;
    this.unlock();

    if (this.bgmSource) {
      return; // Already playing
    }

    const buffer = await this.loadBuffer("bgm");
    if (!buffer || !this.ctx || !this.bgmGain || !this.isBgmPlaying) return;

    this.stopBgm();
    this.isBgmPlaying = true;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.bgmGain);

    this.bgmSource = source;
    try {
      source.start(0);
    } catch {
      this.bgmSource = null;
    }
  }

  /**
   * Stop BGM immediately
   */
  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch {}
      this.bgmSource = null;
    }
  }

  /**
   * Start 'tick' sound while waiting for player's push (ACTION state)
   */
  public async startTick() {
    this.isTickPlaying = true;
    if (typeof window === "undefined") return;
    this.unlock();

    if (this.tickSource) return;

    const buffer = await this.loadBuffer("tick");
    if (!buffer || !this.ctx || !this.seGain || !this.isTickPlaying) return;

    this.stopTick();
    this.isTickPlaying = true;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.seGain);

    this.tickSource = source;
    try {
      source.start(0);
    } catch {
      this.tickSource = null;
    }
  }

  /**
   * Stop 'tick' sound immediately when user taps or round ends
   */
  public stopTick() {
    this.isTickPlaying = false;
    if (this.tickSource) {
      try {
        this.tickSource.stop();
      } catch {}
      this.tickSource = null;
    }
  }

  /**
   * Helper to play a one-shot sound buffer
   */
  private async playOneShot(name: SoundName, fallbackOsc?: () => void) {
    if (typeof window === "undefined") return;
    this.unlock();

    const buffer = await this.loadBuffer(name);
    if (buffer && this.ctx && this.seGain) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.seGain);
      try {
        source.start(0);
        return;
      } catch {}
    }

    // Fallback synthesizer if file buffer couldn't load
    if (fallbackOsc) {
      fallbackOsc();
    }
  }

  /**
   * Action trigger sound: Signal player to tap (Wait -> Push)
   */
  public playAction() {
    this.playOneShot("action", () => this.synthesizeAction());
  }

  /**
   * Normal hit: Tap stopped (< 3000ms, standard)
   */
  public playHitNormal() {
    this.playOneShot("stop_normal", () => this.synthesizeHitNormal());
  }

  /**
   * Countdown tick (3, 2, 1)
   */
  public playCountdown() {
    this.playOneShot("count_down", () => this.synthesizeHitNormal());
  }

  /**
   * Excellent hit: Tap stopped with great reflex
   */
  public playHitExcellent() {
    this.playOneShot("stop_excellent", () => this.synthesizeHitExcellent());
  }

  /**
   * Godlike hit: Ultra-fast reaction (< 180ms or GODLIKE rank)
   */
  public playHitGodlike() {
    this.playOneShot("stop_godlike", () => this.synthesizeHitGodlike());
  }

  /**
   * Battle damage sound: HP reduction on impact
   */
  public playDamage() {
    this.playOneShot("damage", () => this.synthesizeHitNormal());
  }

  /**
   * Game Over / False Start / Tab Leave
   * Stops BGM & Tick immediately, then plays gameover sound
   */
  public playGameOver() {
    this.stopBgm();
    this.stopTick();
    this.playOneShot("gameover", () => this.synthesizeGameOver());
  }

  /**
   * Optional game start sound
   */
  public playStart() {
    this.playBgm();
  }

  // --- Fallback Synthesizers (used if audio files fail to load) ---

  private canSynthesize(): boolean {
    if (this._isMuted || !this.ctx) return false;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx.state === "running";
  }

  private synthesizeAction() {
    if (!this.canSynthesize() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1046.5, now);
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.06);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.seGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  private synthesizeHitNormal() {
    if (!this.canSynthesize() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.03);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.seGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  private synthesizeHitExcellent() {
    if (!this.canSynthesize() || !this.ctx) return;
    const now = this.ctx.currentTime;
    [659.25, 987.77, 1318.51].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);
      gain.gain.setValueAtTime(0.18, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.12);
      osc.connect(gain);
      gain.connect(this.seGain || this.ctx.destination);
      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.02 + 0.12);
    });
  }

  private synthesizeHitGodlike() {
    if (!this.canSynthesize() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(180, now);
    subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    subOsc.connect(subGain);
    subGain.connect(this.seGain || this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.2);
  }

  private synthesizeGameOver() {
    if (!this.canSynthesize() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.25);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.seGain || this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const soundManager = new SoundManager();
