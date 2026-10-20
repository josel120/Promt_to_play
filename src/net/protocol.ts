// Mensajes del multijugador online. El host simula la partida; los invitados mandan teclas y dibujan lo que reciben.
import type { GameEventPayloads } from '../shared/events';
import type { MatchResult, PlayerConfig, PlayerId, Point } from '../shared/types';

export type ClientMessage = { t: 'create' } | { t: 'join'; room: string } | { t: 'send'; to: 'host' | 'guests'; data: GameMessage };

export type ServerMessage =
  | { t: 'created'; room: string; you: number }
  | { t: 'joined'; room: string; you: number }
  | { t: 'peer-joined'; id: number }
  | { t: 'peer-left'; id: number }
  | { t: 'room-closed' }
  | { t: 'error'; reason: string }
  | { t: 'msg'; from: number; data: GameMessage };

export interface FairySnap {
  id: PlayerId;
  x: number;
  y: number;
  speed: number;
  boosted: boolean;
}

export interface Snapshot {
  fairies: FairySnap[];
  powerUps: Point[];
}

export type GameMessage =
  /** Host → invitados: empieza la partida. `seats` traduce id de red → id de jugador. */
  | { k: 'start'; players: PlayerConfig[]; flowerPositions: Point[]; seats: Record<number, PlayerId> }
  /** Invitado → host: dirección actual y cuántos hechizos ha pedido en total. */
  | { k: 'input'; dx: number; dy: number; casts: number }
  | { k: 'snap'; snap: Snapshot }
  | { k: 'painted'; payload: GameEventPayloads['flower-painted'] }
  | { k: 'spell'; payload: GameEventPayloads['spell-cast']; radius: number }
  | { k: 'quip'; playerId: PlayerId; text: string }
  | { k: 'over'; result: MatchResult };

const SERVER_TYPES = new Set(['created', 'joined', 'peer-joined', 'peer-left', 'room-closed', 'error', 'msg']);

/** Parsea un mensaje del servidor; null si no tiene pinta de serlo. */
export function decodeServerMessage(raw: string): ServerMessage | null {
  try {
    const msg = JSON.parse(raw) as { t?: unknown };
    return msg && typeof msg === 'object' && SERVER_TYPES.has(String(msg.t)) ? (msg as ServerMessage) : null;
  } catch {
    return null;
  }
}

export interface TimedSnapshot {
  at: number;
  snap: Snapshot;
}

/**
 * Posición de cada hada en el instante `renderAt`, interpolando entre las dos instantáneas que lo rodean.
 * Si `renderAt` cae fuera del buffer, usa la más cercana.
 */
export function sampleFairies(buffer: readonly TimedSnapshot[], renderAt: number): Map<PlayerId, FairySnap> {
  const out = new Map<PlayerId, FairySnap>();
  if (buffer.length === 0) return out;
  let i = buffer.findIndex((s) => s.at > renderAt);
  if (i === -1) i = buffer.length;
  const a = buffer[Math.max(0, i - 1)];
  const b = buffer[Math.min(buffer.length - 1, i)];
  const t = b.at === a.at ? 1 : Math.min(1, Math.max(0, (renderAt - a.at) / (b.at - a.at)));
  for (const fb of b.snap.fairies) {
    const fa = a.snap.fairies.find((f) => f.id === fb.id) ?? fb;
    out.set(fb.id, { ...fb, x: fa.x + (fb.x - fa.x) * t, y: fa.y + (fb.y - fa.y) * t });
  }
  return out;
}

/** URL del servidor por defecto: el proxy `/net` de Vite (ver vite.config.ts). */
export function defaultServerUrl(loc: Pick<Location, 'protocol' | 'host'>): string {
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/net`;
}

/** Servidor a usar: `?server=` de la URL, luego VITE_SERVER_URL del build, luego el proxy /net. */
export function serverUrl(
  loc: Pick<Location, 'protocol' | 'host' | 'search'>,
  builtUrl: string | undefined = import.meta.env.VITE_SERVER_URL,
): string {
  return new URLSearchParams(loc.search).get('server') || builtUrl || defaultServerUrl(loc);
}
