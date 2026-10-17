import { describe, expect, it } from 'vitest';
import { clampToBounds, distance, normalize, pushOutOf, scatterPoints, separate } from './geometry';

const bounds = { x: 20, y: 60, width: 400, height: 300 };

describe('geometría de colisiones', () => {
  it('moverse en diagonal no es más rápido', () => {
    const d = normalize(1, 1);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    expect(normalize(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('las hadas no salen del bosque', () => {
    expect(clampToBounds({ x: 0, y: 1000 }, 10, bounds)).toEqual({ x: 30, y: 350 });
    expect(clampToBounds({ x: 100, y: 100 }, 10, bounds)).toEqual({ x: 100, y: 100 });
  });

  it('un obstáculo empuja al hada hasta su borde', () => {
    const p = pushOutOf({ x: 105, y: 100 }, 10, { x: 100, y: 100, radius: 20 });
    expect(p).not.toBeNull();
    expect(distance(p!, { x: 100, y: 100 })).toBeCloseTo(30);
    expect(pushOutOf({ x: 200, y: 100 }, 10, { x: 100, y: 100, radius: 20 })).toBeNull();
  });

  it('dos hadas solapadas se separan a partes iguales', () => {
    const r = separate({ x: 0, y: 0, radius: 10 }, { x: 10, y: 0, radius: 10 });
    expect(r).toEqual({ a: { x: -5, y: 0 }, b: { x: 15, y: 0 } });
    expect(separate({ x: 0, y: 0, radius: 10 }, { x: 30, y: 0, radius: 10 })).toBeNull();
  });

  it('reparte puntos dentro de los límites, separados y lejos de obstáculos', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rock = { x: 220, y: 210, radius: 50 };
    const points = scatterPoints(15, bounds, { avoid: [rock], minDistance: 30, padding: 10, rng });
    expect(points).toHaveLength(15);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(bounds.x + 10);
      expect(p.x).toBeLessThanOrEqual(bounds.x + bounds.width - 10);
      expect(distance(p, rock)).toBeGreaterThanOrEqual(rock.radius + 10);
      for (const q of points) if (p !== q) expect(distance(p, q)).toBeGreaterThanOrEqual(30);
    }
  });
});
