// Solara City generation: a road grid, blocks full of buildings, a park,
// a beach and the waterfront. Pure data — no drawing and no browser here.
// Collision helpers (buildings are solid rectangles) live here too.
import { CFG, ROOF_COLORS } from './config.js';
import { pick, range, chance } from './random.js';

export function buildCity(rng) {
  const avenues = [];
  for (let x = CFG.avenueX0; x < CFG.worldW - 100; x += CFG.avenueStep) avenues.push(x);
  const streets = [];
  for (let y = CFG.streetY0; y < CFG.waterY - 120; y += CFG.streetStep) streets.push(y);

  const buildings = [];
  const trees = [];
  const parks = [];
  // One park block: the block at column 2, row 1 becomes green space.
  const parkCol = 2, parkRow = 1;

  for (let ci = 0; ci < avenues.length - 1; ci++) {
    for (let ri = 0; ri < streets.length - 1; ri++) {
      const x0 = avenues[ci] + CFG.roadW / 2 + 14;
      const y0 = streets[ri] + CFG.roadW / 2 + 14;
      const x1 = avenues[ci + 1] - CFG.roadW / 2 - 14;
      const y1 = streets[ri + 1] - CFG.roadW / 2 - 14;
      if (ci === parkCol && ri === parkRow) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let t = 0; t < 14; t++) {
          trees.push({ x: range(rng, x0 + 10, x1 - 10), y: range(rng, y0 + 10, y1 - 10), r: range(rng, 7, 12) });
        }
        continue;
      }
      // 1-3 buildings per block, with a margin for the sidewalk.
      const n = 1 + Math.floor(rng() * 3);
      for (let b = 0; b < n; b++) {
        const bw = range(rng, 70, 150);
        const bh = range(rng, 60, 120);
        const bx = range(rng, x0, Math.max(x0 + 1, x1 - bw));
        const by = range(rng, y0, Math.max(y0 + 1, y1 - bh));
        buildings.push({ x: bx, y: by, w: bw, h: bh, color: pick(rng, ROOF_COLORS), hgt: 8 + rng() * 18 });
      }
      if (chance(rng, 0.6)) {
        trees.push({ x: range(rng, x0, x1), y: range(rng, y0, y1), r: range(rng, 6, 10) });
      }
    }
  }

  // Named districts, for the HUD / minimap labels.
  const districts = [
    { name: 'Old Town', x: 200, y: 180 },
    { name: 'Marina Bay', x: 2200, y: 1800 },
    { name: 'North Heights', x: 2400, y: 200 },
    { name: 'Harbor District', x: 400, y: 1900 },
  ];

  // Fixed story locations (on roads, so cars can reach them).
  const spots = {
    home: { x: avenues[1], y: streets[0], label: 'Rae\u2019s Apartment' },
    garage: { x: avenues[3], y: streets[1], label: 'Corso\u2019s Garage' },
    deli: { x: avenues[5], y: streets[2], label: 'Sunset Deli' },
    harbor: { x: avenues[1], y: streets[4], label: 'Harbor Pier' },
    bank: { x: avenues[4], y: streets[3], label: 'Solara Trust Bank' },
    hideout: { x: avenues[6], y: streets[4], label: 'Hideout' },
    beach: { x: avenues[3], y: 2120, label: 'Solara Beach' },
  };

  return { avenues, streets, buildings, trees, parks, districts, spots };
}

// Is a point on a road (within the road width of an avenue or street)?
export function isOnRoad(city, x, y) {
  const half = CFG.roadW / 2;
  for (const ax of city.avenues) if (Math.abs(x - ax) <= half && y < CFG.waterY) return true;
  for (const sy of city.streets) if (Math.abs(y - sy) <= half) return true;
  return false;
}

// Nearest road centre point (used to spawn traffic / place the player).
export function nearestRoadPoint(city, x, y) {
  let bestX = city.avenues[0], bestD = Infinity;
  for (const ax of city.avenues) { const d = Math.abs(x - ax); if (d < bestD) { bestD = d; bestX = ax; } }
  let bestY = city.streets[0]; bestD = Infinity;
  for (const sy of city.streets) { const d = Math.abs(y - sy); if (d < bestD) { bestD = d; bestY = sy; } }
  return { x: bestX, y: bestY };
}

// Push a circle (x, y, radius) out of every building it overlaps.
// Returns true when a collision happened.
export function resolveBuildings(city, obj, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(obj.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(obj.y, b.y + b.h));
    const dx = obj.x - cx, dy = obj.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        obj.x = cx + (dx / d) * radius;
        obj.y = cy + (dy / d) * radius;
      } else {
        obj.y = b.y - radius; // centre inside the rect: push up out of it
      }
    }
  }
  return hit;
}

// Keep an object inside the world; the sea blocks the south edge.
export function clampToWorld(obj, radius) {
  obj.x = Math.max(radius, Math.min(CFG.worldW - radius, obj.x));
  obj.y = Math.max(radius, Math.min(CFG.waterY - radius, obj.y));
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

// Random point on a road, for spawning traffic.
export function randomRoadPoint(rng, city) {
  if (rng() < 0.5) {
    const ax = pick(rng, city.avenues);
    return { x: ax + (rng() < 0.5 ? -14 : 14), y: range(rng, 100, CFG.waterY - 100), vertical: true };
  }
  const sy = pick(rng, city.streets);
  return { x: range(rng, 100, CFG.worldW - 100), y: sy + (rng() < 0.5 ? -14 : 14), vertical: false };
}
