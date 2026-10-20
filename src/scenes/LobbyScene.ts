import Phaser from 'phaser';
import { FAIRY_COLORS, GAME_HEIGHT, GAME_WIDTH, MAX_PLAYERS, type FairyColorName } from '../shared/config';
import type { LobbyProvider, LobbyRoom } from '../shared/lobby';
import { SceneKeys } from '../shared/scenes';
import type { PlayerConfig } from '../shared/types';
import { MockLobbyProvider } from '../ui/lobby/MockLobbyProvider';
import { NetLobbyProvider } from '../ui/lobby/NetLobbyProvider';
import { TextureKeys } from '../visuals/AssetRegistry';

type Step = 'menu' | 'join' | 'room';

const COLOR_NAMES = Object.keys(FAIRY_COLORS) as FairyColorName[];
const CODE_LENGTH = 4;

/**
 * Lobby del multijugador online: crear sala, unirse con código y que el host arranque.
 * Habla con la red solo a través del contrato LobbyProvider (src/shared/lobby.ts):
 * NetLobbyProvider con el servidor real (`npm run server`) o MockLobbyProvider como demo local.
 */
export class LobbyScene extends Phaser.Scene {
  private provider: LobbyProvider = new MockLobbyProvider();
  private step: Step = 'menu';
  private room?: LobbyRoom;
  private typedCode = '';
  private joinError = '';
  private menuNote = '';
  private starting = false;
  private drawn: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SceneKeys.Lobby);
  }

  create(): void {
    this.step = 'menu';
    this.room = undefined;
    this.typedCode = '';
    this.joinError = '';
    this.menuNote = '';
    this.starting = false;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.provider.leaveRoom());
    this.input.keyboard?.on('keydown', this.onKey, this);

    this.render();
  }

  /** Enchufa la escena a un provider nuevo (mock local o red real). */
  private useProvider(provider: LobbyProvider): void {
    this.provider.leaveRoom();
    this.provider = provider;
    provider.onUpdate((room) => {
      this.room = room;
      if (this.step === 'room') this.render();
    });
    provider.onStart((room) => this.startGame(room));
    provider.onClosed?.(() => {
      this.menuNote = 'La sala se cerró';
      this.room = undefined;
      this.step = 'menu';
      this.render();
    });
  }

  private get isNet(): boolean {
    return this.provider instanceof NetLobbyProvider;
  }

  private render(): void {
    this.clearView();
    if (this.step === 'menu') this.renderMenu();
    else if (this.step === 'join') this.renderJoin();
    else this.renderRoom();
  }

  private clearView(): void {
    this.drawn.forEach((o) => o.destroy());
    this.drawn = [];
  }

  private text(x: number, y: number, content: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, content, style).setOrigin(0.5);
    this.drawn.push(t);
    return t;
  }

  // --- Paso 1: crear o unirse ---

  private renderMenu(): void {
    const cx = GAME_WIDTH / 2;
    this.text(cx, 210, 'Multijugador online', { fontSize: '44px', color: '#ffffff' });
    this.text(cx, 315, 'C · Crear una sala', { fontSize: '30px', color: '#cfe8d5' });
    this.text(cx, 370, 'U · Unirse con código', { fontSize: '30px', color: '#cfe8d5' });
    this.text(cx, 425, 'D · Demo local (sin servidor)', { fontSize: '24px', color: '#9fc9a8' });
    if (this.menuNote) this.text(cx, 490, this.menuNote, { fontSize: '20px', color: '#ff8a8a' });
    this.text(cx, GAME_HEIGHT - 50, 'ESC · Volver al menú', { fontSize: '18px', color: '#9fc9a8' });
  }

  // --- Paso 2: código de sala ---

  private renderJoin(): void {
    const cx = GAME_WIDTH / 2;
    this.text(cx, 230, 'Escribe el código de la sala', { fontSize: '36px', color: '#ffffff' });

    const slots = this.typedCode.padEnd(CODE_LENGTH, '_').split('').join('  ');
    this.text(cx, 330, slots, { fontSize: '56px', color: '#ffd23f', fontStyle: 'bold' });

    if (this.joinError) this.text(cx, 400, this.joinError, { fontSize: '20px', color: '#ff8a8a' });

    this.text(cx, GAME_HEIGHT - 90, `${CODE_LENGTH} letras · ENTER para unirte`, { fontSize: '20px', color: '#cfe8d5' });
    this.text(cx, GAME_HEIGHT - 50, 'ESC · Atrás', { fontSize: '18px', color: '#9fc9a8' });
  }

  // --- Paso 3: dentro de la sala ---

  private renderRoom(): void {
    const room = this.room;
    if (!room) return;
    const cx = GAME_WIDTH / 2;

    this.text(cx, 70, `Sala  ${room.code.split('').join(' ')}`, { fontSize: '40px', color: '#ffd23f', fontStyle: 'bold' });
    this.text(cx, 115, 'Comparte el código para que se unan', { fontSize: '18px', color: '#9fc9a8' });

    const me = room.players.find((p) => p.local);
    const rowHeight = 78;
    const top = 170;
    room.players.forEach((player, i) => {
      const y = top + i * rowHeight;
      const panel = this.add
        .rectangle(cx, y, 620, 64, 0x173b24)
        .setStrokeStyle(3, player.local ? 0x4da6ff : 0x2e6b41);
      this.drawn.push(panel);

      if (player.color) {
        const fairy = this.add.image(cx - 260, y, TextureKeys.fairy(player.color)).setScale(1.1);
        this.drawn.push(fairy);
      }

      const crown = player.host ? '★ ' : '';
      const suffix = player.local ? ' (tú)' : '';
      this.drawn.push(
        this.add
          .text(cx - 220, y, `${crown}${player.name}${suffix}`, { fontSize: '24px', color: '#ffffff' })
          .setOrigin(0, 0.5),
      );

      const ready = player.ready || player.host;
      this.drawn.push(
        this.add
          .text(cx + 270, y, ready ? 'Lista ✓' : 'Esperando…', {
            fontSize: '20px',
            color: ready ? '#7dff9b' : '#9fc9a8',
          })
          .setOrigin(1, 0.5),
      );
    });

    for (let i = room.players.length; i < MAX_PLAYERS; i++) {
      const y = top + i * rowHeight;
      this.drawn.push(this.add.text(cx, y, '· · ·', { fontSize: '24px', color: '#2e6b41' }).setOrigin(0.5));
    }

    const hints: string[] = [];
    if (this.isNet) {
      hints.push(me?.host ? (this.canStart(room) ? 'ENTER · empezar partida' : 'Esperando hadas…') : 'Esperando a que el host empiece…');
    } else {
      if (me && !me.ready) hints.push('← → color · ESPACIO lista');
      else if (me) hints.push('ESPACIO · deshacer lista');
      if (me?.host && this.canStart(room)) hints.push('ENTER · empezar partida');
    }
    this.text(cx, GAME_HEIGHT - 110, hints.join('    ·    ') || 'Esperando a las demás hadas…', {
      fontSize: '20px',
      color: '#cfe8d5',
    });
    if (!this.isNet) {
      this.text(cx, GAME_HEIGHT - 70, 'Demo local: las hadas remotas las controla la IA', {
        fontSize: '16px',
        color: '#9fc9a8',
      });
    }
    this.text(cx, GAME_HEIGHT - 40, 'ESC · Salir de la sala', { fontSize: '18px', color: '#9fc9a8' });
  }

  /** El host puede arrancar cuando hay al menos 2 jugadoras y todas las demás están listas. */
  private canStart(room: LobbyRoom): boolean {
    return room.players.length >= 2 && room.players.filter((p) => !p.host).every((p) => p.ready);
  }

  // --- Teclado ---

  private onKey(event: KeyboardEvent): void {
    if (this.starting) return;
    if (this.step === 'menu') this.onMenuKey(event);
    else if (this.step === 'join') this.onJoinKey(event);
    else this.onRoomKey(event);
  }

  private onMenuKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      this.scene.start(SceneKeys.MainMenu);
      return;
    }
    if (key === 'c' || key === 'd') {
      this.useProvider(key === 'd' ? new MockLobbyProvider() : new NetLobbyProvider());
      this.menuNote = '';
      this.provider.createRoom('Tú').then(
        (room) => {
          this.room = room;
          this.step = 'room';
          this.render();
        },
        () => {
          this.menuNote = 'No hay servidor online. Arráncalo con: npm run server';
          this.render();
        },
      );
    } else if (key === 'u') {
      this.useProvider(new NetLobbyProvider());
      this.step = 'join';
      this.typedCode = '';
      this.joinError = '';
      this.render();
    }
  }

  private onJoinKey(event: KeyboardEvent): void {
    const key = event.key;
    if (key === 'Escape') {
      this.step = 'menu';
      return this.render();
    }
    if (key === 'Backspace') {
      this.typedCode = this.typedCode.slice(0, -1);
      return this.render();
    }
    if (key === 'Enter' && this.typedCode.length === CODE_LENGTH) {
      this.provider
        .joinRoom(this.typedCode, 'Tú')
        .then((room) => {
          this.room = room;
          this.step = 'room';
          this.render();
        })
        .catch((err: Error) => {
          this.joinError = err.message;
          this.render();
        });
      return;
    }
    if (/^[a-zA-Z]$/.test(key) && this.typedCode.length < CODE_LENGTH) {
      this.typedCode += key.toUpperCase();
      this.render();
    }
  }

  private onRoomKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.provider.leaveRoom();
      this.room = undefined;
      this.step = 'menu';
      return this.render();
    }
    const me = this.room?.players.find((p) => p.local);
    if (!me) return;

    if (event.key === 'Enter' && me.host && this.room && this.canStart(this.room)) {
      this.provider.requestStart();
      return;
    }
    // En la red real no hay ready ni elección de color: solo la demo local las usa.
    if (this.isNet) return;
    if (event.key === ' ' || event.code === 'Space') {
      this.provider.setReady(!me.ready);
    } else if (!me.ready && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      this.cycleColor(me.color, event.key === 'ArrowRight' ? 1 : -1);
    }
  }

  private cycleColor(current: FairyColorName | null, direction: 1 | -1): void {
    const taken = new Set(this.room?.players.filter((p) => !p.local).map((p) => p.color));
    let next = current ? COLOR_NAMES.indexOf(current) : direction > 0 ? -1 : 0;
    for (let i = 0; i < COLOR_NAMES.length; i++) {
      next = (next + direction + COLOR_NAMES.length) % COLOR_NAMES.length;
      if (!taken.has(COLOR_NAMES[next])) {
        this.provider.setColor(COLOR_NAMES[next]);
        return;
      }
    }
  }

  // --- Arranque ---

  private startGame(room: LobbyRoom): void {
    this.starting = true;
    if (this.isNet) {
      this.scene.start(SceneKeys.Game, (this.provider as NetLobbyProvider).gameData());
      return;
    }
    // Demo local: las hadas remotas juegan como CPU.
    const players: PlayerConfig[] = room.players.map((p, id) => ({
      id,
      color: p.color ?? COLOR_NAMES[id % COLOR_NAMES.length],
      keysIndex: id,
      ...(!p.local && { cpu: true }),
    }));
    this.scene.start(SceneKeys.Game, { players });
  }
}
