// Pedestrians: city folk strolling the sidewalks, who panic and run when
// there is gunfire, a speeding car, or a wanted chase nearby.
import { CFG, PED_COLORS } from './config.js';
import { pick, range } from './random.js';
import { resolveBuildings, clampToWorld, isOnRoad } from './world.js';

export function spawnPeds(G) {
  G.peds.length = 0;
  for (let i = 0; i < CFG.pedCount; i++) {
    const city = G.city;
    const ax = pick(G.rng, city.avenues);
    const sy = pick(G.rng, city.streets);
    // Stand on a sidewalk corner: just off the road edge.
    const x = ax + (G.rng() < 0.5 ? -52 : 52);
    const y = sy + (G.rng() < 0.5 ? -52 : 52);
    G.peds.push({
      x, y, angle: range(G.rng, 0, Math.PI * 2),
      speed: range(G.rng, 30, 65), color: pick(G.rng, PED_COLORS),
      dead: false, flee: 0, panic: 0, walkPhase: G.rng() * 10, cop: false,
    });
  }
}

export function updatePeds(G, dt) {
  const p = G.player;
  const danger = G.wanted >= 1 || G.bullets.length > 0;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    const dPlayer = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (danger && dPlayer < 320) ped.panic = 1.5;
    if (ped.panic > 0) {
      ped.panic -= dt;
      // Run away from the player.
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.angle += (a - ped.angle) * Math.min(1, 6 * dt);
      ped.x += Math.cos(ped.angle) * 150 * dt;
      ped.y += Math.sin(ped.angle) * 150 * dt;
    } else {
      // Wander: drift along, turning at random, staying near sidewalks.
      if (G.rng() < dt * 0.25) ped.angle += (G.rng() - 0.5) * 2.4;
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      ped.walkPhase += dt * 6;
      if (!isOnRoad(G.city, ped.x, ped.y) && G.rng() < dt * 0.5) {
        // Drift back toward the nearest road so peds stay on the streets.
        const ax = G.city.avenues.reduce((a, b) => Math.abs(b - ped.x) < Math.abs(a - ped.x) ? b : a);
        ped.angle = Math.atan2(ped.y - ped.y, ax - ped.x);
      }
    }
    resolveBuildings(G.city, ped, 10);
    clampToWorld(ped, 10);
    // A pedestrian hit by a fast car is knocked down (handled in vehicles.js).
  }
  // Dead peds fade back in as fresh faces elsewhere after a while.
  if (G.peds.filter((q) => q.dead).length > 8) {
    const dead = G.peds.find((q) => q.dead);
    if (dead) {
      dead.dead = false;
      const ax = pick(G.rng, G.city.avenues);
      const sy = pick(G.rng, G.city.streets);
      dead.x = ax + 60; dead.y = sy + 60;
    }
  }
}
