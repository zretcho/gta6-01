// HUD: health bar, cash, wanted stars, speed, mission objective, flash
// messages — plus the minimap (player, cars, police, mission marker).
import { CFG, PALETTE } from './config.js';
import { missionTarget, currentStep } from './missions.js';

export function drawHud(ctx, G) {
  const p = G.player;
  const vw = G.view.w, vh = G.view.h;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: health bar + cash + stats.
  ctx.fillStyle = 'rgba(10,12,18,0.55)';
  roundRect(ctx, 12, 12, 250, 84, 10);
  ctx.fill();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RAE MARLOWE', 24, 34);
  // Health bar.
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 42, 180, 12);
  ctx.fillStyle = p.health > 50 ? '#2ecc71' : p.health > 25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(24, 42, 180 * Math.max(0, p.health / CFG.playerMaxHealth), 12);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`$${Math.floor(p.money)}`, 24, 76);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillText(`Missions ${G.stats.missionsDone}/4   Cars ${G.stats.carsStolen}`, 96, 76);

  // Top-centre: wanted stars.
  const stars = G.wantedStars;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < CFG.maxWanted; i++) {
    ctx.fillStyle = i < stars ? '#ffd23f' : 'rgba(255,255,255,0.25)';
    ctx.fillText('\u2605', vw / 2 - 60 + i * 30, 40);
  }
  if (stars > 0 && G.lastCrime) {
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#ffb3b3';
    ctx.fillText(G.lastCrime, vw / 2, 62);
  }

  // Bottom-left: objective.
  const step = currentStep(G);
  if (G.mission && step) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(10,12,18,0.55)';
    const label = `${G.mission.def.title}: ${step.text}`;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 24;
    roundRect(ctx, 12, vh - 52, w, 38, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(label, 24, vh - 27);
  }

  // Bottom-right: speed (in a car) or controls hint (on foot).
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  if (p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.32);
    ctx.fillText(`${kmh} km/h`, vw - 24, vh - 24);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#cfd3da';
    ctx.fillText(`${p.car.def.name}  •  E exit  •  Space handbrake`, vw - 24, vh - 44);
  } else {
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#cfd3da';
    ctx.fillText('WASD move  •  Shift run  •  E enter car  •  Space shoot  •  F punch  •  P pause', vw - 24, vh - 24);
  }

  // Mission banner (brief / dialogue) across the top-centre, word-wrapped
  // so long lines never run off the screen.
  if (G.mission && G.mission.bannerTime > 0) {
    ctx.textAlign = 'center';
    ctx.font = '16px system-ui, sans-serif';
    const maxW = Math.min(vw - 240, 860);
    const words = G.mission.banner.split(' ');
    const lines = [''];
    for (const word of words) {
      const test = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && lines[lines.length - 1]) lines.push(word);
      else lines[lines.length - 1] = test;
    }
    const boxW = Math.min(vw - 40, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 32);
    const boxH = 24 + lines.length * 22;
    ctx.fillStyle = 'rgba(20,16,30,0.78)';
    roundRect(ctx, (vw - boxW) / 2, 78, boxW, boxH, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9f2';
    lines.forEach((line, i) => ctx.fillText(line, vw / 2, 78 + 26 + i * 22));
  }

  // Flash message (pickup / mission complete) centre screen.
  if (G.flash) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText(G.flash, vw / 2, vh * 0.3);
    ctx.fillText(G.flash, vw / 2, vh * 0.3);
  }

  drawMinimap(ctx, G);
  ctx.restore();
}

function drawMinimap(ctx, G) {
  const vw = G.view.w;
  const mw = CFG.minimapW, mh = CFG.minimapH;
  const mx = vw - mw - 14, my = 14;
  const sx = mw / CFG.worldW, sy = mh / CFG.worldH;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  roundRect(ctx, mx - 4, my - 4, mw + 8, mh + 8, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  // Land, water, roads.
  ctx.fillStyle = '#5d7d4a';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2e86ab';
  ctx.fillRect(mx, my + CFG.waterY * sy, mw, mh - CFG.waterY * sy);
  ctx.strokeStyle = '#3a3f4a';
  ctx.lineWidth = 3;
  for (const ax of G.city.avenues) {
    ctx.beginPath(); ctx.moveTo(mx + ax * sx, my); ctx.lineTo(mx + ax * sx, my + mh); ctx.stroke();
  }
  for (const sy2 of G.city.streets) {
    ctx.beginPath(); ctx.moveTo(mx, my + sy2 * sy); ctx.lineTo(mx + mw, my + sy2 * sy); ctx.stroke();
  }
  // Mission marker (pulsing pink diamond).
  const target = missionTarget(G);
  if (target) {
    const pulse = 5 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = PALETTE.mission;
    ctx.beginPath();
    ctx.moveTo(mx + target.x * sx, my + target.y * sy - pulse - 3);
    ctx.lineTo(mx + target.x * sx + pulse, my + target.y * sy);
    ctx.lineTo(mx + target.x * sx, my + target.y * sy + pulse + 3);
    ctx.lineTo(mx + target.x * sx - pulse, my + target.y * sy);
    ctx.closePath();
    ctx.fill();
  }
  // Traffic (grey dots), police (blue), player (yellow arrow).
  ctx.fillStyle = '#c8c8c8';
  for (const car of G.cars) {
    if (car.driver === 'police') continue;
    ctx.fillRect(mx + car.x * sx - 1, my + car.y * sy - 1, 2, 2);
  }
  ctx.fillStyle = '#4a90e2';
  for (const cop of G.cops) {
    ctx.beginPath();
    ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = G.player;
  ctx.save();
  ctx.translate(mx + p.x * sx, my + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + G.camera.x * sx, my + G.camera.y * sy, G.view.w * sx, G.view.h * sy);
  ctx.restore();
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLARA CITY', mx, my + mh + 18);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
