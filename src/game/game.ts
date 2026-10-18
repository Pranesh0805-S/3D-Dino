import * as THREE from 'three';
import { CFG, hiKeyFor } from './config';
import { Input } from './input';
import { Player } from './player';
import { PORTAL, Portal } from './portal';
import { Rules, type Mode } from './rules';
import { Sfx } from './audio';
import { Sky } from './sky';
import { Theme } from './theme';
import { World } from './world';

type State = 'idle' | 'running' | 'paused' | 'dead';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pad = (n: number) => String(n).padStart(5, '0');

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  private pull = 0;
  readonly theme = new Theme();
  readonly rules = new Rules();
  readonly world: World;
  readonly player: Player;
  readonly input: Input;
  private sky = new Sky();
  private sfx = new Sfx();
  private fog: THREE.Fog;

  state: State = 'idle';
  speed = 0;
  dist = 0;
  time = 0;
  score = 0;
  hi = 0;
  private lastMilestone = 0;
  private calloutT = 0;
  private runBest = 0; // HI when this run started
  private hiShown = false;
  private deathsSinceAd = 0;
  private lastAdAt = 0;
  private adBusy = false;
  private flashT = 0;
  private deadT = 0;
  private lastTxt = '';
  private camLook = new THREE.Vector3(0, 1.4, -7);
  private last = performance.now();

  private el = {
    score: $('score'), hi: $('hi'), hint: $('hint'), over: $('gameover'),
    hintTitle: document.querySelector('#hint .blink') as HTMLElement,
    share: $('share'), mode: $('mode'), tag: $('tag'), callout: $('callout'),
    modeHint: $('mode-hint'), snd: $('snd'), pauseBtn: $('pausebtn'), newHi: $('newhi'),
  };

  constructor(canvas: HTMLCanvasElement, app: HTMLElement, private portal: Portal = new Portal()) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);

    this.scene.background = this.theme.bg;
    this.fog = new THREE.Fog(this.theme.bg, 45, 125);
    this.scene.fog = this.fog;
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-4, 9, 6);
    this.scene.add(sun);

    this.scene.add(this.camera);
    this.camera.add(this.sky.group);
    this.camera.position.set(5.6, 3.9, 8);

    this.world = new World(this.theme, this.rules);
    this.player = new Player(this.theme);
    this.scene.add(this.world.group, this.player.root, this.player.shadowMesh);
    this.player.onJump = () => this.sfx.jump();

    this.input = new Input(app);
    this.input.onJumpPress = () => this.onPress();
    this.input.onJumpRelease = () => this.player.releaseJump();
    this.portal.onMuteChange = (silent) => { this.sfx.suspended = silent; };
    this.input.onMode = () => this.toggleMode();
    this.input.onPause = () => this.pause();
    this.el.pauseBtn.addEventListener('click', () => { this.pause(); this.el.pauseBtn.blur(); });
    this.el.snd.addEventListener('click', () => { this.toggleSound(); this.el.snd.blur(); });
    try { this.sfx.muted = localStorage.getItem(CFG.muteKey) === '1'; } catch { /* private mode */ }
    this.syncSoundUi();
    this.rules.onEvent = (m) => this.callout(m);
    this.el.mode.addEventListener('click', () => { this.toggleMode(); this.el.mode.blur(); });

    try { if (localStorage.getItem(CFG.modeKey) === 'hard') this.rules.mode = 'hard'; } catch { /* private mode */ }
    this.loadHi();
    document.body.dataset.state = 'idle';
    this.el.share.addEventListener('click', () => void this.share());
    this.buildRestartIcon();
    this.reset();
    this.syncModeUi();
    this.theme.applyCss();
    this.updateHud(true);

    addEventListener('resize', () => this.resize());
    this.resize();
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'running') this.pause(); });
    addEventListener('blur', () => { if (this.state === 'running') this.pause(); });

    requestAnimationFrame(this.frame);
  }

  // ---------------- state ----------------
  private setState(s: State) {
    const was = this.state;
    this.state = s;
    if (s === 'running' && was !== 'running') this.portal.gameplayStart();
    else if (s !== 'running' && was === 'running') this.portal.gameplayStop();
    document.body.dataset.state = s;
  }

  private reset() {
    this.rules.reset();
    this.world.reset();
    this.player.reset();
    this.speed = 0; this.dist = 0; this.time = 0; this.score = 0;
    this.lastMilestone = 0; this.flashT = 0; this.deadT = 0; this.calloutT = 0;
    this.el.callout.textContent = '';
    this.el.newHi.hidden = true;
    this.theme.setNight(true);
    this.el.over.hidden = true;
    this.el.hintTitle.textContent = 'PRESS SPACE TO START';
    this.el.hint.classList.remove('hidden');
  }

  private onPress() {
    this.sfx.unlock();
    if (this.state === 'idle') {
      this.begin();
      this.player.requestJump();
    } else if (this.state === 'paused') {
      this.setState('running');
      this.last = performance.now();
      this.el.hint.classList.add('hidden');
    } else if (this.state === 'running') {
      this.player.requestJump();
    } else if (this.state === 'dead' && this.deadT > 0.45 && !this.adBusy) {
      void this.restart();
    }
  }

  /** restart after game over; on the portal an ad plays first, but only every few deaths */
  private async restart() {
    this.deathsSinceAd++;
    const due = PORTAL && this.portal.active && this.deathsSinceAd >= 3 && performance.now() - this.lastAdAt > 150_000;
    if (due) {
      this.adBusy = true;
      await this.portal.midgameAd();
      this.adBusy = false;
      this.deathsSinceAd = 0;
      this.lastAdAt = performance.now();
    }
    this.reset();
    this.begin();
  }

  private begin() {
    this.setState('running');
    this.speed = this.rules.startSpeed();
    this.runBest = this.hi;
    this.hiShown = false;
    this.el.hint.classList.add('hidden');
  }

  private pause() {
    if (this.state !== 'running') return;
    this.setState('paused');
    this.el.hintTitle.textContent = 'PAUSED - PRESS SPACE';
    this.el.hint.classList.remove('hidden');
  }

  private die() {
    this.setState('dead');
    this.deadT = 0;
    this.player.dead = true;
    this.sfx.die();
    this.el.newHi.hidden = !(this.score > this.runBest && this.score > 0);
    if (this.score > this.hi) {
      this.hi = this.score;
      try { localStorage.setItem(hiKeyFor(this.rules.mode), String(this.hi)); } catch { /* ignore */ }
    }
    this.el.score.classList.remove('flash');
    this.el.over.hidden = false;
    this.updateHud(true);
  }

  // ---------------- loop ----------------
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  };

  step(dt: number) {
    if (this.theme.update(dt)) {
      this.fog.color.copy(this.theme.bg);
      this.theme.applyCss();
    }

    if (this.state === 'running') {
      this.time += dt;
      this.speed = this.rules.targetSpeed(this.score, this.time);
      this.dist += this.speed * dt;
      this.score = Math.floor(this.dist * CFG.scorePerUnit);

      const ms = Math.floor(this.score / CFG.milestone);
      if (ms > this.lastMilestone) {
        this.lastMilestone = ms;
        this.sfx.point();
        this.flashT = 0.65;
      }
      if (this.runBest > 0 && !this.hiShown && this.score > this.runBest) {
        this.hiShown = true;
        this.portal.happytime();
        this.sfx.point();
        this.callout('NEW HI!');
      }
      this.theme.setNight(Math.floor(this.score / CFG.nightEvery) % 2 === 0);

      this.world.update(dt, this.speed, this.score);
      const supported = this.world.supported();
      this.player.update(dt, this.input, this.speed, supported, true);
      this.player.shadowMesh.visible &&= supported;
      this.sky.update(dt, this.speed, this.theme);
      this.rules.observe(dt, this.score, this.player, this.world.obstacles.list);

      if (!supported && this.player.y <= 0) this.die();
      else if (this.world.collides(this.player.hitbox())) this.die();
    } else {
      if (this.state === 'dead') this.deadT += dt;
      const supported = this.world.supported();
      this.player.update(dt, this.input, 0, supported, false);
      this.player.shadowMesh.visible &&= supported;
      this.sky.update(dt, 0, this.theme);
    }

    this.updateCamera(dt);
    this.updateHud(false, dt);
    if (this.calloutT > 0 && (this.calloutT -= dt) <= 0) this.el.callout.textContent = '';
  }

  // ---------------- sound ----------------
  private toggleSound() {
    this.sfx.muted = !this.sfx.muted;
    try { localStorage.setItem(CFG.muteKey, this.sfx.muted ? '1' : '0'); } catch { /* ignore */ }
    this.syncSoundUi();
    this.sfx.unlock();
    this.sfx.point();
  }

  private syncSoundUi() {
    this.el.snd.textContent = this.sfx.muted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  // ---------------- mode ----------------
  private loadHi() {
    this.hi = 0;
    try { this.hi = parseInt(localStorage.getItem(hiKeyFor(this.rules.mode)) ?? '0', 10) || 0; } catch { /* private mode */ }
  }

  /** EASY <-> HARD. Only between runs. */
  toggleMode() {
    if (this.state === 'running' || this.state === 'paused') return;
    this.sfx.unlock();
    this.setMode(this.rules.mode === 'hard' ? 'easy' : 'hard');
  }

  setMode(m: Mode) {
    this.rules.mode = m;
    try { localStorage.setItem(CFG.modeKey, m); } catch { /* ignore */ }
    this.loadHi();
    this.reset();
    this.setState('idle');
    this.syncModeUi();
    this.updateHud(true);
  }

  private syncModeUi() {
    const hard = this.rules.hard;
    document.body.dataset.mode = this.rules.mode;
    this.el.mode.textContent = hard ? 'MODE: HARD' : 'MODE: EASY';
    this.el.mode.setAttribute('aria-label', `Game mode: ${this.rules.mode}. Press to switch.`);
    this.el.tag.textContent = hard ? 'HARD' : '';
    this.el.modeHint.textContent = hard ? 'PRESS M FOR EASY MODE' : 'PRESS M FOR HARD MODE';
  }

  private callout(msg: string) {
    this.el.callout.textContent = msg;
    this.calloutT = 1.7;
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const k = 1 - Math.exp(-6 * dt);
    const h = Math.max(0, p.y);
    const tx = p.x * 0.5 + 5.6;
    const ty = 3.9 + h * 0.3;
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (ty - this.camera.position.y) * k;
    this.camera.position.z = 8 + this.pull;
    this.camLook.x += (p.x * 0.5 - this.camLook.x) * k;
    this.camLook.y += (1.4 + h * 0.35 - this.camLook.y) * k;
    this.camera.lookAt(this.camLook);
  }

  private updateHud(force: boolean, dt = 0) {
    const txt = pad(this.score);
    if (force || txt !== this.lastTxt) {
      this.lastTxt = txt;
      this.el.score.textContent = txt;
      this.el.hi.textContent = `HI ${pad(this.hi)}`;
      this.el.hi.classList.toggle('hidden', this.hi === 0);
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.el.score.classList.toggle('flash', this.flashT > 0 && Math.floor(this.flashT / 0.1) % 2 === 1);
    }
  }

  private resize() {
    const w = innerWidth, h = innerHeight;
    // render at low resolution and let CSS scale it up => chunky pixels like the original
    const px = Math.max(2, Math.round(h / 330));
    this.renderer.setSize(Math.ceil(w / px), Math.ceil(h / px), false);
    const a = w / h;
    // narrow (portrait) screens: widen the view and step the camera back so the dino and lanes stay in frame
    const narrow = Math.max(0, Math.min(1, (1.25 - a) / 0.75));
    this.camera.fov = 55 + 20 * narrow;
    this.pull = 7 * narrow;
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
    this.sky.resize(this.camera.aspect, this.camera.fov);
  }

  /** native share sheet where available (phones), otherwise copy text + link to the clipboard */
  private async share() {
    const text = `I scored ${this.score} on ${this.rules.hard ? 'HARD mode' : 'EASY mode'} in 3D Dino! Can you beat it?`;
    const btn = this.el.share;
    try {
      if (navigator.share) {
        await navigator.share({ title: '3D Dino', text, url: CFG.siteUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${CFG.siteUrl}`);
        btn.textContent = 'COPIED!';
        setTimeout(() => (btn.textContent = 'SHARE SCORE'), 1600);
      }
    } catch {
      /* share sheet dismissed */
    }
    btn.blur();
  }

  private buildRestartIcon() {
    const N = 15;
    const c = 7;
    let rects = '';
    const add = (x: number, y: number) => (rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - c, y - c);
        const a = Math.atan2(y - c, x - c); // screen coords: negative = upper half
        if (d >= 4.4 && d <= 6.9 && !(a > -1.5 && a < -0.35)) add(x, y);
      }
    // arrow head at the open end of the ring (top right)
    for (const [x, y] of [[9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [11, 1], [12, 1], [13, 1], [13, 2], [12, 2], [13, 3]]) add(x, y);
    $('restart-icon').innerHTML = `<svg viewBox="0 0 ${N} ${N}" fill="currentColor">${rects}</svg>`;
  }
}
