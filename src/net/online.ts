import type { PlayerId, Point } from '../shared/types';
import type { NetClient } from './NetClient';

/** Datos de una partida online que GameScene le pasa a Gameplay. */
export interface OnlineMatch {
  role: 'host' | 'guest';
  client: NetClient;
  /** Hada que controla este navegador. */
  localId: PlayerId;
  /** id de red → id de jugador (solo lo usa el host). */
  seats: Record<number, PlayerId>;
  /** Invitados: flores que eligió el host. */
  flowerPositions?: Point[];
}
