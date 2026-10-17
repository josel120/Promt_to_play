import Phaser from 'phaser';
import { FAIRY_COLORS, FLOWER, FLOWER_NEUTRAL_COLORS, type FairyColorName } from '../shared/config';
import type { FlowerState, IFlower, PlayerId, Point } from '../shared/types';
import { LAYER } from '../systems/layers';

const PETALS = 6;

/** J3: flor geométrica. Nace blanca o gris y florece del color del hada que la encanta. */
export class Flower implements IFlower {
  readonly id: number;
  readonly position: Point;
  private current: FlowerState;
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly bloom: Phaser.GameObjects.Graphics;
  private readonly shield: Phaser.GameObjects.Arc;
  private shieldTween?: Phaser.Tweens.Tween;
  private shieldTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, id: number, position: Point, tone: 'blanca' | 'gris' = id % 2 ? 'gris' : 'blanca') {
    this.scene = scene;
    this.id = id;
    this.position = { ...position };
    this.current = { kind: 'neutral', tone };

    const stem = scene.add.graphics();
    stem.fillStyle(0x2e7d32, 1);
    stem.fillRect(-1.5, 0, 3, FLOWER.radius + 4);
    stem.fillEllipse(5, FLOWER.radius - 1, 9, 4);
    stem.fillEllipse(-5, FLOWER.radius + 2, 9, 4);

    this.shield = scene.add.circle(0, 0, FLOWER.radius + 6).setStrokeStyle(2, 0xffffff, 0.9).setVisible(false);
    this.bloom = scene.add.graphics();
    this.root = scene.add.container(position.x, position.y, [stem, this.shield, this.bloom]).setDepth(LAYER.flowers);
    this.draw();

    // Balanceo suave para que el bosque parezca vivo.
    scene.tweens.add({
      targets: this.bloom,
      angle: { from: -6, to: 6 },
      duration: 1400 + Math.random() * 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 1000,
    });
  }

  get state(): FlowerState {
    return this.current;
  }

  /** Pinta la flor con el color del hada. Las reglas (quién puede pintar) están en systems/rules. */
  paint(owner: PlayerId, color: FairyColorName, now: number): void {
    this.current = { kind: 'painted', owner, color, paintedAt: now };
    this.draw();

    this.bloom.setScale(0.2);
    this.scene.tweens.add({ targets: this.bloom, scale: 1, duration: 450, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.root, y: this.position.y - 6, duration: 120, yoyo: true, ease: 'Quad.easeOut' });

    this.showShield(FAIRY_COLORS[color]);
  }

  destroy(): void {
    this.shieldTimer?.remove();
    this.root.destroy();
  }

  /** Anillo brillante mientras dura la protección contra repintado. */
  private showShield(color: number): void {
    this.shieldTween?.stop();
    this.shieldTimer?.remove();
    this.shield.setStrokeStyle(2, color, 0.9).setVisible(true).setAlpha(1).setScale(1);
    this.shieldTween = this.scene.tweens.add({
      targets: this.shield,
      alpha: 0.25,
      scale: 1.15,
      duration: 250,
      yoyo: true,
      repeat: -1,
    });
    this.shieldTimer = this.scene.time.delayedCall(FLOWER.protectionMs, () => {
      this.shieldTween?.stop();
      this.shield.setVisible(false);
    });
  }

  private draw(): void {
    const g = this.bloom;
    const r = FLOWER.radius;
    const painted = this.current.kind === 'painted';
    const petalColor = painted
      ? FAIRY_COLORS[(this.current as Extract<FlowerState, { kind: 'painted' }>).color]
      : FLOWER_NEUTRAL_COLORS[(this.current as Extract<FlowerState, { kind: 'neutral' }>).tone];

    g.clear();
    if (painted) {
      g.fillStyle(petalColor, 0.25);
      g.fillCircle(0, 0, r * 1.6);
    }
    g.fillStyle(petalColor, 1);
    for (let i = 0; i < PETALS; i++) {
      const a = (i / PETALS) * Math.PI * 2;
      g.fillCircle(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.5);
    }
    g.fillStyle(painted ? 0xffffff : 0xffd54f, 1);
    g.fillCircle(0, 0, r * 0.38);
    if (painted) {
      // Carita feliz: las flores encantadas sonríen.
      g.fillStyle(0x3b2a20, 1);
      g.fillCircle(-1.8, -1, 0.9);
      g.fillCircle(1.8, -1, 0.9);
      g.lineStyle(1, 0x3b2a20, 1);
      g.beginPath();
      g.arc(0, 0.6, 1.8, 0.2, Math.PI - 0.2, false);
      g.strokePath();
    }
  }
}
