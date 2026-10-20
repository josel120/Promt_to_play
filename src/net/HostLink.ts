import { GameEvents, gameEvents, type GameEventPayloads } from '../shared/events';
import type { MatchResult, PlayerConfig, PlayerId, Point } from '../shared/types';
import type { Fairy } from '../entities/Fairy';
import type { OnlineMatch } from './online';
import type { Snapshot } from './protocol';
import { RemoteControls } from './remoteControls';

const SNAP_EVERY_MS = 50;

/** Lado del host: aplica las teclas de los invitados y les manda el estado de la partida. */
export class HostLink {
  private readonly remotes = new Map<PlayerId, RemoteControls>();
  private readonly unsubscribe: () => void;
  private lastSnapAt = -Infinity;

  constructor(
    private readonly online: OnlineMatch,
    private readonly fairies: readonly Fairy[],
    private readonly powerUps: () => Point[],
    private readonly radiusOf: (playerId: PlayerId) => number,
    players: PlayerConfig[],
    flowerPositions: Point[],
  ) {
    for (const fairy of fairies) {
      fairy.onSay = (text) => online.client.toGuests({ k: 'quip', playerId: fairy.playerId, text });
      if (fairy.playerId === online.localId || players.find((p) => p.id === fairy.playerId)?.cpu) continue;
      const controls = new RemoteControls();
      this.remotes.set(fairy.playerId, controls);
      fairy.useControls(controls);
    }

    this.unsubscribe = online.client.on((msg) => {
      if (msg.t === 'msg' && msg.data.k === 'input') this.remotes.get(online.seats[msg.from])?.receive(msg.data);
      if (msg.t === 'peer-left') this.remotes.get(online.seats[msg.id])?.stop();
    });
    gameEvents.on(GameEvents.FLOWER_PAINTED, this.onPainted, this);
    gameEvents.on(GameEvents.SPELL_CAST, this.onSpell, this);
    gameEvents.on(GameEvents.GAME_OVER, this.onOver, this);

    online.client.toGuests({ k: 'start', players, flowerPositions, seats: online.seats });
  }

  update(time: number): void {
    if (time - this.lastSnapAt < SNAP_EVERY_MS) return;
    this.lastSnapAt = time;
    const snap: Snapshot = {
      fairies: this.fairies.map((f) => ({ id: f.playerId, ...round(f.position), speed: f.speedMultiplier, boosted: f.isBoosted })),
      powerUps: this.powerUps().map(round),
    };
    this.online.client.toGuests({ k: 'snap', snap });
  }

  destroy(): void {
    this.unsubscribe();
    this.fairies.forEach((f) => (f.onSay = undefined));
    gameEvents.off(GameEvents.FLOWER_PAINTED, this.onPainted, this);
    gameEvents.off(GameEvents.SPELL_CAST, this.onSpell, this);
    gameEvents.off(GameEvents.GAME_OVER, this.onOver, this);
  }

  private onPainted(payload: GameEventPayloads[typeof GameEvents.FLOWER_PAINTED]): void {
    this.online.client.toGuests({ k: 'painted', payload });
  }

  private onSpell(payload: GameEventPayloads[typeof GameEvents.SPELL_CAST]): void {
    this.online.client.toGuests({ k: 'spell', payload, radius: this.radiusOf(payload.playerId) });
  }

  private onOver(result: MatchResult): void {
    this.online.client.toGuests({ k: 'over', result });
  }
}

function round(p: Point): Point {
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
}
