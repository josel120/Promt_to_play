// Servidor del multijugador online: `npm run server` (puerto 8787, o PORT).
// HTTP GET responde "ok" (health check del hosting); los WebSocket se aceptan en cualquier ruta (/ o /net).
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { Rooms } from './rooms.mjs';

const port = Number(process.env.PORT ?? 8787);
const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('ok');
});
const wss = new WebSocketServer({ server: http, maxPayload: 64 * 1024 });
const rooms = new Rooms();

wss.on('connection', (ws) => {
  const conn = { send: (msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg)) };
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    rooms.handle(conn, msg);
  });
  ws.on('close', () => rooms.leave(conn));
});

// Render/Fly cortan conexiones inactivas: un ping cada 25 s las mantiene vivas.
setInterval(() => wss.clients.forEach((ws) => ws.ping()), 25_000).unref();

http.listen(port, () => console.log(`🧚 Servidor de Hadas del Bosque en ws://localhost:${port}`));
