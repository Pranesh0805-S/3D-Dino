import * as THREE from 'three';

// Day = classic Chrome dino. Night = the dark theme from the screenshot.
const DAY = {
  bg: '#f7f7f7', fill: '#6a6a6a', outline: '#262626', ground: '#e4e4e4', line: '#535353',
  speck: '#9a9a9a', cloud: '#dcdcdc', star: '#f7f7f7', moon: '#f7f7f7', eye: '#f7f7f7',
  hud: '#535353', hi: '#757575',
};
const NIGHT = {
  bg: '#202124', fill: '#b8b8b8', outline: '#000000', ground: '#2a2b2f', line: '#acacac',
  speck: '#6a6a6a', cloud: '#323336', star: '#55565a', moon: '#3a3b3f', eye: '#000000',
  hud: '#acacac', hi: '#7c7c7c',
};
type Key = keyof typeof DAY;

export class Theme {
  night = 1;
  target = 1;
  bg = new THREE.Color();
  fill = new THREE.MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  ground = new THREE.MeshLambertMaterial();
  line = new THREE.MeshBasicMaterial();
  speck = new THREE.MeshBasicMaterial();
  outline = new THREE.LineBasicMaterial();
  eye = new THREE.MeshBasicMaterial();
  cloud = new THREE.Color();
  star = new THREE.Color();
  moon = new THREE.Color();
  hud = new THREE.Color();
  hi = new THREE.Color();

  constructor() {
    this.apply();
  }

  setNight(on: boolean) {
    this.target = on ? 1 : 0;
  }

  /** returns true when colours changed this frame */
  update(dt: number): boolean {
    if (this.night === this.target) return false;
    const step = dt / 0.9;
    this.night = this.target > this.night ? Math.min(this.target, this.night + step) : Math.max(this.target, this.night - step);
    this.apply();
    return true;
  }

  private mix(k: Key, out: THREE.Color) {
    return out.set(DAY[k]).lerp(new THREE.Color(NIGHT[k]), this.night);
  }

  private apply() {
    this.mix('bg', this.bg);
    this.mix('fill', this.fill.color);
    this.mix('ground', this.ground.color);
    this.mix('line', this.line.color);
    this.mix('speck', this.speck.color);
    this.mix('outline', this.outline.color);
    this.mix('eye', this.eye.color);
    this.mix('cloud', this.cloud);
    this.mix('star', this.star);
    this.mix('moon', this.moon);
    this.mix('hud', this.hud);
    this.mix('hi', this.hi);
  }

  applyCss() {
    const r = document.documentElement.style;
    r.setProperty('--bg', this.bg.getStyle());
    r.setProperty('--fg', this.hud.getStyle());
    r.setProperty('--dim', this.hi.getStyle());
  }
}
