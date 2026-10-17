import Phaser from 'phaser';
import { SceneKeys } from '../shared/scenes';

// TODO (Thais): cargar aquí los sprites y sonidos cuando reemplacen las formas geométricas.
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.scene.start(SceneKeys.MainMenu);
  }
}
