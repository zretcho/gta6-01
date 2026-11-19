// Missions and the story. Rae Marlowe comes home to Solara City broke;
// fixer Vince Corso gives her work, each job bigger than the last. Four
// missions, each with objectives, dialogue and a cash reward. Progress is
// saved to localStorage when a mission is completed.
export const MISSIONS = [
  {
    id: 1,
    title: 'First Wheels',
    giver: 'Vince Corso',
    brief: 'You need wheels before you can work. Take any car on the street and bring it to my garage.',
    steps: [
      { text: 'Steal a car (walk up to one and press E)', check: 'car' },
      { text: 'Drive to Corso\u2019s Garage', target: 'garage', check: 'reach' },
    ],
    reward: 150,
    outro: 'Corso: "Good. You drive like you mean it. I\u2019ve got real work for you."',
  },
  {
    id: 2,
    title: 'The Pickup',
    giver: 'Vince Corso',
    brief: 'A package is waiting at Sunset Deli. Pick it up and bring it to the Harbor Pier. No questions, no stops.',
    steps: [
      { text: 'Drive to Sunset Deli and collect the package', target: 'deli', check: 'reach' },
      { text: 'Deliver the package to Harbor Pier', target: 'harbor', check: 'reach' },
    ],
    reward: 350,
    outro: 'Corso: "Clean run. The buyer paid double. You\u2019re moving up, Rae."',
  },
  {
    id: 3,
    title: 'Heat in the Harbor',
    giver: 'Vince Corso',
    brief: 'The harbor job went loud. The police are on you. Lose them — get to the Hideout and stay out of sight until the heat dies.',
    steps: [
      { text: 'Escape the police and reach the Hideout', target: 'hideout', check: 'reach' },
      { text: 'Lay low until your wanted level drops to zero', check: 'cool' },
    ],
    reward: 500,
    outro: 'Corso: "You vanished like smoke. One more job, then you\u2019re free of this town."',
  },
  {
    id: 4,
    title: 'The Big Score',
    giver: 'Vince Corso',
    brief: 'Solara Trust Bank, Friday, 9 AM. Grab the cash, outrun the whole department, and meet me at the Hideout. This is the one.',
    steps: [
      { text: 'Reach Solara Trust Bank', target: 'bank', check: 'reach' },
      { text: 'Grab the cash and escape to the Hideout', target: 'hideout', check: 'reach' },
    ],
    reward: 2500,
    outro: 'Corso: "We did it. Solara City is yours now, Rae. Spend it well."',
  },
];

export function startMission(G, index) {
  const m = MISSIONS[index];
  if (!m) { G.mission = null; return; }
  G.missionIndex = index;
  G.mission = {
    def: m,
    step: 0,
    active: true,
    banner: m.brief,
    bannerTime: 6,
    done: false,
  };
  G.audio.play('mission');
  if (index === 2) {
    // Mission 3 opens with the police already on the player.
    G.wanted = 2;
    G.lastCrime = 'Harbor job went loud';
  }
  if (index === 3) {
    G.wanted = 0;
  }
}

export function currentStep(G) {
  if (!G.mission) return null;
  return G.mission.def.steps[G.mission.step] || null;
}

export function missionTarget(G) {
  const step = currentStep(G);
  if (!step || !step.target) return null;
  return G.city.spots[step.target];
}

// Advance the mission when its current step's condition is met.
export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || m.done) return;
  if (m.bannerTime > 0) m.bannerTime -= dt;
  const step = currentStep(G);
  if (!step) return;
  let done = false;
  if (step.check === 'car') {
    done = !!G.player.car;
  } else if (step.check === 'reach') {
    const t = missionTarget(G);
    if (t && Math.hypot(G.player.x - t.x, G.player.y - t.y) < 90) done = true;
  } else if (step.check === 'cool') {
    done = G.wantedStars === 0;
  }
  if (done) {
    if (step.check === 'reach' && m.def.id === 4 && m.step === 0) {
      // Grabbing the cash at the bank draws the whole department.
      G.wanted = 3;
      G.lastCrime = 'Bank robbery';
      G.player.money += 0; // cash is paid at the hideout
      m.banner = 'Cash grabbed! The whole department is coming — run!';
      m.bannerTime = 5;
      G.audio.play('alarm');
    }
    m.step += 1;
    G.audio.play('step');
    if (m.step >= m.def.steps.length) completeMission(G);
    else {
      const next = currentStep(G);
      if (next) { m.banner = next.text; m.bannerTime = 5; }
    }
  }
}

export function completeMission(G) {
  const m = G.mission;
  m.done = true;
  m.active = false;
  G.player.money += m.def.reward;
  G.stats.missionsDone += 1;
  G.flash = `Mission complete: ${m.def.title}  +$${m.def.reward}`;
  m.banner = m.def.outro;
  m.bannerTime = 7;
  G.audio.play('win');
  saveProgress(G);
  // Chain the next mission after a short breather.
  G.nextMissionTimer = 4;
}

export function saveProgress(G) {
  try {
    window.localStorage.setItem('solara-city-save-v1', JSON.stringify({
      money: G.player.money,
      missionIndex: Math.min(MISSIONS.length - 1, G.missionIndex + 1),
      missionsDone: G.stats.missionsDone,
      carsStolen: G.stats.carsStolen,
    }));
  } catch { /* storage off: progress lasts this visit only */ }
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem('solara-city-save-v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
