import { describe, expect, it } from 'vitest';
import { CURRENT_PARAMS, simulateMatch } from './balanceSim';

describe('simulador de balance', () => {
  const short = { ...CURRENT_PARAMS, durationS: 10 };

  it('con la misma semilla da la misma partida', () => {
    expect(simulateMatch(short, 2, 7)).toEqual(simulateMatch(short, 2, 7));
  });

  it('el marcador cuadra con las flores pintadas', () => {
    const s = simulateMatch(short, 3, 11);
    const total = Object.values(s.scores).reduce((a, b) => a + b, 0);
    expect(total).toBe(Math.round(s.paintedAtEnd * s.flowers));
    expect(s.casts).toBeGreaterThan(0);
  });
});
