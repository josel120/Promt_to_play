import type { FairyControls } from '../entities/Fairy';
import type { PlayerId, Point } from '../shared/types';
import { distance, type Circle } from './geometry';
import { RIVAL_AI, chooseTarget, shouldCast, steer, type AiFlower, type AiTarget, type AiView } from './rivalAi';

export interface RivalWorld {
  flowers: readonly AiFlower[];
  obstacles: readonly Circle[];
  /** Dónde hay power-ups ahora mismo. */
  powerUps: () => readonly Point[];
  /** Dónde están las demás hadas. */
  rivals: () => readonly Point[];
  /** Radio del hechizo y velocidad actuales de esta hada (cambian con los power-ups). */
  spellRadius: (now: number) => number;
  speed: () => number;
}

interface SelfView {
  readonly playerId: PlayerId;
  readonly position: Point;
  readonly radius: number;
}

const AVOID_RADIUS = 60;
const AVOID_FOR_MS = 3000;

/** J11: "cerebro" de un hada rival. Se enchufa al hada en lugar del teclado. */
export class RivalController implements FairyControls {
  private target: AiTarget | null = null;
  private nextThinkAt = 0;
  private heading: Point = { x: 0, y: 0 };
  private cast = false;
  private checkpoint?: { at: number; position: Point };
  private avoid: { zone: Circle; until: number }[] = [];

  constructor(
    private readonly self: SelfView,
    private readonly world: RivalWorld,
    private readonly rng: () => number = Math.random,
  ) {}

  update(now: number): void {
    const view = this.view(now);
    const reached = this.target && distance(view.position, this.target.point) <= RIVAL_AI.arriveDistance;
    if (now >= this.nextThinkAt || reached || this.isStuck(now)) {
      this.target = chooseTarget(view);
      this.nextThinkAt = now + RIVAL_AI.thinkEveryMs * (0.7 + this.rng() * 0.6);
    }
    this.heading = this.target ? steer(view.position, this.target.point, this.self.radius, this.world.obstacles) : { x: 0, y: 0 };
    this.cast = shouldCast(view, this.target);
  }

  direction(): Point {
    return this.heading;
  }

  wantsToCast(): boolean {
    return this.cast;
  }

  private view(now: number): AiView {
    this.avoid = this.avoid.filter((a) => a.until > now);
    return {
      playerId: this.self.playerId,
      position: this.self.position,
      now,
      flowers: this.world.flowers,
      spellRadius: this.world.spellRadius(now),
      speed: this.world.speed(),
      powerUps: this.world.powerUps(),
      rivals: this.world.rivals(),
      avoid: this.avoid.map((a) => a.zone),
      current: this.target?.point,
    };
  }

  /** Si casi no se ha movido en un rato, evita ese objetivo durante unos segundos. */
  private isStuck(now: number): boolean {
    const position = this.self.position;
    const waiting = this.target && distance(position, this.target.point) <= RIVAL_AI.arriveDistance * 2;
    if (!this.checkpoint || !this.target || waiting) {
      this.checkpoint = { at: now, position };
      return false;
    }
    if (now - this.checkpoint.at < RIVAL_AI.stuckMs) return false;
    const stuck = distance(position, this.checkpoint.position) < RIVAL_AI.stuckDistance;
    this.checkpoint = { at: now, position };
    if (stuck) this.avoid.push({ zone: { ...this.target.point, radius: AVOID_RADIUS }, until: now + AVOID_FOR_MS });
    return stuck;
  }
}
