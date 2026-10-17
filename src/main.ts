import '@fontsource/press-start-2p/index.css';
import './style.css';
import { Game } from './game/game';

const game = new Game(
  document.getElementById('game') as HTMLCanvasElement,
  document.getElementById('app') as HTMLElement,
);

// handy for debugging / automated tests: open the page with ?debug
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __dino: Game }).__dino = game;
