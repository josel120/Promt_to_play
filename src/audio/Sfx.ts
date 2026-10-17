// Sonidos provisionales sintetizados con Web Audio (no necesitan archivos).
// TODO (Thais): cuando haya audio real, cargarlo en BootScene y reproducirlo aquí con scene.sound.
import { GameEvents, gameEvents } from '../shared/events';

interface ToneOptions {
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
  delay?: number;
}

/** Escala pentatónica para la música de fondo (Do mayor). */
const MUSIC_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];
const MUSIC_STEP_MS = 420;

class SoundBoard {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicTimer?: number;
  private musicStep = 0;
  private musicWanted = false;
  muted = false;

  /** Conecta los sonidos a los eventos del juego. Llamar una sola vez al arrancar. */
  bindToGameEvents(): void {
    gameEvents.on(GameEvents.SPELL_CAST, () => this.spell());
    gameEvents.on(GameEvents.FLOWER_PAINTED, () => this.paint());
    gameEvents.on(GameEvents.MATCH_STARTED, () => this.startMusic());
    gameEvents.on(GameEvents.GAME_OVER, () => {
      this.stopMusic();
      this.gameOver();
    });
  }

  spell(): void {
    this.tone(660, 0.15, { type: 'triangle', slideTo: 990, volume: 0.2 });
  }

  paint(): void {
    this.tone(880, 0.08, { volume: 0.25 });
    this.tone(1320, 0.12, { volume: 0.2, delay: 0.06 });
  }

  tick(): void {
    this.tone(440, 0.05, { type: 'square', volume: 0.08 });
  }

  click(): void {
    this.tone(700, 0.05, { type: 'triangle', volume: 0.15 });
  }

  gameOver(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', delay: i * 0.12 }));
  }

  startMusic(): void {
    this.musicWanted = true;
    if (this.musicTimer !== undefined) return;
    this.musicTimer = window.setInterval(() => {
      const note = MUSIC_NOTES[this.musicStep++ % MUSIC_NOTES.length];
      this.tone(note / 2, 0.35, { type: 'sine', volume: 0.06 });
    }, MUSIC_STEP_MS);
  }

  stopMusic(): void {
    this.musicWanted = false;
    this.pauseMusic();
  }

  /** Detiene la música sin olvidar que debe sonar (para la pausa). */
  pauseMusic(): void {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }

  resumeMusic(): void {
    if (this.musicWanted) this.startMusic();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return undefined;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, durationS: number, { type = 'sine', volume = 0.3, slideTo, delay = 0 }: ToneOptions = {}): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + durationS);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationS);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + durationS + 0.02);
  }
}

export const sfx = new SoundBoard();
