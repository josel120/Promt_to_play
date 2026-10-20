import type Phaser from 'phaser';
import { FAIRY_COLORS, type FairyColorName } from '../shared/config';
import { SceneKeys } from '../shared/scenes';
import type { PlayerConfig } from '../shared/types';
import type { GameSceneData } from '../scenes/GameScene';
import { NetClient } from './NetClient';
import { serverUrl } from './protocol';

const COLORS = Object.keys(FAIRY_COLORS) as FairyColorName[];

/**
 * Lobby provisional (el de verdad es de Thais): `?online=host` crea una sala y `?online=ABCD` se une.
 * `?server=wss://...` cambia el servidor (ver serverUrl en protocol.ts).
 */
export function launchOnlineFromUrl(game: Phaser.Game): void {
  const params = new URLSearchParams(location.search);
  const online = params.get('online');
  if (!online) return;
  const panel = new Panel();
  panel.say('Conectando con el bosque online…');
  NetClient.connect(serverUrl(location))
    .then((client) => (online.toLowerCase() === 'host' ? hostLobby(game, client, panel) : guestLobby(game, client, panel, online)))
    .catch(() => panel.say('No hay servidor online. Arráncalo con: npm run server'));
}

function hostLobby(game: Phaser.Game, client: NetClient, panel: Panel): void {
  const guests: number[] = [];
  let room = '';
  const start = () => {
    off();
    const netIds = [0, ...guests];
    const seats = Object.fromEntries(netIds.map((netId, i) => [netId, i]));
    const players: PlayerConfig[] = netIds.map((_, i) => ({ id: i, color: COLORS[i], keysIndex: 0 }));
    panel.close();
    startGame(game, { players, online: { role: 'host', client, localId: 0, seats } });
  };
  const render = () => {
    const link = `${location.origin}${location.pathname}?online=${room}`;
    const text = `Sala ${room}\nHadas conectadas: ${guests.length + 1}/4\nInvita con este enlace:`;
    panel.say(text, { link, button: guests.length > 0 ? { label: '¡Empezar partida!', onClick: start } : undefined });
  };
  const off = client.on((msg) => {
    if (msg.t === 'created') room = msg.room;
    else if (msg.t === 'peer-joined') guests.push(msg.id);
    else if (msg.t === 'peer-left' && guests.includes(msg.id)) guests.splice(guests.indexOf(msg.id), 1);
    else if (msg.t === 'room-closed') return panel.say('Se perdió la conexión con el servidor.');
    else return;
    render();
  });
  client.send({ t: 'create' });
}

function guestLobby(game: Phaser.Game, client: NetClient, panel: Panel, room: string): void {
  let you = -1;
  const off = client.on((msg) => {
    if (msg.t === 'joined') {
      you = msg.you;
      panel.say(`Sala ${msg.room}\n¡Dentro! Esperando a que el host empiece…`);
    } else if (msg.t === 'error') {
      panel.say(msg.reason === 'full' ? 'La sala está llena (máximo 4 hadas).' : `No existe la sala ${room.toUpperCase()}.`);
    } else if (msg.t === 'room-closed') {
      panel.say('El host cerró la sala.');
    } else if (msg.t === 'msg' && msg.data.k === 'start') {
      off();
      panel.close();
      const { players, flowerPositions, seats } = msg.data;
      startGame(game, { players, online: { role: 'guest', client, localId: seats[you], seats, flowerPositions } });
    }
  });
  client.send({ t: 'join', room });
}

function startGame(game: Phaser.Game, data: GameSceneData): void {
  const active = game.scene.getScenes(true)[0];
  if (!active) {
    setTimeout(() => startGame(game, data), 50);
    return;
  }
  active.scene.start(SceneKeys.Game, data);
}

/** Cartelito HTML encima del juego. Todo con textContent: nada del enlace o la URL se interpreta como HTML. */
class Panel {
  private readonly root = document.createElement('div');

  constructor() {
    Object.assign(this.root.style, {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%)',
      padding: '16px 24px',
      borderRadius: '16px',
      background: 'rgba(13, 31, 20, 0.92)',
      border: '3px solid #ff5fa2',
      color: '#ffffff',
      font: '18px "Comic Sans MS", "Comic Neue", cursive',
      textAlign: 'center',
      whiteSpace: 'pre-line',
      zIndex: '10',
      maxWidth: '90vw',
    });
    document.body.appendChild(this.root);
  }

  say(text: string, extra: { link?: string; button?: { label: string; onClick: () => void } } = {}): void {
    this.root.replaceChildren();
    const p = document.createElement('div');
    p.textContent = text;
    this.root.appendChild(p);
    if (extra.link) {
      const a = document.createElement('a');
      a.href = extra.link;
      a.target = '_blank';
      a.textContent = extra.link;
      a.style.color = '#ffd23f';
      this.root.appendChild(a);
    }
    if (extra.button) {
      const b = document.createElement('button');
      b.textContent = extra.button.label;
      Object.assign(b.style, { display: 'block', margin: '12px auto 0', padding: '8px 20px', font: 'inherit', borderRadius: '12px', border: 'none', background: '#ff5fa2', color: '#fff', cursor: 'pointer' });
      b.onclick = extra.button.onClick;
      this.root.appendChild(b);
    }
  }

  close(): void {
    this.root.remove();
  }
}
