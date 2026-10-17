import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../shared/config';
import { SceneKeys } from '../shared/scenes';
import type { GameScene } from './GameScene';

const OPTIONS = [
  { key: 'ESC', label: 'ESC / P  ·  Continuar' },
  { key: 'R', label: 'R  ·  Reiniciar partida' },
  { key: 'E', label: 'E  ·  Terminar y ver resultados' },
  { key: 'Q', label: 'Q  ·  Volver al menú' },
] as const;

/** Menú de pausa que se superpone a la partida. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Pause);
  }

  create(): void {
    const game = this.scene.get(SceneKeys.Game) as GameScene;
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setDepth(DEPTH.ui);
    this.add.text(cx, 200, 'Pausa', { fontSize: '56px', color: '#ffffff' }).setOrigin(0.5).setDepth(DEPTH.ui);
    OPTIONS.forEach((o, i) => {
      this.add
        .text(cx, 300 + i * 50, o.label, { fontSize: '26px', color: '#cfe8d5' })
        .setOrigin(0.5)
        .setDepth(DEPTH.ui);
    });
    this.add
      .text(cx, GAME_HEIGHT - 60, 'M  ·  Silenciar / activar sonido', { fontSize: '18px', color: '#9fc9a8' })
      .setOrigin(0.5)
      .setDepth(DEPTH.ui);

    const kb = this.input.keyboard;
    const resume = () => {
      sfx.click();
      this.scene.stop();
      game.resumeMatch();
    };
    kb?.once('keydown-ESC', resume);
    kb?.once('keydown-P', resume);
    kb?.once('keydown-R', () => {
      sfx.click();
      this.scene.stop();
      game.restartMatch();
    });
    kb?.once('keydown-E', () => {
      this.scene.stop();
      game.resumeMatch();
      game.endMatch();
    });
    kb?.once('keydown-Q', () => {
      sfx.click();
      sfx.stopMusic();
      this.scene.stop(SceneKeys.Game);
      this.scene.start(SceneKeys.MainMenu);
    });
  }
}
