import { describe, expect, it } from 'vitest';
import { FAIRY_COLORS, MAX_PLAYERS, PLAYER_KEYS } from './config';

describe('config compartida', () => {
  it('hay un color de hada distinto por cada jugador posible', () => {
    const colors = Object.values(FAIRY_COLORS);
    expect(colors.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('hay un set de teclas por cada jugador posible', () => {
    expect(PLAYER_KEYS.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
  });
});
