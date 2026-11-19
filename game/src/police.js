// Wanted level and the police. Crimes add heat (0..5 stars); the police
// spawn interceptor cars and, at higher stars, foot officers who chase the
// player. Lose the heat by staying out of sight; get caught and it is over.
import { CFG } from './config.js';
import { makeCar } from './vehicles.js';
import { resolveBuildings, clampToWorld } from './world.js';

export function addHeat(G, stars, reason) {
  if (G.wanted >= CFG.maxWanted) return;
  G.wanted = Math.min(CFG.maxWanted, G.wanted + stars);
  G.lastCrime = reason;
  G.wantedFlash = 1;
  if (G.wanted >= 1) G.audio.play('sirenBlip');
}

// Desired number of active police units for a wanted level.
function policeTarget(wanted) {
  if (wanted < 1) return 0;
  return Math.min(6, 1 + Math.floor(wanted));
}

export function updatePolice(G, dt) {
  // Heat decays only when no police unit is close to the player.
  const p = G.player;
  let nearestCop = Infinity;
  for (const cop of G.cops) nearestCop = Math.min(nearestCop, Math.hypot(cop.x - p.x, cop.y - p.y));
  if (G.wanted > 0 && nearestCop > 420) {
    G.wanted = Math.max(0, G.wanted - CFG.wantedDecayPerSec * dt);
  }
  G.wantedStars = Math.ceil(G.wanted - 0.001);

  // Spawn interceptors until the target count is met.
  G.copTimer -= dt;
  const target = policeTarget(G.wantedStars);
  if (G.cops.length < target && G.copTimer <= 0) {
    G.copTimer = CFG.copSpawnInterval;
    const angle = G.rng() * Math.PI * 2;
    const dist = 700;
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;
    const car = makeCar('police', x, y, Math.atan2(p.y - y, p.x - x), 'police');
    car.speed = 200;
    G.cars.push(car);
    G.cops.push(car);
    G.audio.play('sirenBlip');
  }
  // Despawn far-away cops when the heat is gone.
  if (G.wantedStars === 0) {
    for (const cop of G.cops) cop.driver = 'parked';
    G.cops.length = 0;
  }

  // Chase: steer toward the player, ram on foot players, box in cars.
  for (const cop of G.cops) {
    const dx = p.x - cop.x, dy = p.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    cop.speed = Math.min(CFG.copChaseSpeed + G.wantedStars * 18, cop.speed + 240 * dt);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    resolveBuildings(G.city, cop, cop.def.len * 0.42);
    clampToWorld(cop, cop.def.len * 0.5);
    // Ramming the player's car slows both and shakes the screen.
    if (p.car && dist < 52) {
      p.car.speed *= 0.92;
      cop.speed *= 0.7;
      G.shake = 6;
      G.audio.play('thud');
    }
    // Caught on foot: the officer grabs the player.
    if (!p.car && dist < 26) {
      G.busted = true;
      G.screen = 'over';
      G.overReason = 'Busted by the Solara Police Department. The crew posts your bail — $250.';
      p.money = Math.max(0, p.money - 250);
    }
  }
}

// Foot officers join the chase at 3+ stars: slow, but they cut corners.
export function spawnFootCop(G) {
  const p = G.player;
  const angle = G.rng() * Math.PI * 2;
  G.peds.push({
    x: p.x + Math.cos(angle) * 500, y: p.y + Math.sin(angle) * 500,
    angle: 0, speed: 190, color: '#1a2a4a', dead: false, flee: 0, panic: 0,
    walkPhase: 0, cop: true,
  });
}

export function updateFootCops(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (!ped.cop || ped.dead) continue;
    const dx = p.x - ped.x, dy = p.y - ped.y;
    const dist = Math.hypot(dx, dy) || 1;
    ped.angle = Math.atan2(dy, dx);
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    if (!p.car && dist < 24) {
      G.busted = true;
      G.screen = 'over';
      G.overReason = 'Busted by a foot officer. Bail set at $250.';
      p.money = Math.max(0, p.money - 250);
    }
  }
}
