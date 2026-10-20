import { describe, expect, it } from 'vitest';
import type { FlowerState, Point } from '../shared/types';
import { clampToBounds, distance, pushOutOf, type Bounds, type Circle } from './geometry';
import { RivalController } from './RivalController';
import { canPaint, flowersInSpell } from './rules';
import { chooseTarget, shouldCast, spellGain, steer, type AiFlower, type AiView } from './rivalAi';

const ME = 1;
const neutral: FlowerState = { kind: 'neutral', tone: 'blanca' };
const paintedBy = (owner: number, paintedAt = -10_000): FlowerState => ({ kind: 'painted', owner, color: 'rosa', paintedAt });
const flower = (x: number, y: number, state: FlowerState = neutral): AiFlower => ({ position: { x, y }, state });

const view = (flowers: AiFlower[], extra: Partial<AiView> = {}): AiView => ({
  playerId: ME,
  position: { x: 0, y: 0 },
  now: 0,
  flowers,
  spellRadius: 70,
  speed: 220,
  ...extra,
});

describe('IA rival: valor de un hechizo', () => {
  it('cuenta las flores pintables, y una blanca vale más que una robada', () => {
    const flowers = [flower(0, 0), flower(10, 0, paintedBy(0)), flower(20, 0, paintedBy(ME)), flower(200, 0)];
    expect(spellGain(flowers, { x: 0, y: 0 }, 70, ME, 0)).toBeCloseTo(1.6);
  });

  it('no cuenta las flores ajenas todavía protegidas', () => {
    expect(spellGain([flower(0, 0, paintedBy(0, 0))], { x: 0, y: 0 }, 70, ME, 100)).toBe(0);
  });
});

describe('IA rival: a dónde ir', () => {
  it('prefiere un grupo de flores a una sola un poco más cerca', () => {
    const flowers = [flower(100, 0), flower(-160, 0), flower(-180, 20), flower(-170, -20)];
    const target = chooseTarget(view(flowers));
    expect(target?.kind).toBe('flowers');
    expect(target!.point.x).toBeLessThan(0);
    expect(target!.gain).toBeCloseTo(3.6);
  });

  it('ignora sus propias flores y no tiene objetivo si no queda nada que pintar', () => {
    expect(chooseTarget(view([flower(50, 0, paintedBy(ME))]))).toBeNull();
  });

  it('va a por una flor protegida si la protección acaba antes de llegar', () => {
    // A 440 px y 220 px/s tarda 2 s; la protección (1,5 s) acaba antes.
    const target = chooseTarget(view([flower(440, 0, paintedBy(0, 0))]));
    expect(target?.point).toEqual({ x: 440, y: 0 });
    // Pegada a ella, todavía está protegida.
    expect(chooseTarget(view([flower(5, 0, paintedBy(0, 0))]))).toBeNull();
  });

  it('se desvía a por un power-up cercano', () => {
    const target = chooseTarget(view([flower(400, 0)], { powerUps: [{ x: 0, y: 80 }] }));
    expect(target).toMatchObject({ kind: 'powerUp', point: { x: 0, y: 80 } });
  });

  it('evita las zonas donde se atascó', () => {
    const flowers = [flower(50, 0), flower(-300, 0)];
    const target = chooseTarget(view(flowers, { avoid: [{ x: 50, y: 0, radius: 60 }] }));
    expect(target?.point).toEqual({ x: -300, y: 0 });
  });
});

describe('IA rival: cuándo lanzar el hechizo', () => {
  it('no lanza si no pintaría nada', () => {
    const v = view([flower(300, 0)]);
    expect(shouldCast(v, chooseTarget(v))).toBe(false);
  });

  it('lanza al llegar al objetivo', () => {
    const v = view([flower(5, 0)]);
    expect(shouldCast(v, chooseTarget(v))).toBe(true);
  });

  it('espera a llegar si allí pintaría más', () => {
    const flowers = [flower(60, 0), flower(120, 0), flower(125, 10), flower(130, -10)];
    const v = view(flowers);
    const target = chooseTarget(v);
    expect(target!.gain).toBeGreaterThan(1);
    expect(shouldCast(v, target)).toBe(false);
  });
});

describe('IA rival: esquivar obstáculos', () => {
  it('va en línea recta si no hay nada en medio', () => {
    expect(steer({ x: 0, y: 0 }, { x: 100, y: 0 }, 18, [{ x: 50, y: 200, radius: 30 }])).toEqual({ x: 1, y: 0 });
  });

  it('rodea un árbol que tiene delante sin dejar de avanzar', () => {
    const dir = steer({ x: 0, y: 0 }, { x: 300, y: 0 }, 18, [{ x: 60, y: 5, radius: 30 }]);
    expect(dir.x).toBeGreaterThan(0);
    expect(dir.y).toBeLessThan(0); // el árbol está un poco abajo: se aparta hacia arriba
  });

  it('se para al llegar', () => {
    expect(steer({ x: 0, y: 0 }, { x: 2, y: 0 }, 18, [])).toEqual({ x: 0, y: 0 });
  });
});

describe('IA rival: partida simulada', () => {
  it('encanta todas las flores de un bosque con árboles sin quedarse atascada', () => {
    const bounds: Bounds = { x: 0, y: 0, width: 800, height: 500 };
    const obstacles: Circle[] = [
      { x: 250, y: 250, radius: 40 },
      { x: 500, y: 150, radius: 35 },
      { x: 520, y: 380, radius: 30 },
    ];
    const flowers = [
      [380, 250], [620, 250], [700, 80], [120, 420], [750, 450], [300, 60], [480, 260], [180, 150],
    ].map(([x, y]) => ({ position: { x, y }, state: neutral as FlowerState }));

    const self = { playerId: ME, radius: 18, position: { x: 60, y: 60 } as Point };
    const ai = new RivalController(self, {
      flowers,
      obstacles,
      powerUps: () => [],
      rivals: () => [],
      spellRadius: () => 70,
      speed: () => 220,
    }, () => 0.5);

    const dt = 1000 / 60;
    let lastCast = -Infinity;
    for (let now = 0; now < 30_000 && flowers.some((f) => f.state.kind === 'neutral'); now += dt) {
      ai.update(now);
      const dir = ai.direction();
      let p = { x: self.position.x + (dir.x * 220 * dt) / 1000, y: self.position.y + (dir.y * 220 * dt) / 1000 };
      for (const o of obstacles) p = pushOutOf(p, self.radius, o) ?? p;
      self.position = clampToBounds(p, self.radius, bounds);
      if (ai.wantsToCast() && now - lastCast >= 600) {
        lastCast = now;
        for (const f of flowersInSpell(flowers, self.position, 70)) {
          if (canPaint(f.state, ME, now)) f.state = { kind: 'painted', owner: ME, color: 'rosa', paintedAt: now };
        }
      }
    }

    expect(flowers.filter((f) => f.state.kind === 'neutral')).toEqual([]);
    expect(obstacles.every((o) => distance(self.position, o) >= o.radius + self.radius - 0.01)).toBe(true);
  });
});
