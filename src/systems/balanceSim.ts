/**
 * Balance: simula partidas completas entre hadas CPU sin Phaser, para medir cómo cambian
 * las partidas al tocar los números de `src/shared/config.ts`. Lo usa `npm run balance`.
 */
import { FAIRY, FLOWER, FOREST, MATCH_DURATION_S, SPELL } from '../shared/config';
import type { FlowerState, PlayerId, Point } from '../shared/types';
import { collidesWithObstacle, createRng, defaultBounds, generateForestLayout } from '../world/forestLayout';
import { planFlowers } from '../world/flowerPlacement';
import { Cooldown } from './cooldown';
import { clampToBounds, distance, pushOutOf, scatterPoints, separate, type Bounds } from './geometry';
import { NO_EFFECTS, POWER_UPS, POWER_UP_SPAWN, PowerUpState, type PowerUpEffects, type PowerUpKind } from './powerUps';
import { RivalController } from './RivalController';
import { canPaint } from './rules';
import { ScoreBoard, winnersOf } from './scoring';

export interface BalanceParams {
  durationS: number;
  fairySpeed: number;
  spellRadius: number;
  cooldownMs: number;
  flowerCount: number;
  protectionMs: number;
  powerUps: boolean;
  /** Para probar power-ups más suaves o más fuertes sin tocar `POWER_UPS`. */
  powerUpEffects?: Partial<Record<PowerUpKind, Partial<PowerUpEffects>>>;
}

export const CURRENT_PARAMS: BalanceParams = {
  durationS: MATCH_DURATION_S,
  fairySpeed: FAIRY.speed,
  spellRadius: SPELL.radius,
  cooldownMs: SPELL.cooldownMs,
  flowerCount: FLOWER.count,
  protectionMs: FLOWER.protectionMs,
  powerUps: true,
};

export interface MatchStats {
  scores: Record<PlayerId, number>;
  winners: PlayerId[];
  flowers: number;
  /** Fracción de flores pintadas a los 15 s, 30 s y al final. */
  paintedAt15: number;
  paintedAt30: number;
  paintedAtEnd: number;
  steals: number;
  casts: number;
  pickups: Record<PlayerId, number>;
  /** Cambios de líder en la segunda mitad (más = final más emocionante). */
  leadChangesLate: number;
}

const STEP_MS = 1000 / 30;
const KINDS = Object.keys(POWER_UPS) as PowerUpKind[];

function effectsOf(state: PowerUpState, now: number, params: BalanceParams): PowerUpEffects {
  return state.active(now).reduce<PowerUpEffects>((acc, kind) => {
    const e = { ...POWER_UPS[kind].effects, ...params.powerUpEffects?.[kind] };
    return {
      speedMultiplier: acc.speedMultiplier * (e.speedMultiplier ?? 1),
      spellRadiusMultiplier: acc.spellRadiusMultiplier * (e.spellRadiusMultiplier ?? 1),
      cooldownMultiplier: acc.cooldownMultiplier * (e.cooldownMultiplier ?? 1),
    };
  }, { ...NO_EFFECTS });
}

function corners(b: Bounds, count: number): Point[] {
  const inset = 70;
  return [
    { x: b.x + inset, y: b.y + inset },
    { x: b.x + b.width - inset, y: b.y + b.height - inset },
    { x: b.x + b.width - inset, y: b.y + inset },
    { x: b.x + inset, y: b.y + b.height - inset },
  ].slice(0, count);
}

export function simulateMatch(params: BalanceParams, playerCount: number, seed: number): MatchStats {
  const rng = createRng(seed);
  const bounds = defaultBounds();
  const obstacles = generateForestLayout(bounds, { seed: FOREST.seed });
  const starts = corners(bounds, playerCount);
  const flowers: { position: Point; state: FlowerState }[] = planFlowers(
    bounds,
    (p, r) => !collidesWithObstacle(obstacles, p, r, 6) && starts.every((s) => distance(s, p) > FAIRY.radius * 3),
    { seed, count: params.flowerCount },
  ).map((s) => ({ position: s.position, state: { kind: 'neutral', tone: s.tone } }));

  const ids = starts.map((_, i) => i);
  const board = new ScoreBoard(ids);
  const powerStates = ids.map(() => new PowerUpState());
  const cooldowns = ids.map(() => new Cooldown());
  const pickups: Record<PlayerId, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let orbs: { kind: PowerUpKind; position: Point; expiresAt: number }[] = [];
  let nextSpawnAt = POWER_UP_SPAWN.everyMs / 2;
  let now = 0;

  const fairies = starts.map((start, id) => ({ playerId: id, radius: FAIRY.radius, position: { ...start } }));
  const brains = fairies.map(
    (self) =>
      new RivalController(
        self,
        {
          flowers,
          obstacles,
          powerUps: () => orbs.map((o) => o.position),
          rivals: () => fairies.filter((f) => f !== self).map((f) => f.position),
          spellRadius: (t) => params.spellRadius * effectsOf(powerStates[self.playerId], t, params).spellRadiusMultiplier,
          speed: () => params.fairySpeed * effectsOf(powerStates[self.playerId], now, params).speedMultiplier,
        },
        rng,
      ),
  );

  const stats: MatchStats = {
    scores: {},
    winners: [],
    flowers: flowers.length,
    paintedAt15: 0,
    paintedAt30: 0,
    paintedAtEnd: 0,
    steals: 0,
    casts: 0,
    pickups,
    leadChangesLate: 0,
  };
  const paintedFraction = () => flowers.filter((f) => f.state.kind === 'painted').length / Math.max(1, flowers.length);
  let leader: PlayerId | null = null;

  for (; now < params.durationS * 1000; now += STEP_MS) {
    fairies.forEach((f, i) => {
      const brain = brains[i];
      brain.update(now);
      const effects = effectsOf(powerStates[i], now, params);
      const dir = brain.direction();
      const step = (params.fairySpeed * effects.speedMultiplier * STEP_MS) / 1000;
      f.position = { x: f.position.x + dir.x * step, y: f.position.y + dir.y * step };

      if (brain.wantsToCast() && cooldowns[i].tryUse(now, params.cooldownMs * effects.cooldownMultiplier)) {
        stats.casts++;
        const radius = params.spellRadius * effects.spellRadiusMultiplier;
        for (const flower of flowers) {
          if (distance(flower.position, f.position) > radius || !canPaint(flower.state, i, now, params.protectionMs)) continue;
          const previousOwner = flower.state.kind === 'painted' ? flower.state.owner : null;
          if (previousOwner !== null) stats.steals++;
          flower.state = { kind: 'painted', owner: i, color: 'rosa', paintedAt: now };
          board.apply({ playerId: i, previousOwner });
        }
      }
    });

    for (let a = 0; a < fairies.length; a++) {
      for (let b = a + 1; b < fairies.length; b++) {
        const moved = separate({ ...fairies[a].position, radius: FAIRY.radius }, { ...fairies[b].position, radius: FAIRY.radius });
        if (moved) {
          fairies[a].position = moved.a;
          fairies[b].position = moved.b;
        }
      }
    }
    for (const f of fairies) {
      let p = f.position;
      for (const o of obstacles) p = pushOutOf(p, FAIRY.radius, o) ?? p;
      f.position = clampToBounds(p, FAIRY.radius, bounds);
    }

    if (params.powerUps) {
      if (now >= nextSpawnAt) {
        nextSpawnAt = now + POWER_UP_SPAWN.everyMs;
        if (orbs.length < POWER_UP_SPAWN.maxOnField) {
          const avoid = [...obstacles, ...fairies.map((f) => ({ ...f.position, radius: FAIRY.radius * 4 }))];
          const [spot] = scatterPoints(1, bounds, { avoid, minDistance: 0, padding: POWER_UP_SPAWN.radius * 2, rng });
          if (spot) orbs.push({ kind: KINDS[Math.floor(rng() * KINDS.length)], position: spot, expiresAt: now + POWER_UP_SPAWN.lifetimeMs });
        }
      }
      orbs = orbs.filter((o) => {
        const taker = fairies.find((f) => distance(f.position, o.position) <= FAIRY.radius + POWER_UP_SPAWN.radius);
        if (taker) {
          powerStates[taker.playerId].activate(o.kind, now);
          pickups[taker.playerId]++;
          return false;
        }
        return now < o.expiresAt;
      });
    }

    if (stats.paintedAt15 === 0 && now >= 15000) stats.paintedAt15 = paintedFraction();
    if (stats.paintedAt30 === 0 && now >= 30000) stats.paintedAt30 = paintedFraction();
    const top = winnersOf(board.scores);
    const newLeader: PlayerId | null = top.length === 1 ? top[0] : leader;
    if (now >= (params.durationS * 1000) / 2 && newLeader !== leader) stats.leadChangesLate++;
    leader = newLeader;
  }

  stats.scores = board.scores;
  stats.winners = winnersOf(stats.scores);
  stats.paintedAtEnd = paintedFraction();
  return stats;
}

export interface BalanceSummary {
  matches: number;
  paintedAt15: number;
  paintedAt30: number;
  paintedAtEnd: number;
  stealsPerMatch: number;
  /** Diferencia media entre la 1ª y la 2ª hada, en % de las flores. */
  marginPct: number;
  tieRate: number;
  leadChangesLate: number;
  /** Cuántas veces gana el hada que más power-ups cogió (entre las partidas en que hubo un único máximo). */
  powerUpWinRate: number;
  /** Victorias por esquina de salida (1 = perfectamente justo). */
  seatSpread: number;
}

export function summarize(params: BalanceParams, playerCount: number, seeds: number): BalanceSummary {
  const all = Array.from({ length: seeds }, (_, i) => simulateMatch(params, playerCount, 1000 + i));
  const avg = (f: (s: MatchStats) => number) => all.reduce((acc, s) => acc + f(s), 0) / all.length;
  const seatWins = Array.from({ length: playerCount }, () => 0);
  let puGames = 0;
  let puWins = 0;
  for (const s of all) {
    if (s.winners.length === 1) seatWins[s.winners[0]]++;
    const most = Math.max(...Object.values(s.pickups));
    const takers = Object.entries(s.pickups).filter(([, n]) => n === most).map(([id]) => Number(id));
    if (most > 0 && takers.length === 1) {
      puGames++;
      if (s.winners.includes(takers[0])) puWins++;
    }
  }
  const decided = seatWins.reduce((a, b) => a + b, 0);
  return {
    matches: all.length,
    paintedAt15: avg((s) => s.paintedAt15),
    paintedAt30: avg((s) => s.paintedAt30),
    paintedAtEnd: avg((s) => s.paintedAtEnd),
    stealsPerMatch: avg((s) => s.steals),
    marginPct: avg((s) => {
      const sorted = Object.values(s.scores).sort((a, b) => b - a);
      return ((sorted[0] - (sorted[1] ?? 0)) / Math.max(1, s.flowers)) * 100;
    }),
    tieRate: avg((s) => (s.winners.length !== 1 ? 1 : 0)),
    leadChangesLate: avg((s) => s.leadChangesLate),
    powerUpWinRate: puGames ? puWins / puGames : 0,
    seatSpread: decided ? Math.max(...seatWins) / Math.max(1, Math.min(...seatWins)) : 0,
  };
}
