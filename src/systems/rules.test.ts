import { describe, expect, it } from 'vitest';
import type { FlowerState } from '../shared/types';
import { canPaint, flowersInSpell, isProtected } from './rules';

const neutral: FlowerState = { kind: 'neutral', tone: 'blanca' };
const paintedBy = (owner: number, paintedAt = 0): FlowerState => ({ kind: 'painted', owner, color: 'rosa', paintedAt });

describe('reglas de encantamiento', () => {
  it('las flores blancas y grises siempre se pueden pintar', () => {
    expect(canPaint(neutral, 0, 0)).toBe(true);
    expect(canPaint({ kind: 'neutral', tone: 'gris' }, 3, 999)).toBe(true);
  });

  it('una flor propia no se repinta', () => {
    expect(canPaint(paintedBy(1), 1, 100_000)).toBe(false);
  });

  it('una flor ajena está protegida justo después de pintarse', () => {
    expect(isProtected(paintedBy(0, 1000), 1500, 1500)).toBe(true);
    expect(canPaint(paintedBy(0, 1000), 1, 1500, 1500)).toBe(false);
  });

  it('una flor ajena se puede robar cuando acaba la protección', () => {
    expect(isProtected(paintedBy(0, 1000), 2500, 1500)).toBe(false);
    expect(canPaint(paintedBy(0, 1000), 1, 2500, 1500)).toBe(true);
  });

  it('el hechizo solo alcanza las flores dentro de su radio', () => {
    const flowers = [
      { id: 1, position: { x: 0, y: 0 } },
      { id: 2, position: { x: 70, y: 0 } },
      { id: 3, position: { x: 71, y: 0 } },
    ];
    expect(flowersInSpell(flowers, { x: 0, y: 0 }, 70).map((f) => f.id)).toEqual([1, 2]);
  });
});
