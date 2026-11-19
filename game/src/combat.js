// Combat: fists and a pistol on foot, ramming in a car. Bullets fly toward
// the mouse (or the facing direction), damage peds, cops and traffic, and
// draw the police. Punching is quiet; shooting is not.
import { CFG } from './config.js';
import { addHeat } from './police.js';
import { spawnParticles } from './vehicles.js';

export function updateCombat(G, dt) {
  const p = G.player;
  if (p.shootTimer > 0) p.shootTimer -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;

  // Space or mouse click fires the pistol (on foot only).
  const wantShoot = (G.input.down('Space') || G.input.mousePressed) && !p.car;
  if (wantShoot && p.shootTimer <= 0) {
    p.shootTimer = CFG.shootCooldown;
    let angle;
    if (G.input.mousePressed || G.input.mouseDown) {
      const wx = G.camera.x + G.input.mouseX;
      const wy = G.camera.y + G.input.mouseY;
      angle = Math.atan2(wy - p.y, wx - p.x);
    } else {
      angle = p.angle;
    }
    p.angle = angle;
    G.bullets.push({
      x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * CFG.bulletSpeed, vy: Math.sin(angle) * CFG.bulletSpeed,
      life: 1.2,
    });
    G.audio.play('shoot');
    addHeat(G, 0.4, 'Shots fired');
    G.shake = Math.max(G.shake, 2);
  }

  // F: punch the nearest person in front of the player.
  if (G.input.wasPressed('KeyF') && !p.car && p.punchTimer <= 0) {
    p.punchTimer = CFG.punchCooldown;
    p.punchAnim = 0.25;
    let best = null, bestD = CFG.punchRange + 14;
    for (const ped of G.peds) {
      if (ped.dead) continue;
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d < bestD) { bestD = d; best = ped; }
    }
    if (best) {
      best.dead = true;
      spawnParticles(G, best.x, best.y, '#e74c3c', 8);
      G.audio.play('punch');
      addHeat(G, 0.5, 'Assault');
    } else {
      G.audio.play('swing');
    }
  }
  if (p.punchAnim > 0) p.punchAnim -= dt;

  // Bullets: move, hit peds / cars / buildings, expire.
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const ped of G.peds) {
        if (ped.dead) continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.dead = true;
          spawnParticles(G, ped.x, ped.y, '#e74c3c', 10);
          G.audio.play('thud');
          addHeat(G, 1, 'Pedestrian shot');
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of G.cars) {
        if (car.driver === 'player') continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < 30) {
          spawnParticles(G, b.x, b.y, '#f1c40f', 6);
          if (car.driver === 'police') addHeat(G, 1, 'Shot at police');
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }

  // Particles fade out.
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
}

// Damage the player (cop rams, falls); death ends the run.
export function damagePlayer(G, amount, cause) {
  const p = G.player;
  if (p.invuln > 0) return;
  p.health -= amount;
  p.invuln = 0.6;
  G.shake = 8;
  G.audio.play('hurt');
  if (p.health <= 0) {
    p.health = 0;
    G.screen = 'over';
    G.overReason = cause || 'Rae was taken down. The crew posts your bail — $250.';
    p.money = Math.max(0, p.money - 250);
    G.audio.play('lose');
  }
}
