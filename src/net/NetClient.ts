import { decodeServerMessage, type ClientMessage, type GameMessage, type ServerMessage } from './protocol';

/** Conexión WebSocket con el servidor de salas. */
export class NetClient {
  private readonly listeners = new Set<(msg: ServerMessage) => void>();

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener('message', (event) => {
      const msg = decodeServerMessage(String(event.data));
      if (msg) this.listeners.forEach((fn) => fn(msg));
    });
    ws.addEventListener('close', () => this.listeners.forEach((fn) => fn({ t: 'room-closed' })));
  }

  static connect(url: string): Promise<NetClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(new NetClient(ws)), { once: true });
      ws.addEventListener('error', () => reject(new Error(`No se pudo conectar a ${url}`)), { once: true });
    });
  }

  /** Devuelve una función para dejar de escuchar. */
  on(fn: (msg: ServerMessage) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  send(msg: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  toHost(data: GameMessage): void {
    this.send({ t: 'send', to: 'host', data });
  }

  toGuests(data: GameMessage): void {
    this.send({ t: 'send', to: 'guests', data });
  }

  close(): void {
    this.ws.close();
  }
}
