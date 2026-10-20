import type { FairyControls } from '../entities/Fairy';
import type { Point } from '../shared/types';
import { distance, normalize } from '../systems/geometry';

/** Host: hada de un invitado, se mueve con lo último que mandó por la red. */
export class RemoteControls implements FairyControls {
  private dir: Point = { x: 0, y: 0 };
  private castsSeen = 0;
  private castsPending = 0;

  receive(input: { dx: number; dy: number; casts: number }): void {
    this.dir = normalize(Number(input.dx) || 0, Number(input.dy) || 0);
    const casts = Number(input.casts) || 0;
    if (casts > this.castsSeen) {
      // Como mucho 3 hechizos atrasados de golpe, por si llega una ráfaga.
      this.castsPending = Math.min(3, this.castsPending + casts - this.castsSeen);
      this.castsSeen = casts;
    }
  }

  stop(): void {
    this.dir = { x: 0, y: 0 };
  }

  direction(): Point {
    return this.dir;
  }

  wantsToCast(): boolean {
    if (this.castsPending === 0) return false;
    this.castsPending--;
    return true;
  }
}

/** Invitado: el hada vuela hacia donde dice el host (así conserva estela y giro). */
export class FollowControls implements FairyControls {
  target?: Point;

  constructor(private readonly self: { readonly position: Point }) {}

  direction(): Point {
    if (!this.target) return { x: 0, y: 0 };
    const p = this.self.position;
    if (distance(p, this.target) <= SNAP_DISTANCE) return { x: 0, y: 0 };
    return normalize(this.target.x - p.x, this.target.y - p.y);
  }

  wantsToCast(): boolean {
    return false;
  }
}

/** Más cerca que esto se coloca exacta; más lejos que TELEPORT_DISTANCE, salta directamente. */
export const SNAP_DISTANCE = 4;
export const TELEPORT_DISTANCE = 80;
