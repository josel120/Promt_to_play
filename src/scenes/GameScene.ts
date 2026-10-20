import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { FAIRY, MATCH_DURATION_S } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import { SceneKeys } from '../shared/scenes';
import type { IFlower, MatchResult, PlayerConfig, Scores } from '../shared/types';
import { Gameplay, startPositions } from '../systems/Gameplay';
import { winnersOf } from '../systems/scoring';
import { FlowerPaintEffects } from '../ui/FlowerPaintEffects';
import { Hud } from '../ui/Hud';
import { Forest } from '../world/Forest';
import { planFlowers } from '../world/flowerPlacement';

export interface GameSceneData {
  players: PlayerConfig[];
}

/**
 * Escena principal. Punto de encuentro entre los dos desarrolladores:
 *  - Thais: bosque y reparto de flores (src/world), HUD y efectos (src/ui).
 *  - Jose: hadas, flores, hechizos, colisiones, power-ups y puntuación (src/entities, src/systems).
 */
export class GameScene extends Phaser.Scene {
  private players: PlayerConfig[] = [];
  private scores: Scores = {};
  private timeLeftS = MATCH_DURATION_S;
  private hud!: Hud;
  private gameplay?: Gameplay;
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

    // Las flores no salen encima de los obstáculos ni en las esquinas donde empiezan las hadas.
    const starts = startPositions(this.forest.bounds, this.players.length);
    const flowerPositions = planFlowers(
      this.forest.bounds,
      (p, radius) =>
        this.forest.isFree(p, radius, 6) && starts.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > FAIRY.radius * 3),
    ).map((s) => s.position);

    this.gameplay = new Gameplay(this, {
      players: this.players,
      bounds: this.forest.bounds,
      obstacles: [...this.forest.obstacles],
      flowerPositions,
    });
    this.flowers = this.gameplay.flowers;

    this.hud = new Hud(this, this.players, this.flowers.length);
    this.hud.setTime(this.timeLeftS);
    new FlowerPaintEffects(this);

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
        this.hud.setTime(this.timeLeftS);
        if (this.timeLeftS > 0 && this.timeLeftS <= 5) sfx.tick();
        if (this.timeLeftS <= 0) this.endMatch();
      },
    });

    this.input.keyboard?.on('keydown-ESC', () => this.pauseMatch());
    this.input.keyboard?.on('keydown-P', () => this.pauseMatch());

    gameEvents.emit(GameEvents.MATCH_STARTED, { durationS: MATCH_DURATION_S });
  }

  update(time: number, delta: number): void {
    this.gameplay?.update(time, delta);
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
    const result: MatchResult = { scores: this.scores, players: this.players, winners: winnersOf(this.scores) };
    gameEvents.emit(GameEvents.GAME_OVER, result);
    this.scene.start(SceneKeys.Results, result);
  }
}
