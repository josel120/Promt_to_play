# Balance

`npm run balance` simula partidas completas entre hadas CPU (J11) sin Phaser (`src/systems/balanceSim.ts`) y compara variantes de los números del juego.
Variables: `SEEDS=60` (partidas por variante) y `VARIANTS='{"nombre": {"cooldownMs": 450}}'` (ver `BalanceParams`).

## Qué mide
- **15s / 30s / final**: % de flores ya pintadas en ese momento.
- **robos**: flores robadas por partida.
- **margen%**: diferencia entre la 1ª y la 2ª hada, en % de las flores (más bajo = más reñido).
- **cambios de líder (2ª mitad)**: más = final más emocionante.
- **gana +power-ups**: cuántas veces gana el hada que más power-ups cogió. Si no influyeran, sería 50% / 33% / 25% con 2 / 3 / 4 hadas.

## Resultado (60 partidas por variante, CPU contra CPU)
| Hadas | Variante | margen% | cambios líder | gana +power-ups | robos |
|---|---|---|---|---|---|
| 2 | antes | 22.1 | 6.1 | 67% | 262 |
| 2 | **power-ups suaves** | **13.6** | **13.6** | **43%** | 256 |
| 3 | antes | 15.0 | 13.7 | 51% | 382 |
| 3 | **power-ups suaves** | **14.4** | **16.3** | **42%** | 376 |
| 4 | antes | 12.0 | 16.8 | 48% | 459 |
| 4 | **power-ups suaves** | **9.9** | **18.6** | **38%** | 451 |

**Cambio aplicado (solo `src/systems/powerUps.ts`, no toca `src/shared/`):**
Café de rocío velocidad ×1.6 → **×1.35**; Mega hechizo radio ×1.8 → **×1.4** (antes era ×3.2 de área); Polvo de hada cooldown ×0.35 → **×0.6**.

## Probado y descartado
- **Protección 2500 ms**: baja los robos un 15–25%, pero los power-ups pesan más todavía.
- **Cooldown 450 / 800, radio 60 / 80, 30 / 50 flores, partida de 75 s**: cambian poco, o empeoran el margen o la justicia de las esquinas.
- **Sin power-ups**: el margen es el más bajo, pero se pierde la gracia.

## Para hablar entre los dos
- Con cualquier variante, a los 15 s ya están pintadas el 87–99% de las flores: casi toda la partida es robar. Si queréis una fase de "exploración" más larga, la palanca es más flores con un cooldown más largo, o una partida más corta.
- Son CPUs perfectas; con personas conviene probarlo jugando. Las diferencias entre esquinas de salida con 60 partidas son ruido.
