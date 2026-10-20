import { FAIRY_COLORS, MAX_PLAYERS, type FairyColorName } from '../../shared/config';
import type { LobbyPlayer, LobbyProvider, LobbyRoom } from '../../shared/lobby';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // sin I, L ni O para evitar confusiones
const BOT_NAMES = ['Hada Nova', 'Hada Pixel'];

/**
 * Provider de mentira para desarrollar la UI del lobby sin servidor:
 * simula una sala donde van entrando hadas remotas que se ponen listas solas.
 * Cuando Jose tenga la capa de red, se cambia esta clase por la real.
 */
export class MockLobbyProvider implements LobbyProvider {
  private room?: LobbyRoom;
  private updateFn?: (room: LobbyRoom) => void;
  private startFn?: (room: LobbyRoom) => void;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  createRoom(playerName: string): Promise<LobbyRoom> {
    this.room = { code: this.randomCode(), players: [] };
    this.room.players.push(this.makePlayer(playerName, { host: true, local: true }));
    this.simulateJoins();
    return Promise.resolve(this.room);
  }

  joinRoom(code: string, playerName: string): Promise<LobbyRoom> {
    if (!/^[A-Z]{4}$/.test(code)) return Promise.reject(new Error('El código tiene 4 letras'));
    this.room = { code, players: [this.makePlayer('Anfitrión', { host: true })] };
    this.room.players.push(this.makePlayer(playerName, { local: true }));
    this.simulateJoins();
    return Promise.resolve(this.room);
  }

  leaveRoom(): void {
    this.clearTimers();
    this.room = undefined;
  }

  setReady(ready: boolean): void {
    const me = this.me();
    if (!me) return;
    me.ready = ready;
    this.emitUpdate();
  }

  setColor(color: FairyColorName): void {
    const me = this.me();
    if (!me || me.ready) return;
    const taken = new Set(this.room?.players.filter((p) => p !== me).map((p) => p.color));
    if (!taken.has(color)) {
      me.color = color;
      this.emitUpdate();
    }
  }

  requestStart(): void {
    if (!this.me()?.host) return;
    this.later(500, () => {
      if (this.room) this.startFn?.(this.room);
    });
  }

  onUpdate(fn: (room: LobbyRoom) => void): void {
    this.updateFn = fn;
  }

  onStart(fn: (room: LobbyRoom) => void): void {
    this.startFn = fn;
  }

  private me(): LobbyPlayer | undefined {
    return this.room?.players.find((p) => p.local);
  }

  private makePlayer(name: string, flags: { host?: boolean; local?: boolean }): LobbyPlayer {
    return { id: `p-${Math.random().toString(36).slice(2, 8)}`, name, color: this.freeColor(), ready: false, host: !!flags.host, local: !!flags.local };
  }

  private freeColor(): FairyColorName {
    const taken = new Set(this.room?.players.map((p) => p.color));
    const names = Object.keys(FAIRY_COLORS) as FairyColorName[];
    return names.find((c) => !taken.has(c)) ?? names[0];
  }

  private simulateJoins(): void {
    BOT_NAMES.forEach((name, i) => {
      this.later(1200 + i * 1600, () => {
        if (!this.room || this.room.players.length >= MAX_PLAYERS) return;
        const bot = this.makePlayer(name, {});
        this.room.players.push(bot);
        this.emitUpdate();
        this.later(1500 + Math.random() * 2500, () => {
          bot.ready = true;
          this.emitUpdate();
        });
      });
    });
  }

  private emitUpdate(): void {
    if (this.room) this.updateFn?.(this.room);
  }

  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  private clearTimers(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  private randomCode(): string {
    return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  }
}
