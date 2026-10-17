import type { PlayerConfig, Scores } from '../shared/types';

export interface RankedPlayer {
  player: PlayerConfig;
  score: number;
  /** 1 = primero. Los empatados comparten posición (1, 1, 3...). */
  position: number;
}

/** Ordena a los jugadores de más a menos flores. */
export function rankPlayers(players: PlayerConfig[], scores: Scores): RankedPlayer[] {
  const sorted = players
    .map((player) => ({ player, score: scores[player.id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.player.id - b.player.id);
  return sorted.map((entry) => ({
    ...entry,
    position: sorted.findIndex((e) => e.score === entry.score) + 1,
  }));
}
