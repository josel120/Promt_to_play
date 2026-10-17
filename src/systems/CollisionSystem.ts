import type { Fairy } from '../entities/Fairy';
import { clampToBounds, pushOutOf, separate, type Bounds, type Circle } from './geometry';
import { pickQuip } from './quips';

const BUMP_QUIP_COOLDOWN_MS = 1200;

/** J8: las hadas no salen del bosque, no atraviesan árboles ni rocas, y rebotan entre ellas. */
export class CollisionSystem {
  private readonly touching = new Set<string>();
  private lastBumpQuipAt = -Infinity;

  constructor(
    private readonly bounds: Bounds,
    private readonly obstacles: readonly Circle[] = [],
  ) {}

  resolve(fairies: readonly Fairy[], now: number): void {
    for (let i = 0; i < fairies.length; i++) {
      for (let j = i + 1; j < fairies.length; j++) {
        const a = fairies[i];
        const b = fairies[j];
        const pair = `${a.playerId}-${b.playerId}`;
        const moved = separate({ ...a.position, radius: a.radius }, { ...b.position, radius: b.radius });
        if (!moved) {
          this.touching.delete(pair);
          continue;
        }
        a.setPosition(moved.a);
        b.setPosition(moved.b);
        if (!this.touching.has(pair)) {
          this.touching.add(pair);
          this.bump(a, b, now);
        }
      }
    }

    for (const fairy of fairies) {
      let p = fairy.position;
      for (const obstacle of this.obstacles) p = pushOutOf(p, fairy.radius, obstacle) ?? p;
      fairy.setPosition(clampToBounds(p, fairy.radius, this.bounds));
    }
  }

  private bump(a: Fairy, b: Fairy, now: number): void {
    a.squash();
    b.squash();
    if (now - this.lastBumpQuipAt < BUMP_QUIP_COOLDOWN_MS) return;
    this.lastBumpQuipAt = now;
    (Math.random() < 0.5 ? a : b).say(pickQuip('bump'));
  }
}
