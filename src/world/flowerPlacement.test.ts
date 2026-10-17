import { describe, expect, it } from 'vitest';
import { collidesWithObstacle, defaultBounds, generateForestLayout, isInsideBounds } from './forestLayout';
import { planFlowers } from './flowerPlacement';

describe('planFlowers', () => {
  const bounds = defaultBounds();
  const obstacles = generateForestLayout(bounds);
  const isFree = (p: { x: number; y: number }, r: number) =>
    isInsideBounds(bounds, p, r) && !collidesWithObstacle(obstacles, p, r);

  it('genera la cantidad pedida', () => {
    expect(planFlowers(bounds, isFree, { count: 40, seed: 1 })).toHaveLength(40);
  });

  it('es determinista con la misma semilla', () => {
    expect(planFlowers(bounds, isFree, { seed: 5 })).toEqual(planFlowers(bounds, isFree, { seed: 5 }));
  });

  it('ninguna flor cae sobre un obstáculo ni fuera del área', () => {
    for (const s of planFlowers(bounds, isFree, { seed: 3, radius: 12 })) {
      expect(isFree(s.position, 12)).toBe(true);
    }
  });

  it('respeta la distancia mínima entre flores', () => {
    const spawns = planFlowers(bounds, isFree, { seed: 9, minDistance: 40 });
    for (let i = 0; i < spawns.length; i++) {
      for (let j = i + 1; j < spawns.length; j++) {
        const d = Math.hypot(spawns[i].position.x - spawns[j].position.x, spawns[i].position.y - spawns[j].position.y);
        expect(d).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it('ids únicos y consecutivos, tonos neutros', () => {
    const spawns = planFlowers(bounds, isFree, { seed: 2 });
    expect(spawns.map((s) => s.id)).toEqual(spawns.map((_, i) => i));
    expect(spawns.every((s) => s.tone === 'blanca' || s.tone === 'gris')).toBe(true);
  });

  it('devuelve las que caben si no hay espacio para todas', () => {
    const tiny = { x: 0, y: 0, width: 100, height: 100 };
    const spawns = planFlowers(tiny, () => true, { count: 50, seed: 1, minDistance: 40 });
    expect(spawns.length).toBeGreaterThan(0);
    expect(spawns.length).toBeLessThan(50);
  });
});
