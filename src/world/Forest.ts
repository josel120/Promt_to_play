import Phaser from 'phaser';
import { DEPTH, FOREST, GAME_HEIGHT, GAME_WIDTH } from '../shared/config';
import type { Obstacle, Point, Rect } from '../shared/types';
import {
  collidesWithObstacle,
  createRng,
  defaultBounds,
  generateForestLayout,
  isInsideBounds,
  type ForestLayoutOptions,
} from './forestLayout';

const COLORS = {
  outside: 0x0d1f14,
  ground: 0x1f4d2b,
  border: 0x143a20,
  grass: 0x2a6338,
  treeShadow: 0x0a2612,
  treeCanopy: 0x1b5e2c,
  treeHighlight: 0x2e7d3e,
  rock: 0x8a8f93,
  rockShade: 0x5f6468,
};

/**
 * Bosque dibujado con formas geométricas (placeholder hasta tener sprites).
 * Expone `bounds` y `obstacles` para el spawner de flores y las colisiones de las hadas.
 */
export class Forest {
  readonly bounds: Rect;
  readonly obstacles: readonly Obstacle[];

  constructor(scene: Phaser.Scene, options: ForestLayoutOptions = {}) {
    this.bounds = defaultBounds();
    this.obstacles = generateForestLayout(this.bounds, options);

    this.drawGround(scene, options.seed ?? FOREST.seed);
    for (const o of this.obstacles) {
      if (o.kind === 'tree') this.drawTree(scene, o);
      else this.drawRock(scene, o);
    }
  }

  /** true si un círculo en `p` cabe en el área jugable sin tocar obstáculos. */
  isFree(p: Point, radius = 0, gap = 0): boolean {
    return isInsideBounds(this.bounds, p, radius) && !collidesWithObstacle(this.obstacles, p, radius, gap);
  }

  private drawGround(scene: Phaser.Scene, seed: number): void {
    const { x, y, width, height } = this.bounds;
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.outside).setDepth(DEPTH.background);
    scene.add
      .rectangle(x, y, width, height, COLORS.ground)
      .setOrigin(0)
      .setStrokeStyle(6, COLORS.border)
      .setDepth(DEPTH.background);

    // Matas de hierba decorativas, sin colisión.
    const rng = createRng(seed + 1);
    const grass = scene.add.graphics().setDepth(DEPTH.background);
    grass.fillStyle(COLORS.grass, 1);
    for (let i = 0; i < 70; i++) {
      const gx = x + 10 + rng() * (width - 20);
      const gy = y + 10 + rng() * (height - 20);
      grass.fillTriangle(gx - 4, gy + 4, gx, gy - 6, gx + 4, gy + 4);
    }
  }

  private drawTree(scene: Phaser.Scene, o: Obstacle): void {
    const g = scene.add.graphics().setDepth(DEPTH.obstacles);
    g.fillStyle(COLORS.treeShadow, 0.6);
    g.fillCircle(o.x + 4, o.y + 6, o.radius);
    g.fillStyle(COLORS.treeCanopy, 1);
    g.fillCircle(o.x, o.y, o.radius);
    g.fillStyle(COLORS.treeHighlight, 1);
    g.fillCircle(o.x - o.radius * 0.3, o.y - o.radius * 0.3, o.radius * 0.45);
  }

  private drawRock(scene: Phaser.Scene, o: Obstacle): void {
    // Polígono irregular estable: usa la posición como semilla.
    const rng = createRng(Math.round(o.x * 31 + o.y));
    const sides = 6;
    const points = Array.from({ length: sides }, (_, i) => {
      const angle = (i / sides) * Math.PI * 2;
      const r = o.radius * (0.8 + rng() * 0.25);
      return new Phaser.Math.Vector2(o.x + Math.cos(angle) * r, o.y + Math.sin(angle) * r);
    });

    const g = scene.add.graphics().setDepth(DEPTH.obstacles);
    g.fillStyle(COLORS.rockShade, 1);
    g.fillPoints(points.map((p) => new Phaser.Math.Vector2(p.x + 2, p.y + 3)), true);
    g.fillStyle(COLORS.rock, 1);
    g.fillPoints(points, true);
  }
}
