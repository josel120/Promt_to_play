import Phaser from 'phaser';
import { FAIRY_COLORS, SPELL } from '../shared/config';
import { GameEvents, gameEvents } from '../shared/events';
import type { PlayerId } from '../shared/types';
import type { Fairy } from '../entities/Fairy';
import type { Flower } from '../entities/Flower';
import { Cooldown } from './cooldown';
import { LAYER } from './layers';
import { NO_EFFECTS, type PowerUpEffects } from './powerUps';
import { pickQuip } from './quips';
import { canPaint, flowersInSpell } from './rules';

/**
 * J4 + J5 + J6: hechizo de área con enfriamiento.
 * Emite `SPELL_CAST` y un `FLOWER_PAINTED` por cada flor que cambia de dueña.
 */
export class SpellSystem {
  private readonly cooldowns = new Map<PlayerId, Cooldown>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly flowers: readonly Flower[],
    private readonly effectsOf: (playerId: PlayerId, now: number) => PowerUpEffects = () => NO_EFFECTS,
  ) {}

  /** Lanza el hechizo si el hada no está en enfriamiento. Devuelve cuántas flores pintó, o null si no pudo. */
  tryCast(fairy: Fairy, now: number): number | null {
    const effects = this.effectsOf(fairy.playerId, now);
    const cooldown = this.cooldowns.get(fairy.playerId) ?? new Cooldown();
    this.cooldowns.set(fairy.playerId, cooldown);
    if (!cooldown.tryUse(now, SPELL.cooldownMs * effects.cooldownMultiplier)) return null;

    const at = fairy.position;
    const radius = SPELL.radius * effects.spellRadiusMultiplier;
    gameEvents.emit(GameEvents.SPELL_CAST, { playerId: fairy.playerId, at });
    this.drawSpell(at.x, at.y, radius, FAIRY_COLORS[fairy.color]);

    let painted = 0;
    let stolen = 0;
    for (const flower of flowersInSpell(this.flowers, at, radius)) {
      if (!canPaint(flower.state, fairy.playerId, now)) continue;
      const previousOwner = flower.state.kind === 'painted' ? flower.state.owner : null;
      flower.paint(fairy.playerId, fairy.color, now);
      painted++;
      if (previousOwner !== null) stolen++;
      gameEvents.emit(GameEvents.FLOWER_PAINTED, {
        flowerId: flower.id,
        playerId: fairy.playerId,
        color: fairy.color,
        previousOwner,
        at: flower.position,
      });
    }

    if (painted > 0) fairy.celebrate();
    if (stolen > 0) fairy.say(pickQuip('steal'));
    else if (painted >= 4) fairy.say(pickQuip('bigPaint'));
    else if (painted > 0 && Math.random() < 0.35) fairy.say(pickQuip('paint'));
    else if (painted === 0 && Math.random() < 0.2) fairy.say(pickQuip('miss'));

    return painted;
  }

  /** Onda mágica: anillo que se expande y un puñado de estrellitas. */
  drawSpell(x: number, y: number, radius: number, color: number): void {
    const ring = this.scene.add.circle(x, y, radius).setStrokeStyle(4, color, 1).setDepth(LAYER.effects).setScale(0.2);
    const fill = this.scene.add.circle(x, y, radius, color, 0.2).setDepth(LAYER.effects).setScale(0.2);
    this.scene.tweens.add({
      targets: [ring, fill],
      scale: 1,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        ring.destroy();
        fill.destroy();
      },
    });

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dot = this.scene.add.circle(x, y, 3, i % 2 ? 0xffffff : color).setDepth(LAYER.effects);
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * radius,
        y: y + Math.sin(a) * radius,
        alpha: 0,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }
}
