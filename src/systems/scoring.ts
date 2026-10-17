import type { PlayerId, Scores } from '../shared/types';

/** Lleva la cuenta de flores por hada. Sin Phaser para poder testearlo fácil. */
export class ScoreBoard {
  private readonly current: Scores;

  constructor(players: readonly PlayerId[]) {
    this.current = Object.fromEntries(players.map((id) => [id, 0]));
  }

  /** Aplica una flor pintada: +1 para quien la pinta y -1 para quien la pierde. */
  apply(painted: { playerId: PlayerId; previousOwner: PlayerId | null }): Scores {
    this.current[painted.playerId] = (this.current[painted.playerId] ?? 0) + 1;
    if (painted.previousOwner !== null && painted.previousOwner !== painted.playerId) {
      this.current[painted.previousOwner] = Math.max(0, (this.current[painted.previousOwner] ?? 0) - 1);
    }
    return this.scores;
  }

  get scores(): Scores {
    return { ...this.current };
  }
}

/** Hadas con más flores. Vacío si nadie pintó nada; varias si hay empate. */
export function winnersOf(scores: Scores): PlayerId[] {
  const best = Math.max(0, ...Object.values(scores));
  if (best === 0) return [];
  return Object.entries(scores)
    .filter(([, score]) => score === best)
    .map(([id]) => Number(id));
}
