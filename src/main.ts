import '@fontsource/press-start-2p/index.css';
import './style.css';
import { inject } from '@vercel/analytics';
import { Game } from './game/game';
import { PORTAL, Portal } from './game/portal';

async function boot() {
  const portal = new Portal();
  if (PORTAL) {
    // game-portal build: no external links, no own analytics, platform SDK instead
    document.body.dataset.portal = 'crazygames';
    document.querySelectorAll('a[href^="http"]').forEach((a) => a.remove()); // nothing may lead players away
    await portal.init();
    portal.loadingStart();
  } else {
    // privacy-friendly visit counter (cookie-less); only reports when hosted on Vercel with Analytics enabled
    inject();
  }

  const game = new Game(
    document.getElementById('game') as HTMLCanvasElement,
    document.getElementById('app') as HTMLElement,
    portal,
  );

  // handy for debugging / automated tests: open the page with ?debug
  if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __dino: Game }).__dino = game;

  await document.fonts.ready.catch(() => undefined);
  portal.loadingStop();
}
void boot();

// small credit for anyone who opens DevTools
console.log(
  '%c3D DINO%c  by Pranesh S  -  star the repo: https://github.com/Pranesh0805-S/3D-Dino',
  'font:bold 15px monospace;color:#acacac;background:#202124;padding:4px 10px',
  'font:12px monospace',
);
