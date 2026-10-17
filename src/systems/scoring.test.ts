import { describe, expect, it } from 'vitest';
import { ScoreBoard, winnersOf } from './scoring';

describe('ScoreBoard', () => {
  it('empieza a cero para cada hada', () => {
    expect(new ScoreBoard([0, 1, 2]).scores).toEqual({ 0: 0, 1: 0, 2: 0 });
  });

  it('suma una flor a quien la pinta', () => {
    const board = new ScoreBoard([0, 1]);
    board.apply({ playerId: 0, previousOwner: null });
    expect(board.apply({ playerId: 0, previousOwner: null })).toEqual({ 0: 2, 1: 0 });
  });

  it('robar una flor la pasa de un marcador a otro', () => {
    const board = new ScoreBoard([0, 1]);
    board.apply({ playerId: 0, previousOwner: null });
    expect(board.apply({ playerId: 1, previousOwner: 0 })).toEqual({ 0: 0, 1: 1 });
  });

  it('el total nunca supera el número de flores pintadas', () => {
    const board = new ScoreBoard([0, 1, 2]);
    board.apply({ playerId: 0, previousOwner: null });
    board.apply({ playerId: 1, previousOwner: 0 });
    board.apply({ playerId: 2, previousOwner: 1 });
    const total = Object.values(board.scores).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
  });

  it('devuelve una copia: modificarla no cambia el marcador', () => {
    const board = new ScoreBoard([0]);
    board.scores[0] = 99;
    expect(board.scores[0]).toBe(0);
  });
});

describe('winnersOf', () => {
  it('nadie gana si nadie pintó', () => {
    expect(winnersOf({ 0: 0, 1: 0 })).toEqual([]);
  });

  it('gana quien tiene más flores', () => {
    expect(winnersOf({ 0: 3, 1: 5, 2: 1 })).toEqual([1]);
  });

  it('empate: ganan todas las que comparten el máximo', () => {
    expect(winnersOf({ 0: 4, 1: 4, 2: 1 })).toEqual([0, 1]);
  });
});
