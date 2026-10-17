# Flujo de trabajo

- **Repo principal:** `thaisrodriguez/Promt_to_play` (Thais)
- **Fork:** `<usuario-de-jose>/Promt_to_play` (Jose)

## Jose: configuración inicial (una vez)
```bash
git clone https://github.com/<usuario-de-jose>/Promt_to_play.git
cd Promt_to_play
git remote add upstream https://github.com/thaisrodriguez/Promt_to_play.git
npm install
```

## Cada día, antes de empezar
```bash
git switch main
git pull upstream main
git push origin main
```

## Para cada tarea
1. `git switch -c feature/j1-fairy` (rama nombrada con el id de la tarea)
2. Commits pequeños. Toca solo tus carpetas.
3. `npm test && npm run build` antes de subir
4. `git push origin feature/j1-fairy` y abre un PR hacia `thaisrodriguez/Promt_to_play:main`
5. Thais revisa y mergea

## Reglas
- **`src/shared/`** se cambia en un PR propio y avisando al otro.
- Si necesitas tocar una carpeta del otro, coméntalo antes.
- `GameScene.ts` es el punto de integración: cambios pequeños y coordinados.
