// Servidor del multijugador online: `npm run server` (puerto 8787, o PORT).
import { WebSocketServer } from 'ws';
import { Rooms } from './rooms.mjs';

const port = Number(process.env.PORT ?? 8787);
const wss = new WebSocketServer({ port, maxPayload: 64 * 1024 });
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

console.log(`🧚 Servidor de Hadas del Bosque en ws://localhost:${port}`);
