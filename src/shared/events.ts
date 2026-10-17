// Contrato compartido: el gameplay (Jose) y el mundo/UI (Thais) se comunican solo con estos eventos.
import Phaser from 'phaser';
import type { FairyColorName } from './config';
import type { MatchResult, PlayerId, Point, Scores } from './types';

export const GameEvents = {
  SPELL_CAST: 'spell-cast',
  FLOWER_PAINTED: 'flower-painted',
  SCORE_CHANGED: 'score-changed',
  MATCH_STARTED: 'match-started',
  GAME_OVER: 'game-over',
} as const;

export interface GameEventPayloads {
  [GameEvents.SPELL_CAST]: { playerId: PlayerId; at: Point };
  [GameEvents.FLOWER_PAINTED]: {
    flowerId: number;
    playerId: PlayerId;
    color: FairyColorName;
    previousOwner: PlayerId | null;
    at: Point;
  };
  [GameEvents.SCORE_CHANGED]: { scores: Scores };
  [GameEvents.MATCH_STARTED]: { durationS: number };
  [GameEvents.GAME_OVER]: MatchResult;
}

export type GameEventName = keyof GameEventPayloads;

const bus = new Phaser.Events.EventEmitter();

/** Bus de eventos tipado y global para todo el juego. */
export const gameEvents = {
  emit<E extends GameEventName>(event: E, payload: GameEventPayloads[E]): void {
    bus.emit(event, payload);
  },
  on<E extends GameEventName>(event: E, fn: (payload: GameEventPayloads[E]) => void, context?: unknown): void {
    bus.on(event, fn, context);
  },
  off<E extends GameEventName>(event: E, fn: (payload: GameEventPayloads[E]) => void, context?: unknown): void {
    bus.off(event, fn, context);
  },
  removeAll(): void {
    bus.removeAllListeners();
  },
};
