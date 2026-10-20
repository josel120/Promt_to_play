import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, Rooms } from './rooms.mjs';

const conn = () => {
  const inbox = [];
  return { inbox, send: (m) => inbox.push(m), last: () => inbox[inbox.length - 1] };
};

describe('salas online', () => {
  it('crear una sala da un código de 4 letras y el id 0 al host', () => {
    const rooms = new Rooms();
    const host = conn();
    rooms.handle(host, { t: 'create' });
    expect(host.last()).toMatchObject({ t: 'created', you: 0 });
    expect(host.last().room).toMatch(/^[A-Z]{4}$/);
  });

  it('los invitados reciben ids nuevos y el host se entera', () => {
    const rooms = new Rooms();
    const host = conn();
    const guest = conn();
    rooms.handle(host, { t: 'create' });
    rooms.handle(guest, { t: 'join', room: host.last().room.toLowerCase() });
    expect(guest.last()).toMatchObject({ t: 'joined', you: 1 });
    expect(host.last()).toEqual({ t: 'peer-joined', id: 1 });
  });

  it('sala inexistente o llena da error', () => {
    const rooms = new Rooms();
    const host = conn();
    rooms.handle(host, { t: 'create' });
    const code = host.last().room;
    const lost = conn();
    rooms.handle(lost, { t: 'join', room: 'ZZZZ' });
    expect(lost.last()).toEqual({ t: 'error', reason: 'no-room' });
    for (let i = 1; i < MAX_PLAYERS; i++) rooms.handle(conn(), { t: 'join', room: code });
    const late = conn();
    rooms.handle(late, { t: 'join', room: code });
    expect(late.last()).toEqual({ t: 'error', reason: 'full' });
  });

  it('el host habla con los invitados y cada invitado solo con el host', () => {
    const rooms = new Rooms();
    const [host, a, b] = [conn(), conn(), conn()];
    rooms.handle(host, { t: 'create' });
    const room = host.last().room;
    rooms.handle(a, { t: 'join', room });
    rooms.handle(b, { t: 'join', room });
    rooms.handle(host, { t: 'send', to: 'guests', data: { k: 'snap' } });
    expect(a.last()).toEqual({ t: 'msg', from: 0, data: { k: 'snap' } });
    expect(b.last()).toEqual({ t: 'msg', from: 0, data: { k: 'snap' } });
    const before = b.inbox.length;
    rooms.handle(a, { t: 'send', to: 'host', data: { k: 'input' } });
    rooms.handle(a, { t: 'send', to: 'guests', data: { k: 'trampa' } });
    expect(host.last()).toEqual({ t: 'msg', from: 1, data: { k: 'input' } });
    expect(b.inbox.length).toBe(before);
  });

  it('si se va el host la sala se cierra; si se va un invitado se avisa', () => {
    const rooms = new Rooms();
    const [host, a, b] = [conn(), conn(), conn()];
    rooms.handle(host, { t: 'create' });
    const room = host.last().room;
    rooms.handle(a, { t: 'join', room });
    rooms.handle(b, { t: 'join', room });
    rooms.leave(a);
    expect(host.last()).toEqual({ t: 'peer-left', id: 1 });
    rooms.leave(host);
    expect(b.last()).toEqual({ t: 'room-closed' });
    expect(rooms.size).toBe(0);
  });

  it('ignora mensajes raros', () => {
    const rooms = new Rooms();
    expect(() => rooms.handle(conn(), null)).not.toThrow();
    expect(() => rooms.handle(conn(), { t: 'send', to: 'host', data: 1 })).not.toThrow();
  });
});
