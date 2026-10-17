import { describe, expect, it } from 'vitest';
import { FOREST } from '../shared/config';
import { collidesWithObstacle, defaultBounds, generateForestLayout, isInsideBounds } from './forestLayout';

describe('generateForestLayout', () => {
  const bounds = defaultBounds();

  it('genera el mismo bosque con la misma semilla', () => {
    expect(generateForestLayout(bounds, { seed: 7 })).toEqual(generateForestLayout(bounds, { seed: 7 }));
  });

  it('genera bosques distintos con semillas distintas', () => {
    expect(generateForestLayout(bounds, { seed: 1 })).not.toEqual(generateForestLayout(bounds, { seed: 2 }));
  });

  it('coloca todos los árboles y rocas configurados', () => {
    const obstacles = generateForestLayout(bounds);
    expect(obstacles.filter((o) => o.kind === 'tree')).toHaveLength(FOREST.treeCount);
    expect(obstacles.filter((o) => o.kind === 'rock')).toHaveLength(FOREST.rockCount);
  });

  it('todos los obstáculos quedan dentro del área jugable', () => {
    for (const o of generateForestLayout(bounds)) {
      expect(isInsideBounds(bounds, o, o.radius)).toBe(true);
    }
  });

  it('ningún obstáculo se solapa con otro', () => {
    const obstacles = generateForestLayout(bounds);
    obstacles.forEach((o, i) => {
      const others = obstacles.filter((_, j) => j !== i);
      expect(collidesWithObstacle(others, o, o.radius)).toBe(false);
    });
  });

  it('devuelve los que caben si se piden demasiados', () => {
    const tiny = { x: 0, y: 0, width: 200, height: 200 };
    const obstacles = generateForestLayout(tiny, { treeCount: 50, rockCount: 0 });
    expect(obstacles.length).toBeGreaterThan(0);
    expect(obstacles.length).toBeLessThan(50);
  });
});

describe('collidesWithObstacle', () => {
  const tree = { kind: 'tree' as const, x: 100, y: 100, radius: 30 };

  it('detecta un círculo que toca el obstáculo', () => {
    expect(collidesWithObstacle([tree], { x: 140, y: 100 }, 12)).toBe(true);
  });

  it('no detecta un círculo lejano', () => {
    expect(collidesWithObstacle([tree], { x: 200, y: 100 }, 12)).toBe(false);
  });
});
