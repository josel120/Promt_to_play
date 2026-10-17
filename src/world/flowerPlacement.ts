// Lógica pura del reparto de flores (sin Phaser), testeable.
import { FLOWER } from '../shared/config';
import type { Point, Rect } from '../shared/types';
import { createRng } from './forestLayout';

export type NeutralTone = 'blanca' | 'gris';

/** Datos para crear una flor. El spawner se los pasa a la fábrica de flores. */
export interface FlowerSpawn {
  id: number;
  position: Point;
  tone: NeutralTone;
}

export interface FlowerPlacementOptions {
  count?: number;
  seed?: number;
  minDistance?: number;
  radius?: number;
  grayRatio?: number;
}

/**
 * Elige posiciones para las flores dentro de `bounds`, donde `isFree` lo permita
 * y separadas al menos `minDistance` entre sí. Si no caben todas, devuelve las que caben.
 */
export function planFlowers(
  bounds: Rect,
  isFree: (p: Point, radius: number) => boolean,
  options: FlowerPlacementOptions = {},
): FlowerSpawn[] {
  const {
    count = FLOWER.count,
    seed = Date.now(),
    minDistance = FLOWER.minDistance,
    radius = FLOWER.radius,
    grayRatio = FLOWER.grayRatio,
  } = options;
  const rng = createRng(seed);
  const spawns: FlowerSpawn[] = [];

  for (let attempts = 0; spawns.length < count && attempts < count * 100; attempts++) {
    const position = {
      x: bounds.x + radius + rng() * (bounds.width - radius * 2),
      y: bounds.y + radius + rng() * (bounds.height - radius * 2),
    };
    const tooClose = spawns.some((s) => Math.hypot(s.position.x - position.x, s.position.y - position.y) < minDistance);
    if (!tooClose && isFree(position, radius)) {
      spawns.push({ id: spawns.length, position, tone: rng() < grayRatio ? 'gris' : 'blanca' });
    }
  }
  return spawns;
}
