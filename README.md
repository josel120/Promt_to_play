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

## Controles
| Hada | Mover | Hechizo |
|---|---|---|
| J1 | W A S D | Espacio |
| J2 | Flechas | Enter |
| J3 | I J K L | U |
| J4 | 8 4 5 6 | 0 |

Coge las estrellas que aparecen: **Café de rocío** (más velocidad), **Mega hechizo** (más radio) y **Polvo de hada** (casi sin enfriamiento).

Antes de la partida eliges cuántas hadas humanas juegan (1–4) y cuántas hadas CPU rivales se suman. Con 1 humana hay al menos una CPU. Cada jugador elige su color con izquierda/derecha y confirma con su tecla de hechizo. El primero en elegir un color se lo queda; las CPU reciben los que sobran.

## Multijugador online (J12)
```bash
npm run server     # servidor de salas en ws://localhost:8787
npm run dev        # Vite reenvía /net al servidor
```
- Host: abre `http://localhost:5173/?online=host` y comparte el enlace de la sala.
- Invitados: `http://localhost:5173/?online=ABCD` (máximo 4 hadas). Todos juegan con WASD + Espacio.
- El host simula la partida; los invitados mandan sus teclas y dibujan lo que reciben (`src/net/`).
- `?server=wss://...` usa otro servidor. El lobby con botones de verdad es de Thais; por ahora es un cartel provisional.

## Estructura
```
src/
  shared/    Contratos compartidos (config, tipos, eventos). Se cambian solo de común acuerdo.
  scenes/    Escenas del juego              → Thais
  world/     Bosque, obstáculos, reparto de flores → Thais
  ui/        HUD, efectos, ranking          → Thais
  visuals/   AssetRegistry (formas → sprites) → Thais
  audio/     Sonidos y música provisionales → Thais
  entities/  Hada, Flor                     → Jose
  systems/   Hechizo, puntuación, reglas, IA rival → Jose
assets/      Sprites y sonidos              → Thais
docs/        Plan de tareas y flujo de trabajo
```

## Otras teclas
- **ESC / P**: pausa (continuar, reiniciar, terminar, menú)
- **M**: silenciar o activar el sonido

## Cambiar formas por sprites
Copia el PNG en `assets/sprites/` y añade su clave en `SPRITE_MANIFEST` (`src/visuals/AssetRegistry.ts`). No hace falta tocar nada más.

- Plan y reparto de tareas: [docs/TAREAS.md](docs/TAREAS.md)
- Flujo de Git (repo principal + fork): [docs/FLUJO_DE_TRABAJO.md](docs/FLUJO_DE_TRABAJO.md)

## Despliegue
Cada push a `main` corre tests, compila y publica en GitHub Pages (workflow `deploy.yml`):
**https://thaisrodriguez.github.io/Promt_to_play/**

### Online de verdad (sin `npm run server` local)
GitHub Pages solo sirve archivos: el servidor de salas (`server/relay.mjs`) tiene que vivir en otro sitio con WebSocket.
1. [Render](https://render.com) → **New → Blueprint** → este repo (usa `render.yaml`, plan gratis). Queda en `https://<nombre>.onrender.com`.
2. GitHub → **Settings → Secrets and variables → Actions → Variables** → `VITE_SERVER_URL` = `wss://<nombre>.onrender.com`.
3. Volver a correr el workflow *Desplegar a GitHub Pages* (o hacer push a `main`).

Para probar sin redeploy: `https://thaisrodriguez.github.io/Promt_to_play/?server=wss://<nombre>.onrender.com`.
El plan gratis de Render se duerme tras 15 min sin uso: la primera conexión puede tardar ~1 min.
