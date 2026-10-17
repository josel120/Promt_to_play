import Phaser from 'phaser';
import type { Fairy } from '../entities/Fairy';
import { starPoints } from '../entities/Fairy';
import type { PlayerId, Point } from '../shared/types';
import { distance } from './geometry';
import { FUNNY_FONT, LAYER } from './layers';
import { NO_EFFECTS, POWER_UPS, POWER_UP_SPAWN, PowerUpState, type PowerUpEffects, type PowerUpKind } from './powerUps';
import { pickFrom } from './quips';

interface Orb {
  kind: PowerUpKind;
  position: Point;
  view: Phaser.GameObjects.Container;
  expiresAt: number;
}

const KINDS = Object.keys(POWER_UPS) as PowerUpKind[];

/** J9: estrellas mágicas que aparecen de vez en cuando y dan poderes temporales al hada que las coge. */
export class PowerUpSystem {
  private readonly states = new Map<PlayerId, PowerUpState>();
  private orbs: Orb[] = [];
  private nextSpawnAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly findSpot: () => Point | null,
    now: number,
  ) {
    this.nextSpawnAt = now + POWER_UP_SPAWN.everyMs / 2;
  }

  effects(playerId: PlayerId, now: number): PowerUpEffects {
    return this.states.get(playerId)?.effects(now) ?? NO_EFFECTS;
  }

  update(fairies: readonly Fairy[], now: number): void {
    if (now >= this.nextSpawnAt) {
      this.nextSpawnAt = now + POWER_UP_SPAWN.everyMs;
      if (this.orbs.length < POWER_UP_SPAWN.maxOnField) this.spawn(now);
    }

    for (const orb of [...this.orbs]) {
      const taker = fairies.find((f) => distance(f.position, orb.position) <= f.radius + POWER_UP_SPAWN.radius);
      if (taker) this.collect(orb, taker, now);
      else if (now >= orb.expiresAt) this.remove(orb, true);
    }

    for (const fairy of fairies) {
      const effects = this.effects(fairy.playerId, now);
      fairy.speedMultiplier = effects.speedMultiplier;
      fairy.setBoosted((this.states.get(fairy.playerId)?.active(now).length ?? 0) > 0);
    }
  }

  destroy(): void {
    this.orbs.forEach((orb) => orb.view.destroy());
    this.orbs = [];
  }

  private spawn(now: number): void {
    const position = this.findSpot();
    if (!position) return;
    const kind = pickFrom(KINDS);
    const info = POWER_UPS[kind];
    const r = POWER_UP_SPAWN.radius;

    const glow = this.scene.add.circle(0, 0, r * 1.6, info.color, 0.25);
    const star = this.scene.add.graphics();
    star.fillStyle(info.color, 1);
    star.lineStyle(2, 0xffffff, 1);
    const pts = starPoints(0, 0, r, r * 0.45);
    star.fillPoints(pts, true);
    star.strokePoints(pts, true);
    const label = this.scene.add
      .text(0, r + 12, info.name, { fontFamily: FUNNY_FONT, fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);
    const view = this.scene.add.container(position.x, position.y, [glow, star, label]).setDepth(LAYER.powerUps).setScale(0);

    this.scene.tweens.add({ targets: view, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: star, angle: 360, duration: 3000, repeat: -1 });
    this.scene.tweens.add({ targets: glow, scale: 1.3, alpha: 0.1, duration: 600, yoyo: true, repeat: -1 });

    this.orbs.push({ kind, position, view, expiresAt: now + POWER_UP_SPAWN.lifetimeMs });
  }

  private collect(orb: Orb, fairy: Fairy, now: number): void {
    const state = this.states.get(fairy.playerId) ?? new PowerUpState();
    this.states.set(fairy.playerId, state);
    state.activate(orb.kind, now);
    fairy.say(pickFrom(POWER_UPS[orb.kind].quips));
    fairy.celebrate();
    this.remove(orb, false);
  }

  private remove(orb: Orb, fade: boolean): void {
    this.orbs = this.orbs.filter((o) => o !== orb);
    this.scene.tweens.add({
      targets: orb.view,
      scale: fade ? 0 : 2,
      alpha: 0,
      duration: fade ? 300 : 250,
      onComplete: () => orb.view.destroy(),
    });
  }
}
