/** Enfriamiento simple: `tryUse` solo devuelve true si ya pasó el tiempo de espera. */
export class Cooldown {
  private readyAt = 0;

  tryUse(now: number, cooldownMs: number): boolean {
    if (now < this.readyAt) return false;
    this.readyAt = now + cooldownMs;
    return true;
  }

  remaining(now: number): number {
    return Math.max(0, this.readyAt - now);
  }
}
