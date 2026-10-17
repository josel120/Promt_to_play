import Phaser from 'phaser';
import { DEPTH, FLOWER, type FairyColorName } from '../shared/config';
import type { FlowerState, IFlower, PlayerId, Point } from '../shared/types';
import { TextureKeys, TextureSizes } from '../visuals/AssetRegistry';
import type { FlowerSpawn } from './flowerPlacement';

/**
 * Flor provisional para poder ver el bosque con flores mientras Jose termina `Flower` (J3).
 * Cuando exista, se pasa su fábrica a `spawnFlowers` y esta clase se puede borrar.
 */
export class PlaceholderFlower implements IFlower {
  readonly id: number;
  readonly position: Point;
  state: FlowerState;
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, spawn: FlowerSpawn) {
    this.id = spawn.id;
    this.position = spawn.position;
    this.state = { kind: 'neutral', tone: spawn.tone };
    this.image = scene.add
      .image(spawn.position.x, spawn.position.y, TextureKeys.flowerNeutral(spawn.tone))
      .setScale((FLOWER.radius * 2) / TextureSizes.flower.size)
      .setDepth(DEPTH.flowers);
  }

  paint(owner: PlayerId, color: FairyColorName, time: number): void {
    this.state = { kind: 'painted', owner, color, paintedAt: time };
    this.image.setTexture(TextureKeys.flowerPainted(color));
    const scale = this.image.scale;
    this.image.scene.tweens.add({ targets: this.image, scale: scale * 1.4, duration: 120, yoyo: true });
  }

  destroy(): void {
    this.image.destroy();
  }
}
