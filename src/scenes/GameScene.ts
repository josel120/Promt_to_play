import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MATCH_DURATION_S } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import { SceneKeys } from '../shared/scenes';
import type { MatchResult, PlayerConfig, Scores } from '../shared/types';
import { Gameplay } from '../systems/Gameplay';

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
  private gameplay?: Gameplay;

  constructor() {
    super(SceneKeys.Game);
  }

  init(data: GameSceneData): void {
    this.players = data.players ?? [];
    this.scores = Object.fromEntries(this.players.map((p) => [p.id, 0]));
    this.timeLeftS = MATCH_DURATION_S;
  }

  create(): void {
    // TODO (Thais): reemplazar por el bosque de src/world (fondo, límites, árboles, rocas).
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 40, GAME_HEIGHT - 40, 0x1f4d2b);

    // TODO (Thais): FlowerSpawner, que crea las flores usando la clase Flower de Jose.
    // Cuando llegue el bosque: bounds: this.forest.bounds, obstacles: this.forest.obstacles.
    this.gameplay = new Gameplay(this, {
      players: this.players,
      bounds: { x: 20, y: 60, width: GAME_WIDTH - 40, height: GAME_HEIGHT - 80 },
    });

    const intro = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Partida con ${this.players.length} hadas\nESC para terminar`, {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);
    this.tweens.add({ targets: intro, alpha: 0, delay: 1500, duration: 600, onComplete: () => intro.destroy() });

    // TODO (Thais): mover a un HUD en src/ui.
    this.timerText = this.add.text(GAME_WIDTH / 2, 30, '', { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    this.updateTimerText();

    gameEvents.on(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
      this.gameplay?.destroy();
      this.gameplay = undefined;
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

  update(time: number, delta: number): void {
    this.gameplay?.update(time, delta);
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
