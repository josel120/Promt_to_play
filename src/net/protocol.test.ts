import { describe, expect, it } from 'vitest';
import { decodeServerMessage, defaultServerUrl, serverUrl, sampleFairies, type Snapshot } from './protocol';
import { FollowControls, RemoteControls } from './remoteControls';

const snap = (x: number): Snapshot => ({ fairies: [{ id: 0, x, y: 0, speed: 1, boosted: false }], powerUps: [] });

describe('protocolo online', () => {
  it('solo acepta mensajes del servidor con un tipo conocido', () => {
    expect(decodeServerMessage('{"t":"joined","room":"ABCD","you":1}')).toEqual({ t: 'joined', room: 'ABCD', you: 1 });
    expect(decodeServerMessage('{"t":"hack"}')).toBeNull();
    expect(decodeServerMessage('no es json')).toBeNull();
  });

  it('interpola la posición entre dos instantáneas', () => {
    const buffer = [
      { at: 1000, snap: snap(0) },
      { at: 1100, snap: snap(100) },
    ];
    expect(sampleFairies(buffer, 1050).get(0)?.x).toBe(50);
    expect(sampleFairies(buffer, 900).get(0)?.x).toBe(0);
    expect(sampleFairies(buffer, 5000).get(0)?.x).toBe(100);
    expect(sampleFairies([], 0).size).toBe(0);
  });

  it('usa el proxy /net de la misma web', () => {
    expect(defaultServerUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/net');
    expect(defaultServerUrl({ protocol: 'https:', host: 'hadas.app' })).toBe('wss://hadas.app/net');
  });

  it('elige ?server=, luego el servidor del build, luego el proxy /net', () => {
    const loc = { protocol: 'https:', host: 'hadas.app', search: '' };
    expect(serverUrl(loc, undefined)).toBe('wss://hadas.app/net');
    expect(serverUrl(loc, 'wss://relay.onrender.com')).toBe('wss://relay.onrender.com');
    expect(serverUrl({ ...loc, search: '?online=ABCD&server=ws://localhost:8787' }, 'wss://relay.onrender.com')).toBe(
      'ws://localhost:8787',
    );
  });
});

describe('controles en red', () => {
  it('el host convierte el contador de hechizos en lanzamientos, sin repetir', () => {
    const c = new RemoteControls();
    c.receive({ dx: 1, dy: 1, casts: 2 });
    expect(Math.hypot(c.direction().x, c.direction().y)).toBeCloseTo(1);
    expect([c.wantsToCast(), c.wantsToCast(), c.wantsToCast()]).toEqual([true, true, false]);
    c.receive({ dx: 0, dy: 0, casts: 2 });
    expect(c.wantsToCast()).toBe(false);
    c.receive({ dx: 0, dy: 0, casts: 50 });
    expect([c.wantsToCast(), c.wantsToCast(), c.wantsToCast(), c.wantsToCast()]).toEqual([true, true, true, false]);
  });

  it('el invitado vuela hacia la posición del host y se para al llegar', () => {
    const self = { position: { x: 0, y: 0 } };
    const f = new FollowControls(self);
    expect(f.direction()).toEqual({ x: 0, y: 0 });
    f.target = { x: 10, y: 0 };
    expect(f.direction()).toEqual({ x: 1, y: 0 });
    f.target = { x: 2, y: 0 };
    expect(f.direction()).toEqual({ x: 0, y: 0 });
  });
});
