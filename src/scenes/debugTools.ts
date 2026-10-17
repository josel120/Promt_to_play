import Phaser from 'phaser';
import { GameEvents, gameEvents } from '../shared/events';
import type { IFlower, PlayerConfig, Scores } from '../shared/types';
import { PlaceholderFlower } from '../world/PlaceholderFlower';

/**
 * Solo en desarrollo (`npm run dev`): tecla F = un hada al azar pinta una flor al azar.
 * Sirve para probar HUD, partículas y sonido antes de tener el gameplay de Jose.
 * Se borra (o se desactiva) cuando exista el ScoreSystem real.
 */
export function installDebugTools(scene: Phaser.Scene, players: PlayerConfig[], flowers: IFlower[]): void {
  if (players.length === 0) return;

  scene.input.keyboard?.on('keydown-F', (event: KeyboardEvent) => {
    if (event.repeat) return;
    const candidates = flowers.filter((f): f is PlaceholderFlower => f instanceof PlaceholderFlower);
    if (candidates.length === 0) return;
    const flower = Phaser.Utils.Array.GetRandom(candidates);
    const player = Phaser.Utils.Array.GetRandom(players);
    const previousOwner = flower.state.kind === 'painted' ? flower.state.owner : null;
    if (previousOwner === player.id) return;

    gameEvents.emit(GameEvents.SPELL_CAST, { playerId: player.id, at: flower.position });
    flower.paint(player.id, player.color, scene.time.now);
    gameEvents.emit(GameEvents.FLOWER_PAINTED, {
      flowerId: flower.id,
      playerId: player.id,
      color: player.color,
      previousOwner,
      at: flower.position,
    });

    const scores: Scores = Object.fromEntries(players.map((p) => [p.id, 0]));
    for (const f of candidates) if (f.state.kind === 'painted') scores[f.state.owner] += 1;
    gameEvents.emit(GameEvents.SCORE_CHANGED, { scores });
  });
}
