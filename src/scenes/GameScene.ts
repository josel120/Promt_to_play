import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, MATCH_DURATION_S } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import { SceneKeys } from '../shared/scenes';
import type { IFlower, MatchResult, PlayerConfig, Scores } from '../shared/types';
import { FlowerPaintEffects } from '../ui/FlowerPaintEffects';
import { Hud } from '../ui/Hud';
import { Forest } from '../world/Forest';
import { spawnFlowers } from '../world/FlowerSpawner';
import { installDebugTools } from './debugTools';

export interface GameSceneData {
  players: PlayerConfig[];
}

/**
 * Escena principal. Punto de encuentro entre los dos desarrolladores:
 *  - Thais: bosque (src/world), spawner de flores, HUD y efectos (src/ui).
 *  - Jose: hadas y flores (src/entities), hechizo y puntuación (src/systems).
 */
export class GameScene extends Phaser.Scene {
  private players: PlayerConfig[] = [];
  private scores: Scores = {};
  private timeLeftS = MATCH_DURATION_S;
  private hud!: Hud;
  private ended = false;
  /** Momento en que se reanudó: evita que la misma tecla que cierra la pausa la vuelva a abrir. */
  private resumedAt = 0;
  /** Área jugable y obstáculos: `this.forest.bounds`, `this.forest.obstacles`, `this.forest.isFree()`. */
  forest!: Forest;
  flowers: IFlower[] = [];

  constructor() {
    super(SceneKeys.Game);
  }

  init(data: GameSceneData): void {
    this.players = data.players ?? [];
    this.scores = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    this.timeLeftS = MATCH_DURATION_S;
    this.ended = false;
  }

  create(): void {
    this.forest = new Forest(this);

    // TODO (Jose): cuando exista Flower, pasar su fábrica: spawnFlowers(this, this.forest, (scene, s) => new Flower(scene, s)).
    this.flowers = spawnFlowers(this, this.forest);

    // TODO (Jose): crear un Fairy por cada jugador de this.players.
    //   Usar this.forest.bounds para los límites y this.forest.obstacles para las colisiones.

    this.hud = new Hud(this, this.players, this.flowers.length);
    this.hud.setTime(this.timeLeftS);
    new FlowerPaintEffects(this);

    if (import.meta.env.DEV) {
      installDebugTools(this, this.players, this.flowers);
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 6, 'DEV · F: simular flor pintada', { fontSize: '13px', color: '#9fc9a8' })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.ui);
    }

    gameEvents.on(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    });

    this.time.addEvent({
      delay: 1000,
      repeat: MATCH_DURATION_S - 1,
      callback: () => {
        this.timeLeftS -= 1;
        this.hud.setTime(this.timeLeftS);
        if (this.timeLeftS > 0 && this.timeLeftS <= 5) sfx.tick();
        if (this.timeLeftS <= 0) this.endMatch();
      },
    });

    this.input.keyboard?.on('keydown-ESC', () => this.pauseMatch());
    this.input.keyboard?.on('keydown-P', () => this.pauseMatch());

    gameEvents.emit(GameEvents.MATCH_STARTED, { durationS: MATCH_DURATION_S });
  }

  pauseMatch(): void {
    if (this.ended || performance.now() - this.resumedAt < 250) return;
    sfx.pauseMusic();
    this.scene.launch(SceneKeys.Pause);
    this.scene.pause();
  }

  resumeMatch(): void {
    this.resumedAt = performance.now();
    sfx.resumeMusic();
    this.scene.resume();
  }

  restartMatch(): void {
    this.scene.restart({ players: this.players } satisfies GameSceneData);
  }

  private onScoreChanged({ scores }: { scores: Scores }): void {
    this.scores = scores;
  }

  endMatch(): void {
    if (this.ended) return;
    this.ended = true;
    const best = Math.max(0, ...Object.values(this.scores));
    const winners = best === 0 ? [] : this.players.filter((p) => this.scores[p.id] === best).map((p) => p.id);
    const result: MatchResult = { scores: this.scores, players: this.players, winners };
    gameEvents.emit(GameEvents.GAME_OVER, result);
    this.scene.start(SceneKeys.Results, result);
  }
}
