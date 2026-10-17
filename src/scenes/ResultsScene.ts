import Phaser from 'phaser';
import { FAIRY_COLORS, GAME_WIDTH } from '../shared/config';
import { SceneKeys } from '../shared/scenes';
import type { MatchResult } from '../shared/types';

// TODO (Thais): ranking visual, revancha con los mismos jugadores.
export class ResultsScene extends Phaser.Scene {
  private result!: MatchResult;

  constructor() {
    super(SceneKeys.Results);
  }

  init(data: MatchResult): void {
    this.result = data;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const { winners, players, scores } = this.result;
    const title =
      winners.length === 0 ? 'Nadie encantó flores' : winners.length > 1 ? '¡Empate!' : `¡Gana el hada J${winners[0] + 1}!`;

    this.add.text(cx, 140, title, { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);

    players.forEach((p, i) => {
      const y = 240 + i * 60;
      this.add.circle(cx - 100, y, 18, FAIRY_COLORS[p.color]);
      this.add.text(cx - 60, y, `J${p.id + 1}: ${scores[p.id] ?? 0} flores`, { fontSize: '26px', color: '#ffffff' }).setOrigin(0, 0.5);
    });

    this.add.text(cx, 620, 'ENTER para volver al menú', { fontSize: '22px', color: '#cfe8d5' }).setOrigin(0.5);
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start(SceneKeys.MainMenu));
  }
}
