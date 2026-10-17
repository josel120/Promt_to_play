import { FLOWER } from '../shared/config';
import type { FlowerState, PlayerId, Point } from '../shared/types';
import { distance } from './geometry';

/** Una flor recién pintada está protegida durante `protectionMs`. */
export function isProtected(state: FlowerState, now: number, protectionMs: number = FLOWER.protectionMs): boolean {
  return state.kind === 'painted' && now - state.paintedAt < protectionMs;
}

/**
 * Reglas de encantamiento (J5 + J6):
 *  - Las flores blancas o grises siempre se pueden pintar.
 *  - Una flor tuya no se vuelve a pintar.
 *  - Una flor de otra hada se puede robar cuando se le acaba la protección.
 */
export function canPaint(
  state: FlowerState,
  playerId: PlayerId,
  now: number,
  protectionMs: number = FLOWER.protectionMs,
): boolean {
  if (state.kind === 'neutral') return true;
  if (state.owner === playerId) return false;
  return !isProtected(state, now, protectionMs);
}

/** Flores cuyo centro cae dentro del área del hechizo. */
export function flowersInSpell<T extends { position: Point }>(flowers: readonly T[], at: Point, radius: number): T[] {
  return flowers.filter((f) => distance(f.position, at) <= radius);
}
