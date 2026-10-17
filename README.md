# Promt_to_play: Hadas del Bosque 🧚

Juego multijugador en el que hadas de colores encantan las flores blancas y grises del bosque.
Gana el hada con más flores de su color al acabar el tiempo.

Por ahora todo (hadas, flores, bosque) se dibuja con formas geométricas. Se reemplazarán por sprites más adelante.

## Stack
- [Phaser 3](https://phaser.io/) + TypeScript
- [Vite](https://vitejs.dev/) (servidor de desarrollo y build)
- [Vitest](https://vitest.dev/) (tests)

## Empezar
```bash
npm install
npm run dev        # abre http://localhost:5173
npm test           # tests
npm run build      # typecheck + build de producción
```

## Estructura
```
src/
  shared/    Contratos compartidos (config, tipos, eventos). Se cambian solo de común acuerdo.
  scenes/    Escenas del juego              → Thais
  world/     Bosque, obstáculos, spawner    → Thais
  ui/        HUD, menús                     → Thais
  entities/  Hada, Flor                     → Jose
  systems/   Hechizo, puntuación, reglas    → Jose
assets/      Sprites y sonidos              → Thais
docs/        Plan de tareas y flujo de trabajo
```

- Plan y reparto de tareas: [docs/TAREAS.md](docs/TAREAS.md)
- Flujo de Git (repo principal + fork): [docs/FLUJO_DE_TRABAJO.md](docs/FLUJO_DE_TRABAJO.md)
