import Phaser from 'phaser';
import type { IFlower } from '../shared/types';
import type { Forest } from './Forest';
import { planFlowers, type FlowerPlacementOptions, type FlowerSpawn } from './flowerPlacement';
import { PlaceholderFlower } from './PlaceholderFlower';

/** Crea una flor a partir de su posición y tono. Jose pasará aquí la fábrica de su clase `Flower`. */
export type FlowerFactory = (scene: Phaser.Scene, spawn: FlowerSpawn) => IFlower;

export const placeholderFlowerFactory: FlowerFactory = (scene, spawn) => new PlaceholderFlower(scene, spawn);

/** Reparte las flores por el bosque, sin tocar obstáculos, y las crea con `factory`. */
export function spawnFlowers(
  scene: Phaser.Scene,
  forest: Forest,
  factory: FlowerFactory = placeholderFlowerFactory,
  options: FlowerPlacementOptions = {},
): IFlower[] {
  const spawns = planFlowers(forest.bounds, (p, radius) => forest.isFree(p, radius, 6), options);
  return spawns.map((spawn) => factory(scene, spawn));
}
