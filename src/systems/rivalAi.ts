/** J11: decisiones de la IA rival. Solo cálculos puros; el "cerebro" que las usa vive en RivalController. */
import type { FlowerState, PlayerId, Point } from '../shared/types';
import { distance, normalize, type Circle } from './geometry';
import { canPaint } from './rules';

export const RIVAL_AI = {
  /** Cada cuánto vuelve a pensar a dónde ir (con algo de azar para que no piensen todas a la vez). */
  thinkEveryMs: 350,
  /**
   * Cuánto vale cada flor al lanzar el hechizo. Una blanca o gris vale más que una robada:
   * las robadas suelen estar junto a otra hada, que la recupera enseguida.
   */
  neutralValue: 1.2,
  stealValue: 0.4,
  /** Sigue con su objetivo salvo que otro sea bastante mejor: así no duda entre dos sitios. */
  commitment: 1.4,
  /** Cuántos px de viaje "cuesta" una flor. Más alto = se anima a ir más lejos. */
  pxPerFlower: 500,
  /** Un sitio con otra hada cerca vale menos (se la pueden quitar): así se reparten el bosque. */
  contestedFactor: 0.5,
  /** Hasta qué distancia se desvía a por un power-up y cuánto lo valora (en flores). */
  powerUpRange: 260,
  powerUpValue: 2.5,
  /** Cuánto mira hacia delante para esquivar árboles y rocas. */
  lookAhead: 80,
  /** Si en este tiempo casi no avanza, se da por atascada y cambia de objetivo. */
  stuckMs: 900,
  stuckDistance: 20,
  /** Cerca de esto se considera que ya llegó al objetivo. */
  arriveDistance: 12,
} as const;

export interface AiFlower {
  readonly position: Point;
  readonly state: FlowerState;
}

export interface AiView {
  playerId: PlayerId;
  position: Point;
  now: number;
  flowers: readonly AiFlower[];
  spellRadius: number;
  /** Velocidad actual en px/s (con power-ups). */
  speed: number;
  powerUps?: readonly Point[];
  /** Dónde están las demás hadas. */
  rivals?: readonly Point[];
  /** Objetivo actual, para no cambiar de idea por poco. */
  current?: Point;
  /** Zonas a las que no quiere ir (p. ej. donde se atascó). */
  avoid?: readonly Circle[];
}

export interface AiTarget {
  point: Point;
  /** Flores (ponderadas) que espera pintar al llegar. 0 si es un power-up. */
  gain: number;
  kind: 'flowers' | 'powerUp';
}

/** Valor de lanzar el hechizo en `at` en el instante `now`: flores que pintaría (ver `neutralValue`). */
export function spellGain(
  flowers: readonly AiFlower[],
  at: Point,
  radius: number,
  playerId: PlayerId,
  now: number,
): number {
  let gain = 0;
  for (const f of flowers) {
    if (distance(f.position, at) > radius || !canPaint(f.state, playerId, now)) continue;
    gain += f.state.kind === 'painted' ? RIVAL_AI.stealValue : RIVAL_AI.neutralValue;
  }
  return gain;
}

/**
 * Elige a dónde ir: el sitio con más flores por pintar compensando lo lejos que está.
 * Tiene en cuenta que la protección de una flor puede acabarse mientras vuela hacia ella.
 */
export function chooseTarget(view: AiView): AiTarget | null {
  const { playerId, position, now, flowers, spellRadius, speed, powerUps = [], rivals = [], avoid = [], current } = view;
  const blocked = (p: Point) => avoid.some((c) => distance(p, c) < c.radius);
  const arrival = (p: Point) => now + (distance(position, p) / Math.max(speed, 1)) * 1000;
  const worth = (value: number, p: Point) => {
    const mine = distance(position, p);
    const contested = rivals.some((r) => distance(r, p) < Math.min(spellRadius, mine));
    const committed = current && distance(current, p) <= RIVAL_AI.arriveDistance;
    return (
      (value * (contested ? RIVAL_AI.contestedFactor : 1) * (committed ? RIVAL_AI.commitment : 1)) /
      (1 + mine / RIVAL_AI.pxPerFlower)
    );
  };

  let best: AiTarget | null = null;
  let bestScore = 0;
  const consider = (point: Point, gain: number, kind: AiTarget['kind'], value = gain) => {
    if (value <= 0 || blocked(point)) return;
    const score = worth(value, point);
    if (score > bestScore) {
      bestScore = score;
      best = { point, gain, kind };
    }
  };

  for (const f of flowers) {
    const eta = arrival(f.position);
    if (!canPaint(f.state, playerId, eta)) continue;
    consider(f.position, spellGain(flowers, f.position, spellRadius, playerId, eta), 'flowers');

    // Centro del grupo de flores cercanas: a veces un hechizo ahí pinta más que sobre una sola.
    const group = flowers.filter((g) => distance(g.position, f.position) <= spellRadius && canPaint(g.state, playerId, eta));
    if (group.length > 1) {
      const center = {
        x: group.reduce((s, g) => s + g.position.x, 0) / group.length,
        y: group.reduce((s, g) => s + g.position.y, 0) / group.length,
      };
      consider(center, spellGain(flowers, center, spellRadius, playerId, arrival(center)), 'flowers');
    }
  }

  for (const p of powerUps) {
    if (distance(position, p) <= RIVAL_AI.powerUpRange) consider(p, 0, 'powerUp', RIVAL_AI.powerUpValue);
  }

  return best;
}

/** Lanza el hechizo si ya está en el objetivo o si desde aquí pinta tanto como allí. */
export function shouldCast(view: AiView, target: AiTarget | null): boolean {
  const here = spellGain(view.flowers, view.position, view.spellRadius, view.playerId, view.now);
  if (here <= 0) return false;
  if (!target || target.kind === 'powerUp') return true;
  return distance(view.position, target.point) <= RIVAL_AI.arriveDistance || here >= target.gain;
}

/**
 * Dirección (unitaria) para ir de `from` a `to` rodeando el obstáculo más cercano que haya en medio.
 * Sin esto se quedaría pegada a los árboles: las colisiones la empujan hacia atrás, no hacia un lado.
 */
export function steer(from: Point, to: Point, radius: number, obstacles: readonly Circle[]): Point {
  const toTarget = distance(from, to);
  if (toTarget <= RIVAL_AI.arriveDistance / 2) return { x: 0, y: 0 };
  const dir = normalize(to.x - from.x, to.y - from.y);
  const reach = Math.min(RIVAL_AI.lookAhead, toTarget);

  let closest: { along: number; lateral: Point; clearance: number } | null = null;
  for (const o of obstacles) {
    const rel = { x: o.x - from.x, y: o.y - from.y };
    const along = rel.x * dir.x + rel.y * dir.y;
    if (along <= 0 || along - o.radius > reach) continue;
    const lateral = { x: rel.x - dir.x * along, y: rel.y - dir.y * along };
    const clearance = o.radius + radius + 4;
    if (Math.hypot(lateral.x, lateral.y) >= clearance) continue;
    if (!closest || along < closest.along) closest = { along, lateral, clearance };
  }
  if (!closest) return dir;

  // Se aparta hacia el lado contrario a donde queda el centro del obstáculo.
  const lateralLen = Math.hypot(closest.lateral.x, closest.lateral.y);
  const away = lateralLen < 1e-6 ? { x: -dir.y, y: dir.x } : { x: -closest.lateral.x / lateralLen, y: -closest.lateral.y / lateralLen };
  const strength = 0.6 + 1.6 * (1 - Math.min(closest.along / RIVAL_AI.lookAhead, 1));
  return normalize(dir.x + away.x * strength, dir.y + away.y * strength);
}
