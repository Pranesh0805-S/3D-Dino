const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);

export class Input {
  left = false;
  right = false;
  down = false;
  jumpHeld = false;
  onJumpPress: () => void = () => {};
  onJumpRelease: () => void = () => {};

  constructor(app: HTMLElement) {
    addEventListener('keydown', (e) => {
      const c = e.code;
      if (JUMP.has(c) || c === 'Enter') {
        e.preventDefault();
        if (!e.repeat) this.pressJump();
      } else if (DOWN.has(c)) { e.preventDefault(); this.down = true; }
      else if (LEFT.has(c)) { e.preventDefault(); this.left = true; }
      else if (RIGHT.has(c)) { e.preventDefault(); this.right = true; }
    });
    addEventListener('keyup', (e) => {
      const c = e.code;
      if (JUMP.has(c) || c === 'Enter') this.releaseJump();
      else if (DOWN.has(c)) this.down = false;
      else if (LEFT.has(c)) this.left = false;
      else if (RIGHT.has(c)) this.right = false;
    });
    addEventListener('blur', () => {
      this.left = this.right = this.down = false;
      this.releaseJump();
    });

    // touch / mouse: on-screen buttons + tap anywhere to jump
    app.querySelectorAll<HTMLButtonElement>('#touch button').forEach((b) => {
      const k = b.dataset.key!;
      const set = (v: boolean) => {
        if (k === 'left') this.left = v;
        else if (k === 'right') this.right = v;
        else if (k === 'down') this.down = v;
        else if (k === 'jump') (v ? this.pressJump() : this.releaseJump());
      };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); set(true); });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(ev, () => set(false));
    });
    app.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('#touch')) return;
      this.pressJump();
    });
    app.addEventListener('pointerup', () => this.releaseJump());
  }

  private pressJump() {
    this.jumpHeld = true;
    this.onJumpPress();
  }
  private releaseJump() {
    if (!this.jumpHeld) return;
    this.jumpHeld = false;
    this.onJumpRelease();
  }
}
