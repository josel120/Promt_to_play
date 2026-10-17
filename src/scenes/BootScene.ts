import Phaser from 'phaser';
import { SceneKeys } from '../shared/scenes';
import { preloadSprites, registerPlaceholderTextures } from '../visuals/AssetRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    preloadSprites(this);
  }

  create(): void {
    registerPlaceholderTextures(this);
    this.scene.start(SceneKeys.MainMenu);
  }
}
