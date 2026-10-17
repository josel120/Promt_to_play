/** Nombre legible de una tecla de PLAYER_KEYS para mostrarla en pantalla. */
const LABELS: Record<string, string> = {
  UP: '↑',
  DOWN: '↓',
  LEFT: '←',
  RIGHT: '→',
  SPACE: 'Espacio',
  ENTER: 'Enter',
  NUMPAD_EIGHT: 'Num8',
  NUMPAD_FIVE: 'Num5',
  NUMPAD_FOUR: 'Num4',
  NUMPAD_SIX: 'Num6',
  NUMPAD_ZERO: 'Num0',
};

export function keyLabel(name: string): string {
  return LABELS[name] ?? name;
}
