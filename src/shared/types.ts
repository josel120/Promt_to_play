// Contrato compartido: tipos que usan tanto las escenas (Thais) como las entidades (Jose).
import type { FairyColorName } from './config';

export type PlayerId = number;

export interface PlayerConfig {
  id: PlayerId;
  color: FairyColorName;
  /** Índice dentro de PLAYER_KEYS. */
  keysIndex: number;
  /** Hada controlada por la IA rival (no usa teclas). */
  cpu?: boolean;
}

/** Estado de una flor. `owner` es null mientras está blanca o gris. */
export type FlowerState =
  | { kind: 'neutral'; tone: 'blanca' | 'gris' }
  | { kind: 'painted'; owner: PlayerId; color: FairyColorName; paintedAt: number };

export interface Point {
  x: number;
  y: number;
}

/** Lo que la escena de juego necesita saber de un hada (lo implementa Jose en src/entities). */
export interface IFairy {
  readonly playerId: PlayerId;
  readonly color: FairyColorName;
  readonly position: Point;
  update(time: number, delta: number): void;
  destroy(): void;
}

/** Lo que la escena de juego necesita saber de una flor (lo implementa Jose en src/entities). */
export interface IFlower {
  readonly id: number;
  readonly position: Point;
  readonly state: FlowerState;
  destroy(): void;
}

export type Scores = Record<PlayerId, number>;

export interface MatchResult {
  scores: Scores;
  players: PlayerConfig[];
  /** Vacío si nadie pintó flores; más de un id si hay empate. */
  winners: PlayerId[];
}

/** Rectángulo en píxeles (esquina superior izquierda + tamaño). */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ObstacleKind = 'tree' | 'rock';

/**
 * Obstáculo del bosque. Para colisiones se trata como un círculo (x, y, radius).
 * Lo genera el mundo (Thais) y lo usan el spawner de flores y las colisiones de las hadas (Jose).
 */
export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number;
  radius: number;
}
