// Salas del multijugador online. Sin red ni ws: cada conexión es solo `{ send(msg) }`, así se testea fácil.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const MAX_PLAYERS = 4;

export class Rooms {
  constructor(rng = Math.random) {
    this.rooms = new Map();
    this.members = new Map();
    this.rng = rng;
  }

  get size() {
    return this.rooms.size;
  }

  handle(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'create') this.create(conn);
    else if (msg.t === 'join') this.join(conn, String(msg.room ?? '').toUpperCase());
    else if (msg.t === 'send') this.relay(conn, msg.to, msg.data);
  }

  create(conn) {
    this.leave(conn);
    let code;
    do {
      code = Array.from({ length: 4 }, () => LETTERS[Math.floor(this.rng() * LETTERS.length)]).join('');
    } while (this.rooms.has(code));
    const room = { code, host: conn, guests: new Map(), nextId: 1 };
    this.rooms.set(code, room);
    this.members.set(conn, { room, id: 0 });
    conn.send({ t: 'created', room: code, you: 0 });
  }

  join(conn, code) {
    const room = this.rooms.get(code);
    if (!room) return conn.send({ t: 'error', reason: 'no-room' });
    if (room.guests.size + 1 >= MAX_PLAYERS) return conn.send({ t: 'error', reason: 'full' });
    this.leave(conn);
    const id = room.nextId++;
    room.guests.set(id, conn);
    this.members.set(conn, { room, id });
    conn.send({ t: 'joined', room: code, you: id });
    room.host.send({ t: 'peer-joined', id });
  }

  /** El host habla con todos los invitados; cada invitado solo con el host. */
  relay(conn, to, data) {
    const member = this.members.get(conn);
    if (!member) return;
    const { room, id } = member;
    const out = { t: 'msg', from: id, data };
    if (id === 0 && to === 'guests') room.guests.forEach((g) => g.send(out));
    else if (id !== 0 && to === 'host') room.host.send(out);
  }

  /** Si se va el host, la sala se cierra; si se va un invitado, se avisa al host. */
  leave(conn) {
    const member = this.members.get(conn);
    if (!member) return;
    this.members.delete(conn);
    const { room, id } = member;
    if (id === 0) {
      room.guests.forEach((g) => {
        this.members.delete(g);
        g.send({ t: 'room-closed' });
      });
      this.rooms.delete(room.code);
    } else {
      room.guests.delete(id);
      room.host.send({ t: 'peer-left', id });
    }
  }
}
