# Plan de tareas

**Thais**: repo principal. Mundo, interfaz, flujo de juego, revisión e integración de PRs.
**Jose**: fork. Gameplay: hadas, flores, hechizo y puntuación.

Los dos se comunican solo a través de `src/shared/` (config, tipos y el bus `gameEvents`).
Así cada uno puede avanzar sin esperar al otro.

## Fase 0: Acuerdos (juntos)
- [x] Motor: Phaser 3 + TypeScript + Vite
- [x] Contratos en `src/shared/` (`config.ts`, `types.ts`, `events.ts`, `scenes.ts`)
- [ ] Revisar y ajustar las reglas: duración, repintado, máximo de jugadores, empate
- [ ] Jose: hacer fork y sincronizarlo (ver `docs/FLUJO_DE_TRABAJO.md`)

## 🧚 Thais: Mundo, UI y flujo
Carpetas: `src/scenes/`, `src/world/`, `src/ui/`, `assets/`

- [x] T1. Esqueleto y escenas: Boot, MainMenu, PlayerSelect, Game, Results
- [x] T2. Bosque geométrico: fondo, límites, árboles (círculos), rocas (polígonos)
- [x] T3. Reparto de flores (`planFlowers`): posiciones válidas para las `Flower` de Jose
- [x] T4. Selección de jugadores: cada uno elige su color
- [x] T5. HUD: temporizador y marcador por color (escucha `SCORE_CHANGED`)
- [x] T6. Resultados: ranking y revancha
- [x] T7. Pausa y reinicio
- [x] T8. `AssetRegistry`: formas hoy, sprites mañana
- [x] T9. Audio con placeholders
- [x] T10. Partículas al pintar (escucha `FLOWER_PAINTED`)
- [ ] T11. Revisar y mergear los PRs de Jose

## 🧚‍♂️ Jose: Gameplay
Carpetas: `src/entities/`, `src/systems/`

- [x] J1. `Fairy` (implementa `IFairy`): círculo del color del hada con alas triangulares
- [x] J2. Movimiento por jugador usando `PLAYER_KEYS`
- [x] J3. `Flower` (implementa `IFlower`): estados neutral (blanca/gris) y pintada
- [x] J4. Hechizo: área `SPELL.radius`, cooldown `SPELL.cooldownMs`, emite `SPELL_CAST`
- [x] J5. Pintar flores en el área, emite `FLOWER_PAINTED`
- [x] J6. Repintado y protección temporal (`FLOWER.protectionMs`)
- [x] J7. `ScoreSystem`: emite `SCORE_CHANGED`
- [x] J8. Colisiones con límites y entre hadas
- [x] J9. (Extra) Power-ups
- [x] J10. Tests de puntuación y reglas
- [x] J11. IA de hada rival: hadas CPU que buscan grupos de flores, roban, cogen power-ups y esquivan obstáculos

### Integración (hecha)
`GameScene` crea el bosque (Thais), reparte las flores con `planFlowers` evitando obstáculos y las esquinas de salida, y se lo pasa a `Gameplay` (Jose). El HUD, las partículas y el sonido escuchan los eventos que emite el gameplay.

## Primer hito: partida jugable mínima
Thais T2–T3 + Jose J1–J5. Luego integramos juntos en `GameScene` (ver los `TODO`).

## Fase 2
| Tarea | Responsable |
|---|---|
| ~~Integrar entidades en `GameScene`~~ ✅ | Thais + Jose |
| Balance | Thais + Jose |
| ~~IA de hada rival~~ ✅ (J11) | Jose |
| Sprites reales | Thais |
| Multijugador online: red/servidor | Jose |
| Multijugador online: lobby/UI | Thais |
| Build y despliegue | Thais |
