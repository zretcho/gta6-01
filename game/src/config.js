// Solara City — configuration: world size, colours, vehicle types, tuning.
// Every number the rest of the game uses lives here so balancing is one edit.
export const CFG = {
  worldW: 3200,
  worldH: 2400,
  roadW: 64,
  // Avenues (vertical roads) and streets (horizontal roads) on a regular grid.
  avenueX0: 200,
  streetY0: 180,
  avenueStep: 400,
  streetStep: 360,
  // Waterfront strip along the south edge of the map.
  waterY: 2180,
  beachY: 2080,
  playerRadius: 13,
  playerWalkSpeed: 165,
  playerRunSpeed: 250,
  playerMaxHealth: 100,
  // Wanted: stars 0..5. Crimes add heat; heat decays out of police sight.
  maxWanted: 5,
  wantedDecayPerSec: 0.05,
  copChaseSpeed: 245,
  copSpawnInterval: 4.0,
  trafficCount: 26,
  pedCount: 34,
  bulletSpeed: 640,
  bulletDamage: 34,
  punchDamage: 18,
  punchRange: 36,
  shootCooldown: 0.22,
  punchCooldown: 0.35,
  // Minimap size in screen pixels.
  minimapW: 196,
  minimapH: 150,
  saveKey: 'solara-city-save-v1',
};

// Vehicle catalogue: name, colour, top speed, acceleration, handling, size.
// The player can steal any of these; traffic uses the same table.
export const STEP = 1 / 60; // fixed simulation step, in seconds

export const VEHICLES = {
  sedan:  { name: 'Sedan',       color: '#4a7fb5', topSpeed: 330, accel: 210, turn: 2.6, len: 46, wid: 22 },
  coupe:  { name: 'Coupe',       color: '#c0392b', topSpeed: 380, accel: 260, turn: 3.0, len: 44, wid: 21 },
  taxi:   { name: 'Taxi',        color: '#f1c40f', topSpeed: 320, accel: 200, turn: 2.6, len: 46, wid: 22 },
  van:    { name: 'Van',         color: '#7f8c8d', topSpeed: 280, accel: 160, turn: 2.1, len: 54, wid: 24 },
  pickup: { name: 'Pickup',      color: '#27ae60', topSpeed: 310, accel: 190, turn: 2.4, len: 50, wid: 23 },
  sport:  { name: 'Sport',       color: '#8e44ad', topSpeed: 430, accel: 320, turn: 3.3, len: 44, wid: 21 },
  police: { name: 'Interceptor', color: '#22344f', topSpeed: 400, accel: 300, turn: 3.1, len: 46, wid: 22 },
  truck:  { name: 'Truck',       color: '#b9770e', topSpeed: 250, accel: 140, turn: 1.9, len: 62, wid: 26 },
};

export const VEHICLE_TYPES = ['sedan', 'coupe', 'taxi', 'van', 'pickup', 'sport', 'truck'];

// Palette for the sun-soaked coastal city.
export const PALETTE = {
  grass: '#7fb069',
  grassDark: '#6da05c',
  road: '#3a3f4a',
  roadLine: '#e8d44d',
  sidewalk: '#9aa0a8',
  water: '#2e86ab',
  sand: '#e8d8a0',
  park: '#5d9c59',
  tree: '#2f6b2f',
  player: '#ffd23f',
  mission: '#ff5d8f',
};

export const PED_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];
export const ROOF_COLORS = ['#b5654a', '#5a7d9a', '#8a6d9b', '#c98a4b', '#6b8e6b', '#a05a6b'];
