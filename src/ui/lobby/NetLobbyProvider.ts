import { FAIRY_COLORS, type FairyColorName } from '../../shared/config';
import type { LobbyPlayer, LobbyProvider, LobbyRoom } from '../../shared/lobby';
import type { PlayerConfig } from '../../shared/types';
import type { GameSceneData } from '../../scenes/GameScene';
import { NetClient } from '../../net/NetClient';
import { defaultServerUrl, type ClientMessage, type GameMessage, type ServerMessage } from '../../net/protocol';

const COLORS = Object.keys(FAIRY_COLORS) as FairyColorName[];

const JOIN_ERRORS: Record<string, string> = {
  'no-room': 'No existe una sala con ese código',
  full: 'La sala está llena (máximo 4 hadas)',
};

/**
 * LobbyProvider real: habla con el servidor de salas (`npm run server`) a través de NetClient.
 * El protocolo no tiene nombres, ready ni colores: las hadas se listan por orden de entrada
 * y el color se reparte por asiento al arrancar la partida.
 */
export class NetLobbyProvider implements LobbyProvider {
  private client?: NetClient;
  private room?: LobbyRoom;
  private role?: 'host' | 'guest';
  /** Id de red que nos dio el servidor (host = 0). */
  private netId = 0;
  private pending?: { resolve: (room: LobbyRoom) => void; reject: (err: Error) => void };
  private updateFn?: (room: LobbyRoom) => void;
  private startFn?: (room: LobbyRoom) => void;
  private closedFn?: () => void;
  /** Mensaje 'start' del host (solo invitados): players, seats y flores elegidas. */
  private startMsg?: Extract<GameMessage, { k: 'start' }>;

  constructor(private readonly url = defaultServerUrl(location)) {}

  createRoom(playerName: string): Promise<LobbyRoom> {
    return this.handshake(playerName, 'host', { t: 'create' });
  }

  joinRoom(code: string, playerName: string): Promise<LobbyRoom> {
    return this.handshake(playerName, 'guest', { t: 'join', room: code.toUpperCase() });
  }

  leaveRoom(): void {
    this.client?.close();
    this.client = undefined;
    this.room = undefined;
    this.pending = undefined;
  }

  /** El protocolo no tiene "lista": conectada ya cuenta como lista. */
  setReady(): void {}

  /** El protocolo no deja elegir color: se reparte por asiento al arrancar. */
  setColor(): void {}

  requestStart(): void {
    if (this.role === 'host' && this.room) this.startFn?.(this.room);
  }

  onUpdate(fn: (room: LobbyRoom) => void): void {
    this.updateFn = fn;
  }

  onStart(fn: (room: LobbyRoom) => void): void {
    this.startFn = fn;
  }

  onClosed(fn: () => void): void {
    this.closedFn = fn;
  }

  /** Datos para GameScene una vez arrancada la partida (ver GameSceneData.online). */
  gameData(): GameSceneData {
    if (!this.client || !this.room) throw new Error('No hay sala activa');
    if (this.role === 'host') {
      const seats = Object.fromEntries(this.room.players.map((p, i) => [Number(p.id), i]));
      const players: PlayerConfig[] = this.room.players.map((_, i) => ({
        id: i,
        color: COLORS[i % COLORS.length],
        keysIndex: 0,
      }));
      return { players, online: { role: 'host', client: this.client, localId: 0, seats } };
    }
    if (!this.startMsg) throw new Error('Todavía no llegó la orden de arranque del host');
    const { players, seats, flowerPositions } = this.startMsg;
    return {
      players,
      online: { role: 'guest', client: this.client, localId: seats[this.netId], seats, flowerPositions },
    };
  }

  private async handshake(playerName: string, role: 'host' | 'guest', msg: ClientMessage): Promise<LobbyRoom> {
    const client = await NetClient.connect(this.url);
    this.client = client;
    this.role = role;
    return new Promise<LobbyRoom>((resolve, reject) => {
      this.pending = { resolve, reject };
      client.on((m) => this.handle(m, playerName));
      client.send(msg);
    });
  }

  private handle(msg: ServerMessage, playerName: string): void {
    if (msg.t === 'created') {
      this.netId = msg.you;
      this.room = { code: msg.room, players: [this.makePlayer(msg.you, playerName, 0, { host: true, local: true })] };
      this.done(this.room);
    } else if (msg.t === 'joined') {
      this.netId = msg.you;
      this.room = {
        code: msg.room,
        players: [
          this.makePlayer(0, 'Anfitrión', 0, { host: true }),
          this.makePlayer(msg.you, playerName, msg.you, { local: true }),
        ],
      };
      this.done(this.room);
    } else if (msg.t === 'error') {
      this.pending?.reject(new Error(JOIN_ERRORS[msg.reason] ?? msg.reason));
      this.pending = undefined;
    } else if (msg.t === 'peer-joined') {
      this.room?.players.push(this.makePlayer(msg.id, `Hada ${msg.id + 1}`, this.room.players.length, {}));
      this.emitUpdate();
    } else if (msg.t === 'peer-left') {
      if (this.room) this.room.players = this.room.players.filter((p) => p.id !== String(msg.id));
      this.emitUpdate();
    } else if (msg.t === 'room-closed') {
      this.closedFn?.();
    } else if (msg.t === 'msg' && msg.data.k === 'start' && this.role === 'guest') {
      this.startMsg = msg.data;
      if (this.room) this.startFn?.(this.room);
    }
  }

  private done(room: LobbyRoom): void {
    this.pending?.resolve(room);
    this.pending = undefined;
    this.emitUpdate();
  }

  /** Los colores se muestran en el lobby en el orden de asiento en que se repartirán. */
  private makePlayer(netId: number, name: string, seat: number, flags: { host?: boolean; local?: boolean }): LobbyPlayer {
    return {
      id: String(netId),
      name,
      color: COLORS[seat % COLORS.length],
      ready: true,
      host: !!flags.host,
      local: !!flags.local,
    };
  }

  private emitUpdate(): void {
    if (this.room) this.updateFn?.(this.room);
  }
}
