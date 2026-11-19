// The player on foot and behind the wheel: walking, running, entering and
// exiting cars, health regen, and the camera that follows.
import { CFG } from './config.js';
import { resolveBuildings, clampToWorld } from './world.js';
import { drivePlayerCar, nearestCar, enterCar, exitCar, carRamHits } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, health: CFG.playerMaxHealth, money: 0,
    car: null, speed: 0, shootTimer: 0, punchTimer: 0, punchAnim: 0, invuln: 0,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  if (p.invuln > 0) p.invuln -= dt;
  // Slow health regen when not in a fight.
  if (G.wantedStars === 0 && p.health < CFG.playerMaxHealth) p.health = Math.min(CFG.playerMaxHealth, p.health + 3 * dt);

  if (p.car) {
    const res = drivePlayerCar(G, p.car, dt);
    p.speed = res.speed;
    p.x = p.car.x; p.y = p.car.y;
    p.angle = p.car.angle;
    carRamHits(G);
    if (G.input.wasPressed('KeyE')) exitCar(G);
    return;
  }

  // On foot: WASD moves, Shift runs, facing follows movement or the mouse.
  const mv = G.input.moveVector();
  const running = G.input.down('ShiftLeft') || G.input.down('ShiftRight');
  const speed = running ? CFG.playerRunSpeed : CFG.playerWalkSpeed;
  if (mv.x !== 0 || mv.y !== 0) {
    p.x += mv.x * speed * dt;
    p.y += mv.y * speed * dt;
    p.angle = Math.atan2(mv.y, mv.x);
    p.speed = speed;
    p.walking = true;
  } else {
    p.speed = 0;
    p.walking = false;
  }
  resolveBuildings(G.city, p, CFG.playerRadius);
  clampToWorld(p, CFG.playerRadius);

  // E: enter the nearest car.
  if (G.input.wasPressed('KeyE')) {
    const car = nearestCar(G, p.x, p.y, 56);
    if (car) enterCar(G, car);
    else G.flash = 'No car close enough — walk up to one and press E';
  }
}

// Camera: centre on the player, clamped to the world, with a small shake.
export function updateCamera(G, dt) {
  const p = G.player;
  const vw = G.view.w, vh = G.view.h;
  let tx = p.x - vw / 2;
  let ty = p.y - vh / 2;
  tx = Math.max(0, Math.min(CFG.worldW - vw, tx));
  ty = Math.max(0, Math.min(CFG.waterY + 120 - vh, ty));
  G.camera.x += (tx - G.camera.x) * Math.min(1, 8 * dt);
  G.camera.y += (ty - G.camera.y) * Math.min(1, 8 * dt);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - 30 * dt);
}
