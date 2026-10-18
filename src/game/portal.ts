// CrazyGames portal integration (https://docs.crazygames.com/sdk/intro/).
// Only active in the portal build (`npm run build:portal`); in the normal build every method is a no-op
// and the SDK script is never loaded.

export const PORTAL = import.meta.env.VITE_PORTAL === 'crazygames';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

interface AdCallbacks { adStarted: () => void; adFinished: () => void; adError: (e: unknown) => void }
interface CrazySdk {
  environment: 'local' | 'crazygames' | 'disabled';
  init(): Promise<void>;
  ad: { requestAd(type: 'midgame' | 'rewarded', cb: AdCallbacks): void };
  game: {
    settings: { muteAudio?: boolean };
    addSettingsChangeListener(fn: (s: { muteAudio?: boolean }) => void): void;
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
  };
}
declare global { interface Window { CrazyGames?: { SDK: CrazySdk } } }

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('sdk blocked'));
    document.head.appendChild(s);
  });
}

export class Portal {
  /** true once the SDK is loaded and usable (never true in the normal build) */
  active = false;
  private sdk?: CrazySdk;
  private sdkMute = false;
  private adPlaying = false;
  /** the game should be silent while this is true (SDK mute setting or an ad playing) */
  onMuteChange: (silent: boolean) => void = () => {};

  async init() {
    if (!PORTAL) return;
    try {
      await loadScript(SDK_URL);
      const sdk = window.CrazyGames?.SDK;
      if (!sdk) return;
      await sdk.init();
      if (sdk.environment === 'disabled') return; // not on CrazyGames or localhost: SDK calls would throw
      this.sdk = sdk;
      this.active = true;
      this.sdkMute = !!sdk.game.settings.muteAudio;
      sdk.game.addSettingsChangeListener((s) => { this.sdkMute = !!s.muteAudio; this.emitMute(); });
      this.emitMute();
    } catch {
      /* SDK blocked (ad blocker, offline): the game still works without it */
    }
  }

  private emitMute() { this.onMuteChange(this.sdkMute || this.adPlaying); }
  private call(fn: (s: CrazySdk) => void) { if (this.sdk) try { fn(this.sdk); } catch { /* ignore */ } }

  loadingStart() { this.call((s) => s.game.loadingStart()); }
  loadingStop() { this.call((s) => s.game.loadingStop()); }
  gameplayStart() { this.call((s) => s.game.gameplayStart()); }
  gameplayStop() { this.call((s) => s.game.gameplayStop()); }
  happytime() { this.call((s) => s.game.happytime()); }

  /** show a midgame ad; resolves when it is over (finished, failed, blocked or not available) */
  midgameAd(): Promise<void> {
    return new Promise((resolve) => {
      const sdk = this.sdk;
      if (!sdk) return resolve();
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        this.adPlaying = false;
        this.emitMute();
        resolve();
      };
      try {
        sdk.ad.requestAd('midgame', {
          adStarted: () => { this.adPlaying = true; this.emitMute(); },
          adFinished: end,
          adError: end,
        });
      } catch { end(); }
    });
  }
}
