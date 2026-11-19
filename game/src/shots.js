// Screenshot scenes behind ?shot=start|play|chase|mission (with &seed=N).
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot that drives toward the
// mission target, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { makeCar } from './vehicles.js';

// Drive the player's car toward a world point, following the road grid:
// stay on the current road to the intersection with the target's avenue or
// street, then turn — so the car stays on asphalt instead of cutting blocks.
function roadWaypoint(G, tx, ty) {
  const car = G.player.car;
  const city = G.city;
  const nearAvenue = city.avenues.reduce((a, b) => Math.abs(b - car.x) < Math.abs(a - car.x) ? b : a);
  const nearStreet = city.streets.reduce((a, b) => Math.abs(b - car.y) < Math.abs(a - car.y) ? b : a);
  const onStreet = Math.abs(car.y - nearStreet) < Math.abs(car.x - nearAvenue);
  if (Math.abs(car.x - tx) < 50) return { x: car.x, y: ty };
  if (Math.abs(car.y - ty) < 50) return { x: tx, y: car.y };
  if (onStreet) return { x: tx, y: nearStreet };
  return { x: nearAvenue, y: ty };
}

function autopilotDrive(G, tx, ty) {
  const car = G.player.car;
  if (!car) return;
  const wp = roadWaypoint(G, tx, ty);
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const keys = G.input.keys;
  keys.delete('KeyA'); keys.delete('KeyD');
  keys.add('KeyW');
  if (diff > 0.12) keys.add('KeyD');
  else if (diff < -0.12) keys.add('KeyA');
}

// Run the real step function N times with the autopilot steering.
function runSteps(G, stepFn, seconds, target) {
  const n = Math.floor(seconds / STEP);
  for (let i = 0; i < n; i++) {
    if (target) autopilotDrive(G, target.x, target.y);
    stepFn(STEP);
  }
  G.input.keys.clear();
}

// Put the player in a car on an avenue, heading south through the city.
function putPlayerInCar(G, type, x, y, angle) {
  const car = makeCar(type, x, y, angle, 'player');
  G.cars.push(car);
  G.player.car = car;
  G.player.x = x; G.player.y = y; G.player.angle = angle;
  G.stats.carsStolen += 1;
  return car;
}

/**
 * Stage the named scene on the live game state G and return the screen to
 * draw. `stepFn` is main.js's fixed-step simulation function.
 */
export function stageShot(name, G, stepFn) {
  const city = G.city;
  const mid = { x: city.avenues[3], y: city.streets[2] };

  if (name === 'start') {
    // Title screen over a living city: camera over downtown, traffic moving.
    G.screen = 'title';
    G.player.x = mid.x; G.player.y = mid.y;
    G.camera.x = mid.x - G.view.w / 2;
    G.camera.y = mid.y - G.view.h / 2;
    runSteps(G, stepFn, 4, null);
    G.screen = 'title';
    return 'title';
  }

  if (name === 'chase') {
    // Wanted 3 stars, interceptors closing in, player fleeing in a sport car.
    G.screen = 'play';
    startMission(G, 2);
    const car = putPlayerInCar(G, 'sport', city.avenues[2], city.streets[2], 0);
    car.speed = 300;
    G.wanted = 3;
    G.lastCrime = 'Bank robbery';
    for (let i = 0; i < 3; i++) {
      const cop = makeCar('police', car.x - 260 - i * 90, car.y - 120 + i * 120, 0, 'police');
      cop.speed = 260;
      G.cars.push(cop);
      G.cops.push(cop);
    }
    const hideout = city.spots.hideout;
    runSteps(G, stepFn, 1.8, hideout);
    G.screen = 'play';
    return 'play';
  }

  if (name === 'mission') {
    // Mission 2 in progress: package pickup at Sunset Deli, dialogue showing.
    G.screen = 'play';
    startMission(G, 1);
    putPlayerInCar(G, 'coupe', city.avenues[3], city.streets[2], 0);
    G.player.car.speed = 240;
    const deli = city.spots.deli;
    G.mission.banner = 'Corso: "Package is at Sunset Deli. No questions, no stops."';
    G.mission.bannerTime = 999; // hold the dialogue for the screenshot
    runSteps(G, stepFn, 1, deli);
    G.mission.banner = 'Corso: "Package is at Sunset Deli. No questions, no stops."';
    G.mission.bannerTime = 999;
    G.screen = 'play';
    return 'play';
  }

  // Default: 'play' — driving through downtown on mission 1, HUD + minimap.
  G.screen = 'play';
  startMission(G, 0);
  G.mission.step = 1; // already has a car: drive to the garage
  const car = putPlayerInCar(G, 'sedan', city.avenues[1], city.streets[1], 0);
  car.speed = 260;
  const garage = city.spots.garage;
  runSteps(G, stepFn, 1, garage);
  G.screen = 'play';
  return 'play';
}
