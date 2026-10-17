import '@fontsource/press-start-2p/index.css';
import './style.css';
import { Game } from './game/game';

const game = new Game(
  document.getElementById('game') as HTMLCanvasElement,
  document.getElementById('app') as HTMLElement,
);

// handy for debugging / automated tests: open the page with ?debug
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __dino: Game }).__dino = game;

// small credit for anyone who opens DevTools
console.log(
  '%c3D DINO%c  by Pranesh S  -  star the repo: https://github.com/Pranesh0805-S/3D-Dino',
  'font:bold 15px monospace;color:#acacac;background:#202124;padding:4px 10px',
  'font:12px monospace',
);
