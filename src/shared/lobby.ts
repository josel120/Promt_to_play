// Contrato compartido: la UI del lobby (Thais) habla con la capa de red (Jose) solo por aquí.
import type { FairyColorName } from './config';

export interface LobbyPlayer {
  /** Id único del jugador en la sala (lo asigna la red). */
  id: string;
  name: string;
  color: FairyColorName | null;
  ready: boolean;
  host: boolean;
  /** true si es el jugador de este dispositivo. */
  local: boolean;
}

export interface LobbyRoom {
  /** Código corto para compartir la sala. */
  code: string;
  players: LobbyPlayer[];
}

/**
 * Lo que la escena del lobby necesita de la red. La implementación real la hace Jose;
 * mientras tanto se usa MockLobbyProvider (src/ui/lobby/) para desarrollar la UI sin servidor.
 */
export interface LobbyProvider {
  /** Crea una sala (el jugador local queda de host). Rechaza si no hay conexión. */
  createRoom(playerName: string): Promise<LobbyRoom>;
  /** Se une a una sala por código. Rechaza si no existe o está llena. */
  joinRoom(code: string, playerName: string): Promise<LobbyRoom>;
  leaveRoom(): void;
  setReady(ready: boolean): void;
  /** Ignorado si el color ya lo tiene otro jugador o el local ya está listo. */
  setColor(color: FairyColorName): void;
  /** Solo el host; el arranque real llega por onStart cuando el servidor confirma. */
  requestStart(): void;
  /** Se dispara cada vez que cambia la sala (entra/sale alguien, ready, color). */
  onUpdate(fn: (room: LobbyRoom) => void): void;
  /** El host confirmó y el servidor dio el visto bueno: todos a la partida. */
  onStart(fn: (room: LobbyRoom) => void): void;
  /** Se cerró la sala (el host se fue o se perdió la conexión). */
  onClosed?(fn: () => void): void;
}
