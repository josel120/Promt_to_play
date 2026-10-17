import Phaser from 'phaser';
import { DEPTH, FAIRY_COLORS, GAME_WIDTH } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import type { PlayerConfig, PlayerId, Scores } from '../shared/types';

const BAR_WIDTH = 100;
const CHIP_WIDTH = 190;
const HUD_Y = 38;

interface ScoreChip {
  label: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Rectangle;
}

/** Barra superior: temporizador en el centro y marcador de cada hada a los lados. */
export class Hud {
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly chips = new Map<PlayerId, ScoreChip>();
  private pulse?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly players: PlayerConfig[],
    private readonly totalFlowers: number,
  ) {
    this.timerText = scene.add
      .text(GAME_WIDTH / 2, HUD_Y, '', { fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    // Dos hadas a la izquierda del temporizador y dos a la derecha.
    players.forEach((p, i) => {
      const x = i < 2 ? 40 + i * CHIP_WIDTH : GAME_WIDTH - 40 - (4 - i) * CHIP_WIDTH;
      scene.add.circle(x, HUD_Y, 11, FAIRY_COLORS[p.color]).setStrokeStyle(2, 0xffffff).setDepth(DEPTH.ui);
      const label = scene.add
        .text(x + 20, HUD_Y - 2, '', { fontSize: '20px', color: '#ffffff' })
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.ui);
      scene.add.rectangle(x + 70, HUD_Y + 1, BAR_WIDTH, 8, 0x000000, 0.35).setOrigin(0, 0.5).setDepth(DEPTH.ui);
      const bar = scene.add
        .rectangle(x + 70, HUD_Y + 1, 0, 8, FAIRY_COLORS[p.color])
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.ui);
      this.chips.set(p.id, { label, bar });
    });

    this.setScores(Object.fromEntries(players.map((p) => [p.id, 0])));
    gameEvents.on(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off(GameEvents.SCORE_CHANGED, this.onScoreChanged, this);
    });
  }

  setTime(secondsLeft: number): void {
    this.timerText.setText(`${secondsLeft}s`);
    this.timerText.setColor(secondsLeft <= 10 ? '#ff6b6b' : '#ffffff');
    if (secondsLeft <= 5 && !this.pulse) {
      this.pulse = this.scene.tweens.add({ targets: this.timerText, scale: 1.25, duration: 250, yoyo: true, repeat: -1 });
    }
  }

  setScores(scores: Scores): void {
    const best = Math.max(0, ...Object.values(scores));
    for (const p of this.players) {
      const chip = this.chips.get(p.id);
      if (!chip) continue;
      const score = scores[p.id] ?? 0;
      const leading = best > 0 && score === best;
      chip.label.setText(`${leading ? '★' : ''}${score}`);
      chip.bar.width = this.totalFlowers > 0 ? (BAR_WIDTH * score) / this.totalFlowers : 0;
    }
  }

  private onScoreChanged({ scores }: { scores: Scores }): void {
    this.setScores(scores);
  }
}
