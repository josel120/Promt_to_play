import { describe, expect, it } from 'vitest';
import { Cooldown } from './cooldown';
import { NO_EFFECTS, POWER_UPS, PowerUpState } from './powerUps';

describe('enfriamiento del hechizo', () => {
  it('no deja lanzar dos hechizos seguidos', () => {
    const cd = new Cooldown();
    expect(cd.tryUse(0, 600)).toBe(true);
    expect(cd.tryUse(599, 600)).toBe(false);
    expect(cd.remaining(300)).toBe(300);
    expect(cd.tryUse(600, 600)).toBe(true);
  });
});

describe('power-ups', () => {
  it('sin power-ups no hay efectos', () => {
    expect(new PowerUpState().effects(0)).toEqual(NO_EFFECTS);
  });

  it('el café acelera mientras dura', () => {
    const s = new PowerUpState();
    s.activate('cafe', 1000);
    expect(s.effects(1000).speedMultiplier).toBe(POWER_UPS.cafe.effects.speedMultiplier);
    expect(s.effects(1000 + POWER_UPS.cafe.durationMs).speedMultiplier).toBe(1);
  });

  it('los efectos de varios power-ups se combinan', () => {
    const s = new PowerUpState();
    s.activate('megaHechizo', 0);
    s.activate('polvoDeHada', 0);
    expect(s.active(100).sort()).toEqual(['megaHechizo', 'polvoDeHada']);
    const e = s.effects(100);
    expect(e.spellRadiusMultiplier).toBe(POWER_UPS.megaHechizo.effects.spellRadiusMultiplier);
    expect(e.cooldownMultiplier).toBe(POWER_UPS.polvoDeHada.effects.cooldownMultiplier);
    expect(e.speedMultiplier).toBe(1);
  });

  it('coger el mismo power-up otra vez reinicia su duración', () => {
    const s = new PowerUpState();
    s.activate('cafe', 0);
    s.activate('cafe', 4000);
    expect(s.active(4000 + POWER_UPS.cafe.durationMs - 1)).toEqual(['cafe']);
  });
});
