// Solara City — boot and the one loop. The game moves between four screens:
// title, play, paused and game over. The world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one).
//
// ?seed=N fixes the city and traffic. ?shot=start|play|chase|mission (with
// &seed=N) stages that scene, paints it twice and sets window.__shotReady
// for a screenshot.
import { CFG, STEP } from './config.js';
import { mulberry32 } from './random.js';
import { Input } from './input.js';
import { buildCity } from './world.js';
import { createPlayer, updatePlayer, updateCamera } from './player.js';
import { spawnTraffic, updateTraffic } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, updateFootCops, spawnFootCop } from './police.js';
import { startMission, updateMission, saveProgress, loadProgress, MISSIONS } from './missions.js';
import { updateCombat } from './combat.js';
import { AudioSys } from './audio.js';
import { Renderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = new Renderer(canvas);

// The whole game state in one object, shared by every module.
const G = {
  rng: mulberry32(seed),
  seed,
  city: null,
  player: null,
  cars: [],
  peds: [],
  cops: [],
  bullets: [],
  particles: [],
  wanted: 0,
  wantedStars: 0,
  wantedFlash: 0,
  lastCrime: '',
  copTimer: 0,
  mission: null,
  missionIndex: 0,
  nextMissionTimer: 0,
  camera: { x: 0, y: 0 },
  view: renderer.view,
  input: new Input(canvas),
  audio: new AudioSys(),
  screen: SCREEN_TITLE,
  time: 0,
  shake: 0,
  flash: '',
  flashTime: 0,
  stats: { missionsDone: 0, carsStolen: 0 },
  save: loadProgress(),
  overReason: '',
  busted: false,
  footCopTimer: 0,
};

function newGame(fromSave) {
  G.rng = mulberry32(seed);
  G.city = buildCity(G.rng);
  const home = G.city.spots.home;
  G.player = createPlayer(home.x, home.y + 40);
  G.cars = [];
  G.peds = [];
  G.cops = [];
  G.bullets = [];
  G.particles = [];
  G.wanted = 0;
  G.wantedStars = 0;
  G.lastCrime = '';
  G.copTimer = 0;
  G.missionIndex = 0;
  G.nextMissionTimer = 0;
  G.flash = '';
  G.flashTime = 0;
  G.busted = false;
  G.overReason = '';
  G.stats = { missionsDone: 0, carsStolen: 0 };
  spawnTraffic(G);
  spawnPeds(G);
  if (fromSave && G.save) {
    G.player.money = G.save.money || 0;
    G.stats.missionsDone = G.save.missionsDone || 0;
    G.stats.carsStolen = G.save.carsStolen || 0;
    G.missionIndex = Math.min(MISSIONS.length - 1, G.save.missionIndex || 0);
  }
  startMission(G, G.missionIndex);
  G.camera.x = G.player.x - G.view.w / 2;
  G.camera.y = G.player.y - G.view.h / 2;
  G.screen = SCREEN_PLAY;
  G.audio.ensure();
  announce(`Playing. Mission ${G.missionIndex + 1}: ${MISSIONS[G.missionIndex].title}.`);
}

function announce(message) {
  status.textContent = message;
}

// One fixed simulation step. Used by the live loop and by the screenshot
// scenes, so a screenshot shows the real rules, not a still life.
function step(dt) {
  G.time += dt;
  if (G.screen === SCREEN_TITLE) {
    // Ambient city behind the title: traffic and pedestrians keep moving.
    updateTraffic(G, dt);
    updatePeds(G, dt);
    updateCamera(G, dt);
    return;
  }
  if (G.screen !== SCREEN_PLAY) return;
  if (G.flashTime > 0) {
    G.flashTime -= dt;
    if (G.flashTime <= 0) G.flash = '';
  }
  updatePlayer(G, dt);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateFootCops(G, dt);
  updateCombat(G, dt);
  updateMission(G, dt);
  // Foot officers join the chase at 3+ stars, one at a time.
  if (G.wantedStars >= 3) {
    G.footCopTimer -= dt;
    const footCops = G.peds.filter((p) => p.cop && !p.dead).length;
    if (G.footCopTimer <= 0 && footCops < 2) {
      G.footCopTimer = 8;
      spawnFootCop(G);
    }
  }
  // Chain the next mission a few seconds after one is completed.
  if (G.nextMissionTimer > 0) {
    G.nextMissionTimer -= dt;
    if (G.nextMissionTimer <= 0 && G.missionIndex + 1 < MISSIONS.length) {
      startMission(G, G.missionIndex + 1);
    } else if (G.nextMissionTimer <= 0) {
      G.flash = 'All missions complete — Solara City is yours. Free roam!';
      G.flashTime = 8;
      G.mission = null;
    }
  }
  updateCamera(G, dt);
  G.audio.update(G, dt);
}

function runShot(name) {
  newGame(false);
  G.screen = SCREEN_TITLE;
  stageShot(name, G, step);
  // Paint twice (fonts/layout settle), then signal the screenshot tool.
  let painted = 0;
  function paint() {
    renderer.draw(G);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  newGame(false);
  G.screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function handleKeys() {
    const input = G.input;
    if (input.wasPressed('KeyM')) {
      G.audio.setMuted(!G.audio.muted);
      G.flash = G.audio.muted ? 'Sound muted' : 'Sound on';
      G.flashTime = 1.5;
    }
    if (G.screen === SCREEN_TITLE) {
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.mousePressed) {
        newGame(false);
      } else if (input.wasPressed('KeyL') && G.save) {
        newGame(true);
      }
      return;
    }
    if (G.screen === SCREEN_OVER) {
      if (input.wasPressed('Enter') || input.wasPressed('Space') || input.mousePressed) {
        newGame(false);
      }
      return;
    }
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (G.screen === SCREEN_PLAY) {
        G.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (G.screen === SCREEN_PAUSED) {
        G.screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (G.screen === SCREEN_PAUSED && input.wasPressed('KeyS')) {
      saveProgress(G);
      G.flash = 'Progress saved';
      G.flashTime = 1.5;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleKeys();
    if (G.screen === SCREEN_TITLE || G.screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (G.screen === SCREEN_TITLE || G.screen === SCREEN_PLAY)) {
        step(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(G);
    G.input.endFrame();
  }

  // Leaving the tab pauses a running game rather than letting the city run on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Clicking the canvas also starts audio (browsers need a gesture).
  canvas.addEventListener('pointerdown', () => G.audio.ensure(), { once: false });

  announce('Solara City. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
