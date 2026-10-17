import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, MATCH_DURATION_S } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import { SceneKeys } from '../shared/scenes';
import type { IFlower, MatchResult, PlayerConfig, Scores } from '../shared/types';
import { Forest } from '../world/Forest';
import { spawnFlowers } from '../world/FlowerSpawner';

export interface GameSceneData {
  players: PlayerConfig[];
}

/**
 * Escena principal. Punto de encuentro entre los dos desarrolladores:
 *  - Thais: bosque (src/world), spawner de flores, HUD (src/ui).
 *  - Jose: hadas y flores (src/entities), hechizo y puntuación (src/systems).
 */
export class GameScene extends Phaser.Scene {
  private players: PlayerConfig[] = [];
  private scores: Scores = {};
  private timeLeftS = MATCH_DURATION_S;
  private timerText!: Phaser.GameObjects.Text;
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
  }

  create(): void {
    this.forest = new Forest(this);

    // TODO (Jose): cuando exista Flower, pasar su fábrica: spawnFlowers(this, this.forest, (scene, s) => new Flower(scene, s)).
    this.flowers = spawnFlowers(this, this.forest);
    // TODO (Jose): crear un Fairy por cada jugador de this.players.
    //   Usar this.forest.bounds para los límites y this.forest.obstacles para las colisiones.

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Partida con ${this.players.length} hadas\nESC para terminar`, {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui)
      .setAlpha(0.6);

    // TODO (Thais): mover a un HUD en src/ui.
    this.timerText = this.add
      .text(GAME_WIDTH / 2, 38, '', { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);
    this.updateTimerText();

    gameEvents.on(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    });

    this.time.addEvent({
      delay: 1000,
      repeat: MATCH_DURATION_S - 1,
      callback: () => {
        this.timeLeftS -= 1;
        this.updateTimerText();
        if (this.timeLeftS <= 0) this.endMatch();
      },
    });

    this.input.keyboard?.once('keydown-ESC', () => this.endMatch());

    gameEvents.emit(GameEvents.MATCH_STARTED, { durationS: MATCH_DURATION_S });
  }

  private onScoreChanged({ scores }: { scores: Scores }): void {
    this.scores = scores;
  }

  private updateTimerText(): void {
    this.timerText.setText(`${this.timeLeftS}s`);
  }

  private endMatch(): void {
    const best = Math.max(0, ...Object.values(this.scores));
    const winners = best === 0 ? [] : this.players.filter((p) => this.scores[p.id] === best).map((p) => p.id);
    const result: MatchResult = { scores: this.scores, players: this.players, winners };
    gameEvents.emit(GameEvents.GAME_OVER, result);
    this.scene.start(SceneKeys.Results, result);
  }
}
