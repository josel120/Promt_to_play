import Phaser from 'phaser';
import { FAIRY, FLOWER, SPELL } from '../shared/config';
import type { PlayerConfig, Point } from '../shared/types';
import { Fairy } from '../entities/Fairy';
import { Flower } from '../entities/Flower';
import { CollisionSystem } from './CollisionSystem';
import { scatterPoints, type Bounds, type Circle } from './geometry';
import { POWER_UP_SPAWN } from './powerUps';
import { PowerUpSystem } from './PowerUpSystem';
import { pickQuip } from './quips';
import { RivalController } from './RivalController';
import { ScoreSystem } from './ScoreSystem';
import { SpellSystem } from './SpellSystem';

export interface GameplayOptions {
  players: PlayerConfig[];
  /** Área jugable (p. ej. `forest.bounds`). */
  bounds: Bounds;
  /** Árboles y rocas (p. ej. `forest.obstacles`). */
  obstacles?: Circle[];
  /** Dónde poner las flores (GameScene se las pasa desde planFlowers). Si falta, se reparten al azar. */
  flowerPositions?: Point[];
}

/** Punto de entrada del gameplay de Jose: crea hadas y flores y mueve todos los sistemas. */
export class Gameplay {
  readonly fairies: Fairy[];
  readonly flowers: Flower[];
  readonly scores: ScoreSystem;
  private readonly spells: SpellSystem;
  private readonly collisions: CollisionSystem;
  private readonly powerUps: PowerUpSystem;

  constructor(scene: Phaser.Scene, options: GameplayOptions) {
    const { players, bounds, obstacles = [] } = options;
    const starts = startPositions(bounds, players.length);

    const avoid: Circle[] = [...obstacles, ...starts.map((p) => ({ ...p, radius: FAIRY.radius * 2 }))];
    const flowerPositions =
      options.flowerPositions ??
      scatterPoints(FLOWER.count, bounds, { avoid, minDistance: FLOWER.radius * 4, padding: FLOWER.radius * 2 });

    this.flowers = flowerPositions.map((p, i) => new Flower(scene, i, p));
    this.fairies = players.map((p, i) => new Fairy(scene, p, starts[i]));
    this.scores = new ScoreSystem(players.map((p) => p.id));
    this.powerUps = new PowerUpSystem(scene, () => this.findPowerUpSpot(bounds, obstacles));
    this.spells = new SpellSystem(scene, this.flowers, (id, now) => this.powerUps.effects(id, now));
    this.collisions = new CollisionSystem(bounds, obstacles);

    players.forEach((p, i) => {
      if (!p.cpu) return;
      const fairy = this.fairies[i];
      fairy.useControls(
        new RivalController(fairy, {
          flowers: this.flowers,
          obstacles,
          powerUps: () => this.powerUps.positions(),
          rivals: () => this.fairies.filter((f) => f !== fairy).map((f) => f.position),
          spellRadius: (now) => SPELL.radius * this.powerUps.effects(p.id, now).spellRadiusMultiplier,
          speed: () => FAIRY.speed * fairy.speedMultiplier,
        }),
      );
    });

    this.fairies.forEach((f, i) => scene.time.delayedCall(300 + i * 250, () => f.say(pickQuip('start'))));
  }

  update(time: number, delta: number): void {
    for (const fairy of this.fairies) {
      fairy.update(time, delta);
      if (fairy.wantsToCast()) this.spells.tryCast(fairy, time);
    }
    this.collisions.resolve(this.fairies, time);
    this.powerUps.update(this.fairies, time);
  }

  destroy(): void {
    this.scores.destroy();
    this.powerUps.destroy();
    this.fairies.forEach((f) => f.destroy());
    this.flowers.forEach((f) => f.destroy());
  }

  private findPowerUpSpot(bounds: Bounds, obstacles: Circle[]): Point | null {
    const avoid: Circle[] = [
      ...obstacles,
      ...this.fairies.map((f) => ({ ...f.position, radius: f.radius * 4 })),
      ...this.flowers.map((f) => ({ ...f.position, radius: FLOWER.radius })),
    ];
    const [spot] = scatterPoints(1, bounds, { avoid, minDistance: 0, padding: POWER_UP_SPAWN.radius * 2 });
    return spot ?? null;
  }
}

/** Cada hada empieza en una esquina del bosque. */
export function startPositions(bounds: Bounds, count: number): Point[] {
  const inset = 70;
  const corners: Point[] = [
    { x: bounds.x + inset, y: bounds.y + inset },
    { x: bounds.x + bounds.width - inset, y: bounds.y + bounds.height - inset },
    { x: bounds.x + bounds.width - inset, y: bounds.y + inset },
    { x: bounds.x + inset, y: bounds.y + bounds.height - inset },
  ];
  return corners.slice(0, count);
}

