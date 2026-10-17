// Lógica pura del bosque (sin Phaser) para poder testearla y reutilizarla en el spawner y las colisiones.
import { FOREST, GAME_HEIGHT, GAME_WIDTH } from '../shared/config';
import type { Obstacle, ObstacleKind, Point, Rect } from '../shared/types';

/** Generador pseudoaleatorio con semilla (mulberry32). Devuelve números en [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Área jugable por defecto: el canvas menos el margen y la franja del HUD. */
export function defaultBounds(): Rect {
  const { margin, hudHeight } = FOREST;
  return {
    x: margin,
    y: margin + hudHeight,
    width: GAME_WIDTH - margin * 2,
    height: GAME_HEIGHT - margin * 2 - hudHeight,
  };
}

export function isInsideBounds(bounds: Rect, p: Point, radius = 0): boolean {
  return (
    p.x - radius >= bounds.x &&
    p.x + radius <= bounds.x + bounds.width &&
    p.y - radius >= bounds.y &&
    p.y + radius <= bounds.y + bounds.height
  );
}

/** true si un círculo en `p` con `radius` toca algún obstáculo (más `gap` px de holgura). */
export function collidesWithObstacle(obstacles: readonly Obstacle[], p: Point, radius = 0, gap = 0): boolean {
  return obstacles.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.radius + radius + gap);
}

export interface ForestLayoutOptions {
  seed?: number;
  treeCount?: number;
  rockCount?: number;
  spacing?: number;
}

/**
 * Coloca árboles y rocas dentro de `bounds` sin solaparse.
 * Con la misma semilla devuelve siempre el mismo bosque.
 * Si no encuentra hueco para todos, devuelve los que caben.
 */
export function generateForestLayout(bounds: Rect, options: ForestLayoutOptions = {}): Obstacle[] {
  const {
    seed = FOREST.seed,
    treeCount = FOREST.treeCount,
    rockCount = FOREST.rockCount,
    spacing = FOREST.spacing,
  } = options;
  const rng = createRng(seed);
  const obstacles: Obstacle[] = [];

  const place = (kind: ObstacleKind, count: number, range: { min: number; max: number }) => {
    for (let placed = 0, attempts = 0; placed < count && attempts < count * 50; attempts++) {
      const radius = range.min + rng() * (range.max - range.min);
      const pad = radius + spacing / 2;
      const p = {
        x: bounds.x + pad + rng() * (bounds.width - pad * 2),
        y: bounds.y + pad + rng() * (bounds.height - pad * 2),
      };
      if (!collidesWithObstacle(obstacles, p, radius, spacing)) {
        obstacles.push({ kind, x: p.x, y: p.y, radius });
        placed++;
      }
    }
  };

  // Primero los árboles, que son más grandes y difíciles de encajar.
  place('tree', treeCount, FOREST.treeRadius);
  place('rock', rockCount, FOREST.rockRadius);
  return obstacles;
}
