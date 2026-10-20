/** J9: power-ups. Solo datos y reglas; la parte visual vive en PowerUpSystem. */

export type PowerUpKind = 'cafe' | 'megaHechizo' | 'polvoDeHada';

export interface PowerUpEffects {
  speedMultiplier: number;
  spellRadiusMultiplier: number;
  cooldownMultiplier: number;
}

export interface PowerUpInfo {
  name: string;
  color: number;
  durationMs: number;
  effects: Partial<PowerUpEffects>;
  quips: string[];
}

export const POWER_UPS: Record<PowerUpKind, PowerUpInfo> = {
  cafe: {
    name: 'Café de rocío',
    color: 0xc68642,
    durationMs: 5000,
    effects: { speedMultiplier: 1.35 },
    quips: ['¡Cafeína mágica!', '¡Nyoooom!', '¡No duermo hasta 2050!'],
  },
  megaHechizo: {
    name: 'Mega hechizo',
    color: 0xb388ff,
    durationMs: 6000,
    effects: { spellRadiusMultiplier: 1.4 },
    quips: ['¡Hechizo XXL!', '¡Tamaño familiar!', '¡Abraca-MEGA-dabra!'],
  },
  polvoDeHada: {
    name: 'Polvo de hada',
    color: 0xfff176,
    durationMs: 6000,
    effects: { cooldownMultiplier: 0.6 },
    quips: ['¡Brillitos infinitos!', '¡Achís... de purpurina!', '¡Magia sin pausa!'],
  },
};

export const POWER_UP_SPAWN = {
  /** Cada cuánto aparece un power-up nuevo. */
  everyMs: 9000,
  /** Cuánto dura uno en el suelo antes de desvanecerse. */
  lifetimeMs: 10000,
  maxOnField: 2,
  radius: 16,
} as const;

export const NO_EFFECTS: PowerUpEffects = { speedMultiplier: 1, spellRadiusMultiplier: 1, cooldownMultiplier: 1 };

/** Power-ups activos de un hada. Coger el mismo otra vez reinicia su duración. */
export class PowerUpState {
  private readonly expiresAt = new Map<PowerUpKind, number>();

  activate(kind: PowerUpKind, now: number): void {
    this.expiresAt.set(kind, now + POWER_UPS[kind].durationMs);
  }

  active(now: number): PowerUpKind[] {
    return [...this.expiresAt].filter(([, until]) => until > now).map(([kind]) => kind);
  }

  effects(now: number): PowerUpEffects {
    return this.active(now).reduce<PowerUpEffects>(
      (acc, kind) => {
        const e = POWER_UPS[kind].effects;
        return {
          speedMultiplier: acc.speedMultiplier * (e.speedMultiplier ?? 1),
          spellRadiusMultiplier: acc.spellRadiusMultiplier * (e.spellRadiusMultiplier ?? 1),
          cooldownMultiplier: acc.cooldownMultiplier * (e.cooldownMultiplier ?? 1),
        };
      },
      { ...NO_EFFECTS },
    );
  }
}
