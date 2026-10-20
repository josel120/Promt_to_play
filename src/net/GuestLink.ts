import Phaser from 'phaser';
import { FAIRY_COLORS } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import type { MatchResult, Point } from '../shared/types';
import { KeyboardControls, type Fairy } from '../entities/Fairy';
import type { Flower } from '../entities/Flower';
import { distance } from '../systems/geometry';
import { LAYER } from '../systems/layers';
import type { OnlineMatch } from './online';
import { sampleFairies, type TimedSnapshot } from './protocol';
import { FollowControls, SNAP_DISTANCE, TELEPORT_DISTANCE } from './remoteControls';

/** Dibujamos 100 ms "en el pasado" para tener siempre dos instantáneas entre las que interpolar. */
const RENDER_DELAY_MS = 100;
const INPUT_HEARTBEAT_MS = 100;

export interface GuestHandlers {
  onOver(result: MatchResult): void;
  onClosed(): void;
}

/** Lado del invitado: manda sus teclas al host y dibuja lo que el host le cuenta. */
export class GuestLink {
  private buffer: TimedSnapshot[] = [];
  private readonly follow = new Map<number, FollowControls>();
  private readonly keys?: KeyboardControls;
  private readonly unsubscribe: () => void;
  private readonly orbs: Phaser.GameObjects.Arc[] = [];
  private casts = 0;
  private lastInput = { dx: 0, dy: 0 };
  private lastInputAt = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly online: OnlineMatch,
    private readonly fairies: readonly Fairy[],
    flowers: readonly Flower[],
    showSpell: (at: Point, radius: number, color: number) => void,
    handlers: GuestHandlers,
  ) {
    for (const fairy of fairies) {
      const controls = new FollowControls(fairy);
      this.follow.set(fairy.playerId, controls);
      fairy.useControls(controls);
    }
    if (scene.input.keyboard) this.keys = new KeyboardControls(scene.input.keyboard, 0);

    this.unsubscribe = online.client.on((msg) => {
      if (msg.t === 'room-closed') return handlers.onClosed();
      if (msg.t !== 'msg') return;
      const data = msg.data;
      if (data.k === 'snap') {
        this.buffer.push({ at: performance.now(), snap: data.snap });
        if (this.buffer.length > 20) this.buffer.shift();
      } else if (data.k === 'painted') {
        const flower = flowers.find((f) => f.id === data.payload.flowerId);
        flower?.paint(data.payload.playerId, data.payload.color, scene.time.now);
        gameEvents.emit(GameEvents.FLOWER_PAINTED, data.payload);
      } else if (data.k === 'spell') {
        const fairy = this.fairyOf(data.payload.playerId);
        gameEvents.emit(GameEvents.SPELL_CAST, data.payload);
        if (fairy) showSpell(data.payload.at, data.radius, FAIRY_COLORS[fairy.color]);
      } else if (data.k === 'quip') {
        this.fairyOf(data.playerId)?.say(data.text);
      } else if (data.k === 'over') {
        handlers.onOver(data.result);
      }
    });
  }

  /** Antes de mover las hadas: manda las teclas y fija hacia dónde tiene que volar cada una. */
  update(time: number): void {
    if (this.keys) {
      const dir = this.keys.direction();
      const cast = this.keys.wantsToCast();
      if (cast) this.casts++;
      const changed = cast || dir.x !== this.lastInput.dx || dir.y !== this.lastInput.dy;
      if (changed || time - this.lastInputAt > INPUT_HEARTBEAT_MS) {
        this.lastInput = { dx: dir.x, dy: dir.y };
        this.lastInputAt = time;
        this.online.client.toHost({ k: 'input', ...this.lastInput, casts: this.casts });
      }
    }

    const renderAt = performance.now() - RENDER_DELAY_MS;
    for (const [id, snap] of sampleFairies(this.buffer, renderAt)) {
      const fairy = this.fairyOf(id);
      const controls = this.follow.get(id);
      if (!fairy || !controls) continue;
      controls.target = { x: snap.x, y: snap.y };
      fairy.speedMultiplier = snap.speed;
      fairy.setBoosted(snap.boosted);
    }
    this.drawOrbs();
  }

  /** Después de mover las hadas: corrige las que se han quedado cerca o demasiado lejos. */
  correct(): void {
    for (const fairy of this.fairies) {
      const target = this.follow.get(fairy.playerId)?.target;
      if (!target) continue;
      const d = distance(fairy.position, target);
      if (d <= SNAP_DISTANCE || d >= TELEPORT_DISTANCE) fairy.setPosition(target);
    }
  }

  destroy(): void {
    this.unsubscribe();
    this.orbs.forEach((o) => o.destroy());
  }

  private fairyOf(id: number): Fairy | undefined {
    return this.fairies.find((f) => f.playerId === id);
  }

  /** Los power-ups solo se ven (los coge el host): estrellitas doradas que laten. */
  private drawOrbs(): void {
    const latest = this.buffer[this.buffer.length - 1]?.snap.powerUps ?? [];
    while (this.orbs.length < latest.length) {
      const orb = this.scene.add.circle(0, 0, 14, 0xfff176, 0.9).setStrokeStyle(2, 0xffffff).setDepth(LAYER.powerUps);
      this.scene.tweens.add({ targets: orb, scale: 1.25, duration: 500, yoyo: true, repeat: -1 });
      this.orbs.push(orb);
    }
    while (this.orbs.length > latest.length) this.orbs.pop()?.destroy();
    latest.forEach((p, i) => this.orbs[i].setPosition(p.x, p.y));
  }
}
