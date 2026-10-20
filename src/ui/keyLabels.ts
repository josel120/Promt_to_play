/** Nombre legible de una tecla de PLAYER_KEYS para mostrarla en pantalla. */
const LABELS: Record<string, string> = {
  UP: '↑',
  DOWN: '↓',
  LEFT: '←',
  RIGHT: '→',
  SPACE: 'Espacio',
  ENTER: 'Enter',
  EIGHT: '8',
  FIVE: '5',
  FOUR: '4',
  SIX: '6',
  ZERO: '0',
};

export function keyLabel(name: string): string {
  return LABELS[name] ?? name;
}
