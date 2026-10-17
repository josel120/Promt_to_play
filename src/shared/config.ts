// Contrato compartido: cualquier cambio aquí se acuerda entre Thais y Jose.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Colores disponibles para las hadas. Cada jugador elige uno distinto. */
export const FAIRY_COLORS = {
  rosa: 0xff5fa2,
  azul: 0x4da6ff,
  verde: 0x5ce65c,
  amarillo: 0xffd23f,
} as const;

export type FairyColorName = keyof typeof FAIRY_COLORS;

/** Colores de las flores sin encantar. */
export const FLOWER_NEUTRAL_COLORS = {
  blanca: 0xffffff,
  gris: 0x9e9e9e,
} as const;

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

/** Duración de una partida, en segundos. */
export const MATCH_DURATION_S = 90;

export const FAIRY = {
  speed: 220, // px/s
  radius: 18,
} as const;

export const SPELL = {
  radius: 70, // radio del área de encantamiento, en px
  cooldownMs: 600,
} as const;

export const FLOWER = {
  count: 40,
  radius: 12,
  /** Tiempo durante el que una flor recién pintada no se puede repintar. */
  protectionMs: 1500,
} as const;

/** Teclas por jugador (layout por defecto para multijugador local). */
export const PLAYER_KEYS = [
  { up: 'W', down: 'S', left: 'A', right: 'D', spell: 'SPACE' },
  { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', spell: 'ENTER' },
  { up: 'I', down: 'K', left: 'J', right: 'L', spell: 'U' },
  { up: 'NUMPAD_EIGHT', down: 'NUMPAD_FIVE', left: 'NUMPAD_FOUR', right: 'NUMPAD_SIX', spell: 'NUMPAD_ZERO' },
] as const;
