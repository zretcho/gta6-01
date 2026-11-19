// Vehicles: traffic cars that follow the road grid, parked cars to steal,
// and the arcade driving model the player uses. A car is a plain object:
// { id, type, x, y, angle, speed, driver: 'traffic'|'parked'|'player'|'police',
//   dir, targetAngle, honk }.
import { CFG, VEHICLES, VEHICLE_TYPES } from './config.js';
import { pick, range } from './random.js';
import { randomRoadPoint, resolveBuildings, clampToWorld, isOnRoad } from './world.js';

let nextCarId = 1;

export function makeCar(type, x, y, angle, driver) {
  const def = VEHICLES[type];
  return {
    id: nextCarId++, type, x, y, angle, speed: 0,
    driver, def, dir: 1, targetAngle: angle, stuck: 0, honk: 0,
    // Traffic cars drive along one road, then turn at the next intersection.
    road: null, cruise: 150,
  };
}

// Spawn the ambient traffic + a few parked cars near the player start.
export function spawnTraffic(G) {
  G.cars.length = 0;
  for (let i = 0; i < CFG.trafficCount; i++) {
    const p = randomRoadPoint(G.rng, G.city);
    const type = pick(G.rng, VEHICLE_TYPES);
    const angle = p.vertical ? (G.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (G.rng() < 0.5 ? 0 : Math.PI);
    const car = makeCar(type, p.x, p.y, angle, 'traffic');
    car.speed = range(G.rng, 110, 190);
    car.road = p.vertical ? 'v' : 'h';
    car.cruise = range(G.rng, 110, 190);
    G.cars.push(car);
  }
  // Parked cars along the home street, ready to steal.
  const home = G.city.spots.home;
  for (let i = 0; i < 5; i++) {
    const type = pick(G.rng, VEHICLE_TYPES);
    const car = makeCar(type, home.x + 60 + i * 70, home.y + 18, 0, 'parked');
    G.cars.push(car);
  }
}

// Arcade car physics: accelerate, brake/reverse, steer by speed, handbrake.
export function drivePlayerCar(G, car, dt) {
  const input = G.input;
  const mv = input.moveVector();
  const boosting = input.down('ShiftLeft') || input.down('ShiftRight');
  const top = car.def.topSpeed * (boosting ? 1.15 : 1);
  const forward = mv.y < 0 ? 1 : mv.y > 0 ? -0.55 : 0; // W = gas, S = brake/reverse
  if (forward !== 0) car.speed += forward * car.def.accel * dt * (boosting ? 1.25 : 1);
  else car.speed *= Math.pow(0.35, dt); // coast to a stop
  // Handbrake with Space: sharp slowdown, lets the car slide a little.
  if (input.down('Space')) car.speed *= Math.pow(0.02, dt);
  car.speed = Math.max(-120, Math.min(top, car.speed));
  if (Math.abs(car.speed) < 4 && forward === 0) car.speed = 0;
  const steer = (mv.x !== 0 ? mv.x : 0);
  const dirSign = car.speed >= 0 ? 1 : -1;
  car.angle += steer * car.def.turn * dt * Math.min(1, Math.abs(car.speed) / 90) * dirSign;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const probe = { x: nx, y: ny };
  const hit = resolveBuildings(G.city, probe, car.def.len * 0.42);
  car.x = probe.x; car.y = probe.y;
  clampToWorld(car, car.def.len * 0.5);
  if (hit) {
    car.speed *= 0.45;
    if (Math.abs(car.speed) > 120) G.shake = Math.min(10, Math.abs(car.speed) / 40);
  }
  return { speed: car.speed };
}

// Traffic AI: cruise along its road; at an intersection, sometimes turn.
// Cars ahead slow the one behind. Cars that leave the map respawn elsewhere.
export function updateTraffic(G, dt) {
  const playerCar = G.player.car;
  for (const car of G.cars) {
    if (car.driver === 'player' || car.driver === 'police') continue;
    if (car.driver === 'parked') continue;
    // Slow for the car directly ahead.
    let blocked = false;
    for (const other of G.cars) {
      if (other === car || other.driver === 'parked') continue;
      const dx = other.x - car.x, dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 70 && side < 26) { blocked = true; break; }
    }
    const target = blocked ? 0 : car.cruise;
    car.speed += Math.max(-260 * dt, Math.min(160 * dt, target - car.speed));
    car.angle += (car.targetAngle - car.angle) * Math.min(1, 3 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Turn at intersections: when close to a crossing road, maybe pick a new heading.
    const nearAvenue = nearestAxis(G.city.avenues, car.x, 26);
    const nearStreet = nearestAxis(G.city.streets, car.y, 26);
    if (car.road === 'v' && nearStreet !== null && G.rng() < dt * 0.9) {
      car.road = 'h';
      car.targetAngle = G.rng() < 0.5 ? 0 : Math.PI;
      car.y = nearStreet + (G.rng() < 0.5 ? -14 : 14);
    } else if (car.road === 'h' && nearAvenue !== null && G.rng() < dt * 0.9) {
      car.road = 'v';
      car.targetAngle = G.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      car.x = nearAvenue + (G.rng() < 0.5 ? -14 : 14);
    }
    if (car.x < 40 || car.x > CFG.worldW - 40 || car.y < 40 || car.y > CFG.waterY - 40) {
      const p = randomRoadPoint(G.rng, G.city);
      car.x = p.x; car.y = p.y;
      car.angle = car.targetAngle = p.vertical ? Math.PI / 2 : 0;
      car.road = p.vertical ? 'v' : 'h';
    }
    // Gentle collision with the player's car: shove apart, no damage model.
    if (playerCar) {
      const dx = car.x - playerCar.x, dy = car.y - playerCar.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 52) {
        car.x = playerCar.x + (dx / d) * 52;
        car.y = playerCar.y + (dy / d) * 52;
        car.speed *= 0.6;
      }
    }
  }
}

function nearestAxis(list, value, tol) {
  for (const v of list) if (Math.abs(value - v) <= tol) return v;
  return null;
}

// Nearest car to a point within `maxDist` (any driver state).
export function nearestCar(G, x, y, maxDist) {
  let best = null, bestD = maxDist;
  for (const car of G.cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Steal / enter a car: traffic cars get yanked out, parked cars are free.
export function enterCar(G, car) {
  const p = G.player;
  p.car = car;
  car.driver = 'player';
  car.speed = 0;
  p.x = car.x; p.y = car.y;
  G.stats.carsStolen += 1;
  addHeat(G, 1, 'Car stolen');
  G.audio.play('steal');
  G.flash = `You took the ${car.def.name}`;
}

// Get out next to the car.
export function exitCar(G) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  p.car = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  resolveBuildings(G.city, p, CFG.playerRadius);
  clampToWorld(p, CFG.playerRadius);
  G.audio.play('door');
}

// Ramming: the player's car damages peds / police it hits; used by combat.
export function carRamHits(G) {
  const car = G.player.car;
  if (!car || Math.abs(car.speed) < 140) return;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 40) {
      ped.dead = true;
      ped.flee = 1;
      addHeat(G, 1, 'Pedestrian hit');
      G.audio.play('thud');
      spawnParticles(G, ped.x, ped.y, '#e74c3c', 10);
    }
  }
}

export function spawnParticles(G, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = G.rng() * Math.PI * 2;
    const s = 60 + G.rng() * 160;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + G.rng() * 0.4, color, size: 2 + G.rng() * 4 });
  }
}

// Wanted heat lives in police.js; this is the shared entry point.
import { addHeat } from './police.js';
export { isOnRoad };
