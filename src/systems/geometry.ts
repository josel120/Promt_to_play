import type { Point } from '../shared/types';

/** Rectángulo jugable (compatible con `Rect` del mundo). */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cualquier cosa redonda: obstáculos, hadas, power-ups (compatible con `Obstacle` del mundo). */
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Vector unitario (o cero) para que moverse en diagonal no sea más rápido. */
export function normalize(dx: number, dy: number): Point {
  const len = Math.hypot(dx, dy);
  return len === 0 ? { x: 0, y: 0 } : { x: dx / len, y: dy / len };
}

/** Mantiene un círculo dentro de los límites. */
export function clampToBounds(p: Point, radius: number, b: Bounds): Point {
  return {
    x: Math.min(Math.max(p.x, b.x + radius), b.x + b.width - radius),
    y: Math.min(Math.max(p.y, b.y + radius), b.y + b.height - radius),
  };
}

/** Si el círculo (p, radius) se mete en el obstáculo, lo empuja hasta su borde. Si no, devuelve null. */
export function pushOutOf(p: Point, radius: number, obstacle: Circle): Point | null {
  const minDist = radius + obstacle.radius;
  const dx = p.x - obstacle.x;
  const dy = p.y - obstacle.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= minDist) return null;
  const dir = dist === 0 ? { x: 1, y: 0 } : { x: dx / dist, y: dy / dist };
  return { x: obstacle.x + dir.x * minDist, y: obstacle.y + dir.y * minDist };
}

/** Separa dos círculos solapados a partes iguales. Devuelve null si no se tocan. */
export function separate(a: Circle, b: Circle): { a: Point; b: Point } | null {
  const minDist = a.radius + b.radius;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= minDist) return null;
  const dir = dist === 0 ? { x: 1, y: 0 } : { x: dx / dist, y: dy / dist };
  const push = (minDist - dist) / 2;
  return {
    a: { x: a.x - dir.x * push, y: a.y - dir.y * push },
    b: { x: b.x + dir.x * push, y: b.y + dir.y * push },
  };
}

/**
 * Reparte `count` puntos dentro de los límites, lejos de los obstáculos y entre sí.
 * Si no caben todos con esa separación, devuelve los que haya podido colocar.
 */
export function scatterPoints(
  count: number,
  bounds: Bounds,
  options: { avoid?: Circle[]; minDistance: number; padding: number; rng?: () => number },
): Point[] {
  const { avoid = [], minDistance, padding, rng = Math.random } = options;
  const points: Point[] = [];
  const maxAttempts = count * 200;
  for (let attempt = 0; attempt < maxAttempts && points.length < count; attempt++) {
    const p = {
      x: bounds.x + padding + rng() * (bounds.width - padding * 2),
      y: bounds.y + padding + rng() * (bounds.height - padding * 2),
    };
    const blocked = avoid.some((c) => distance(p, c) < c.radius + padding);
    const crowded = points.some((q) => distance(p, q) < minDistance);
    if (!blocked && !crowded) points.push(p);
  }
  return points;
}
