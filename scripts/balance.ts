// `npm run balance`: compara variantes de los números del juego con partidas simuladas entre CPUs.
import { CURRENT_PARAMS, summarize, type BalanceParams } from '../src/systems/balanceSim';

const SEEDS = Number(process.env.SEEDS ?? 30);
const variants: Record<string, Partial<BalanceParams>> = JSON.parse(
  process.env.VARIANTS ??
    JSON.stringify({
      actual: {},
      'cooldown 450': { cooldownMs: 450 },
      'cooldown 800': { cooldownMs: 800 },
      'radio 60': { spellRadius: 60 },
      'radio 80': { spellRadius: 80 },
      'protección 2500': { protectionMs: 2500 },
      'protección 800': { protectionMs: 800 },
      '50 flores': { flowerCount: 50 },
      '30 flores': { flowerCount: 30 },
      '75 s': { durationS: 75 },
      'sin power-ups': { powerUps: false },
    }),
);

const pct = (n: number) => `${Math.round(n * 100)}%`;
for (const players of [2, 3, 4]) {
  console.log(`\n=== ${players} hadas (${SEEDS} partidas por variante) ===`);
  const rows = Object.entries(variants).map(([name, v]) => {
    const s = summarize({ ...CURRENT_PARAMS, ...v }, players, SEEDS);
    return {
      variante: name,
      '15s': pct(s.paintedAt15),
      '30s': pct(s.paintedAt30),
      final: pct(s.paintedAtEnd),
      robos: s.stealsPerMatch.toFixed(0),
      'margen%': s.marginPct.toFixed(1),
      empates: pct(s.tieRate),
      'cambios líder 2ª mitad': s.leadChangesLate.toFixed(1),
      'gana +power-ups': pct(s.powerUpWinRate),
      'esquinas max/min': s.seatSpread.toFixed(2),
    };
  });
  console.table(rows);
}
