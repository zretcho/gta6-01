// Drawing only: the city, cars, people, bullets, particles and the screens
// (title, pause, game over). The camera shows a window of the world; the
// HUD is drawn on top in screen space by hud.js.
import { CFG, PALETTE, VEHICLES } from './config.js';
import { drawHud, roundRect } from './hud.js';
import { MISSIONS } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.view = { w: 0, h: 0, ratio: 1 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(window.innerWidth * ratio);
    this.canvas.height = Math.round(window.innerHeight * ratio);
    // Mutate the view object in place: main.js holds a reference to it.
    this.view.w = window.innerWidth;
    this.view.h = window.innerHeight;
    this.view.ratio = ratio;
  }

  draw(G) {
    const ctx = this.ctx;
    const { w, h, ratio } = this.view;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, w, h);
    const shakeX = G.shake ? (G.rng() - 0.5) * G.shake : 0;
    const shakeY = G.shake ? (G.rng() - 0.5) * G.shake : 0;
    const camX = G.camera.x + shakeX;
    const camY = G.camera.y + shakeY;
    ctx.save();
    ctx.translate(-camX, -camY);
    this.drawWorld(ctx, G, camX, camY);
    ctx.restore();
    if (G.screen === SCREEN_PLAY || G.screen === SCREEN_PAUSED) drawHud(ctx, G);
    if (G.screen === SCREEN_TITLE) this.drawTitle(ctx, G);
    else if (G.screen === SCREEN_PAUSED) this.drawPaused(ctx, G);
    else if (G.screen === SCREEN_OVER) this.drawOver(ctx, G);
  }

  drawWorld(ctx, G, camX, camY) {
    const { w, h } = this.view;
    const x0 = camX - 60, y0 = camY - 60, x1 = camX + w + 60, y1 = camY + h + 60;
    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Beach + sea along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, CFG.beachY, x1 - x0, CFG.waterY - CFG.beachY);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(x0, CFG.waterY, x1 - x0, y1 - CFG.waterY);
    // Animated wave lines.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const wy = CFG.waterY + 18 + i * 26 + Math.sin(G.time * 1.4 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(x0, wy);
      ctx.lineTo(x1, wy);
      ctx.stroke();
    }
    // Parks.
    for (const park of G.city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Roads: asphalt, sidewalks, centre dashes.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const ax of G.city.avenues) ctx.fillRect(ax - CFG.roadW / 2 - 8, 0, CFG.roadW + 16, CFG.waterY);
    for (const sy of G.city.streets) ctx.fillRect(0, sy - CFG.roadW / 2 - 8, CFG.worldW, CFG.roadW + 16);
    ctx.fillStyle = PALETTE.road;
    for (const ax of G.city.avenues) ctx.fillRect(ax - CFG.roadW / 2, 0, CFG.roadW, CFG.waterY);
    for (const sy of G.city.streets) ctx.fillRect(0, sy - CFG.roadW / 2, CFG.worldW, CFG.roadW);
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 22]);
    for (const ax of G.city.avenues) {
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, CFG.waterY); ctx.stroke();
    }
    for (const sy of G.city.streets) {
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(CFG.worldW, sy); ctx.stroke();
    }
    ctx.setLineDash([]);
    // Trees.
    for (const t of G.city.trees) {
      if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
      ctx.fillStyle = '#5a3d24';
      ctx.fillRect(t.x - 2, t.y - 2, 4, 8);
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 4, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Buildings: shadow, walls, roof, roof detail.
    for (const b of G.city.buildings) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = '#8b7d6b';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      const cols = Math.max(1, Math.floor(b.w / 34));
      const rows = Math.max(1, Math.floor(b.h / 30));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          ctx.fillRect(b.x + 12 + c * 34, b.y + 16 + r * 30, 12, 10);
        }
      }
    }
    // Mission target beacon.
    const target = missionTargetFor(G);
    if (target) {
      const pulse = 6 + Math.sin(G.time * 4) * 3;
      ctx.fillStyle = 'rgba(255,93,143,0.25)';
      ctx.beginPath();
      ctx.arc(target.x, target.y, 46 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.mission;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.mission;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(target.label, target.x, target.y - 40);
    }
    // District labels.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const d of G.city.districts) ctx.fillText(d.name.toUpperCase(), d.x, d.y);
    // Cars.
    for (const car of G.cars) this.drawCar(ctx, car, G);
    // Pedestrians.
    for (const ped of G.peds) {
      if (ped.dead) continue;
      if (ped.x < x0 || ped.x > x1 || ped.y < y0 || ped.y > y1) continue;
      ctx.save();
      ctx.translate(ped.x, ped.y);
      const bob = ped.panic > 0 ? 0 : Math.sin(ped.walkPhase) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath(); ctx.arc(0, bob, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c89b';
      ctx.beginPath(); ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 + bob - 2, 4.5, 0, Math.PI * 2); ctx.fill();
      if (ped.cop) {
        ctx.fillStyle = '#ffd23f';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POLICE', 0, -14);
      }
      ctx.restore();
    }
    // Player on foot.
    const p = G.player;
    if (!p.car) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 9, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(p.angle);
      // Body + gun / fist.
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(6, -3, 14, 6); // arm / pistol pointing forward
      if (p.punchAnim > 0) {
        ctx.fillStyle = '#f2c89b';
        ctx.beginPath(); ctx.arc(22, 0, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#f2c89b';
      ctx.beginPath(); ctx.arc(2, 0, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(4, -2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Direction indicator.
      ctx.strokeStyle = 'rgba(255,210,63,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18);
      ctx.lineTo(p.x + Math.cos(p.angle) * 28, p.y + Math.sin(p.angle) * 28);
      ctx.stroke();
    }
    // Bullets.
    ctx.fillStyle = '#ffe27a';
    for (const b of G.bullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Particles.
    for (const pt of G.particles) {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  drawCar(ctx, car, G) {
    const def = car.def;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-def.len / 2 + 3, -def.wid / 2 + 4, def.len, def.wid);
    ctx.fillStyle = def.color;
    roundRect(ctx, -def.len / 2, -def.wid / 2, def.len, def.wid, 6);
    ctx.fill();
    // Roof + windshield.
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-def.len / 2 + 8, -def.wid / 2 + 3, def.len * 0.32, def.wid - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-4, -def.wid / 2 + 3, def.len * 0.28, def.wid - 6);
    // Headlights.
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(def.len / 2 - 3, -def.wid / 2 + 2, 3, 5);
    ctx.fillRect(def.len / 2 - 3, def.wid / 2 - 7, 3, 5);
    if (car.driver === 'police') {
      // Light bar, flashing red/blue.
      const phase = Math.floor(G.time * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#ff2d2d' : '#2d7dff';
      ctx.fillRect(-6, -def.wid / 2 + 2, 12, 6);
      ctx.fillStyle = phase ? '#2d7dff' : '#ff2d2d';
      ctx.fillRect(-6, def.wid / 2 - 8, 12, 6);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 3);
    } else if (car.type === 'taxi') {
      ctx.fillStyle = '#111';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 3);
    }
    // Player's car gets a yellow outline.
    if (car.driver === 'player') {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      roundRect(ctx, -def.len / 2 - 2, -def.wid / 2 - 2, def.len + 4, def.wid + 4, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPanel(ctx, G, title, lines, prompt, accent) {
    const { w, h } = this.view;
    const pw = Math.min(680, w - 40);
    const ph = 150 + lines.length * 30 + 70;
    const x = (w - pw) / 2, y = (h - ph) / 2;
    ctx.fillStyle = 'rgba(8,10,16,0.82)';
    roundRect(ctx, x, y, pw, ph, 14);
    ctx.fill();
    ctx.strokeStyle = accent || '#ffd23f';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, pw, ph, 14);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(title, w / 2, y + 64);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#cfd3da';
    lines.forEach((line, i) => ctx.fillText(line, w / 2, y + 108 + i * 30));
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(prompt, w / 2, y + ph - 28);
  }

  drawTitle(ctx, G) {
    const { w, h } = this.view;
    ctx.fillStyle = 'rgba(8,10,16,0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('SOLARA CITY', w / 2, h * 0.3);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('An open-world crime story — on foot and behind the wheel', w / 2, h * 0.3 + 40);
    const lines = [
      'Rae Marlowe is home, broke, and out of options. Vince Corso has work.',
      'Steal cars, outrun the Solara Police Department, run 4 story missions.',
      'WASD / arrows — move & drive   •   E — enter / exit car   •   Space — shoot / handbrake',
      'F — punch   •   Shift — run / boost   •   P — pause   •   M — mute',
      G.save ? `Saved game found: $${Math.floor(G.save.money)}, ${G.save.missionsDone} mission(s) done — press L to continue` : 'No saved game yet — your progress saves after each mission.',
    ];
    ctx.fillStyle = '#cfd3da';
    ctx.font = '16px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.42 + i * 28));
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('Press ENTER or click to start  •  L to continue a saved game', w / 2, h * 0.42 + lines.length * 28 + 30);
    ctx.fillStyle = '#9aa0a8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Original game: Solara City, its people and its story are invented. No real city, person or brand.', w / 2, h - 24);
  }

  drawPaused(ctx, G) {
    this.drawPanel(ctx, G, 'PAUSED', [
      `Cash: $${Math.floor(G.player.money)}   •   Missions done: ${G.stats.missionsDone}/4`,
      'Your progress is saved after every mission.',
      'M — mute sound    •    S — save now',
    ], 'Press P or Esc to resume', '#4a90e2');
  }

  drawOver(ctx, G) {
    const title = G.busted ? 'BUSTED' : 'WASTED';
    this.drawPanel(ctx, G, title, [
      G.overReason || 'Rae was taken down.',
      `Cash: $${Math.floor(G.player.money)}   •   Missions done: ${G.stats.missionsDone}/4`,
      'The story continues — try again, and watch the wanted stars.',
    ], 'Press ENTER to try again', '#e74c3c');
  }
}

// Mission target for the world-space beacon (shared with hud.js logic).
import { missionTarget } from './missions.js';
function missionTargetFor(G) {
  return missionTarget(G);
}
