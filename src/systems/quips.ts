/** Frases de las hadas. Cuanto más tontas, mejor. */
export const QUIPS = {
  paint: ['¡Mía!', '¡Zas!', '¡Bibidi-babidi!', '¡Qué bonita!', '¡Floreciendo!', '¡Tachán!'],
  bigPaint: ['¡COMBO FLORAL!', '¡Jardinera nivel dios!', '¡Primavera instantánea!'],
  steal: ['¡Robada!', '¡Ahora es mía!', '¡Ups, perdón! (no)', '¡Gracias por regarla!'],
  miss: ['¿Eh?', '¡Fallé!', 'Era de práctica...', '*chispitas tristes*'],
  bump: ['¡Boing!', '¡Ay!', '¡Mira por dónde vuelas!', '¡Perdón!', '¡Choca esos cinco!'],
  start: ['¡A encantar!', '¡Vamos allá!', '¡Hoy gano yo!', '¡Flores, temblad!'],
} as const;

export type QuipKind = keyof typeof QUIPS;

export function pickQuip(kind: QuipKind, rng: () => number = Math.random): string {
  const list = QUIPS[kind];
  return list[Math.floor(rng() * list.length)];
}

export function pickFrom<T>(list: readonly T[], rng: () => number = Math.random): T {
  return list[Math.floor(rng() * list.length)];
}
