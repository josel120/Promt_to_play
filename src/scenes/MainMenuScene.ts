import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../shared/config';
import { SceneKeys } from '../shared/scenes';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.text(cx, cy - 60, 'Hadas del Bosque', { fontSize: '56px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(cx, cy + 20, 'Pulsa ENTER para empezar', { fontSize: '24px', color: '#cfe8d5' })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 50, 'M · Silenciar / activar sonido', { fontSize: '18px', color: '#9fc9a8' })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start(SceneKeys.PlayerSelect));
  }
}
