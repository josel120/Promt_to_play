import Phaser from 'phaser';
import { FAIRY_COLORS, GAME_HEIGHT, GAME_WIDTH, MAX_PLAYERS, MIN_PLAYERS, type FairyColorName } from '../shared/config';
import { SceneKeys } from '../shared/scenes';
import type { PlayerConfig } from '../shared/types';

// TODO (Thais): permitir que cada jugador elija su color. Por ahora se asignan en orden.
export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PlayerSelect);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 200, '¿Cuántas hadas juegan?', { fontSize: '40px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(cx, 270, `Pulsa un número del ${MIN_PLAYERS} al ${MAX_PLAYERS}`, { fontSize: '22px', color: '#cfe8d5' })
      .setOrigin(0.5);

    const colorNames = Object.keys(FAIRY_COLORS) as FairyColorName[];
    colorNames.forEach((name, i) => {
      const x = cx + (i - (colorNames.length - 1) / 2) * 120;
      this.add.circle(x, GAME_HEIGHT / 2 + 80, 30, FAIRY_COLORS[name]);
      this.add.text(x, GAME_HEIGHT / 2 + 130, `J${i + 1}`, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= MIN_PLAYERS && n <= MAX_PLAYERS) {
        const players: PlayerConfig[] = colorNames.slice(0, n).map((color, id) => ({ id, color, keysIndex: id }));
        this.scene.start(SceneKeys.Game, { players });
      }
    });
  }
}
