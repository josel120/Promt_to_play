import { GameEvents, gameEvents, type GameEventPayloads } from '../shared/events';
import type { PlayerId, Scores } from '../shared/types';
import { ScoreBoard } from './scoring';

/** J7: escucha `FLOWER_PAINTED` y emite `SCORE_CHANGED` con el marcador actualizado. */
export class ScoreSystem {
  private readonly board: ScoreBoard;

  constructor(players: readonly PlayerId[]) {
    this.board = new ScoreBoard(players);
    gameEvents.on(GameEvents.FLOWER_PAINTED, this.onPainted, this);
    gameEvents.emit(GameEvents.SCORE_CHANGED, { scores: this.board.scores });
  }

  get scores(): Scores {
    return this.board.scores;
  }

  destroy(): void {
    gameEvents.off(GameEvents.FLOWER_PAINTED, this.onPainted, this);
  }

  private onPainted(payload: GameEventPayloads[typeof GameEvents.FLOWER_PAINTED]): void {
    gameEvents.emit(GameEvents.SCORE_CHANGED, { scores: this.board.apply(payload) });
  }
}
