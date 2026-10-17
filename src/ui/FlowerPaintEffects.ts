import Phaser from 'phaser';
import { DEPTH, FAIRY_COLORS, type FairyColorName } from '../shared/config';
import { GameEvents, gameEvents, type GameEventPayloads } from '../shared/events';
import { TextureKeys } from '../visuals/AssetRegistry';

/** Chispas y destello del color del hada cada vez que se pinta una flor (escucha FLOWER_PAINTED). */
export class FlowerPaintEffects {
  private readonly emitters = new Map<FairyColorName, Phaser.GameObjects.Particles.ParticleEmitter>();

  constructor(private readonly scene: Phaser.Scene) {
    gameEvents.on(GameEvents.FLOWER_PAINTED, this.onPainted, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameEvents.off(GameEvents.FLOWER_PAINTED, this.onPainted, this);
    });
  }

  private onPainted({ color, at }: GameEventPayloads[typeof GameEvents.FLOWER_PAINTED]): void {
    this.emitterFor(color).explode(14, at.x, at.y);

    const flash = this.scene.add
      .image(at.x, at.y, TextureKeys.spellRing)
      .setTint(FAIRY_COLORS[color])
      .setScale(0.2)
      .setDepth(DEPTH.effects);
    this.scene.tweens.add({
      targets: flash,
      scale: 0.7,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private emitterFor(color: FairyColorName): Phaser.GameObjects.Particles.ParticleEmitter {
    let emitter = this.emitters.get(color);
    if (!emitter) {
      emitter = this.scene.add
        .particles(0, 0, TextureKeys.spark, {
          speed: { min: 40, max: 150 },
          lifespan: 550,
          scale: { start: 1, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: FAIRY_COLORS[color],
          blendMode: 'ADD',
          emitting: false,
        })
        .setDepth(DEPTH.effects);
      this.emitters.set(color, emitter);
    }
    return emitter;
  }
}
