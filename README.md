# Solara City — Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/zretcho/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/zretcho/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solara City** is a complete 2D top-down open-world crime game that runs entirely from static files — no build step, no network requests. You are Rae Marlowe: home in Solara City, broke, and out of options. Fixer Vince Corso has work, and each job is bigger than the last.

## What is in the game

- **A city to explore** — a road grid of avenues and streets, blocks of buildings, a park, a beach and a waterfront, with named districts (Old Town, Marina Bay, North Heights, Harbor District).
- **On foot and by car** — walk, run, steal any car on the street (sedans, coupes, taxis, vans, pickups, sports cars, trucks), each with its own speed and handling.
- **Traffic and pedestrians** — cars cruise the grid and turn at intersections; pedestrians stroll the sidewalks and panic when shots are fired or a chase rolls through.
- **Wanted level and police** — crimes raise your stars (up to 5). Interceptor cars chase and ram you; at 3+ stars foot officers join the hunt. Lay low out of sight and the heat dies down. Get caught and you are busted.
- **Missions and a story** — four story missions with objectives, dialogue and cash rewards: *First Wheels*, *The Pickup*, *Heat in the Harbor*, *The Big Score*.
- **Combat** — punch with F, shoot with Space or mouse click, ram with your car.
- **HUD with minimap** — health, cash, wanted stars, speed, mission objective, and a live minimap showing you, traffic, police and the mission marker.
- **Menus and saving** — start screen, pause, game over / busted screens, and progress saved to localStorage after every mission (press L on the title screen to continue).
- **Sound** — fully synthesized WebAudio: engine hum, two-tone police siren, gunshots, and a bass groove. No audio files.
- **Deterministic screenshot scenes** — `?shot=start|play|chase|mission&seed=1` stages a reproducible scene from the real rules.

## How to run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no install.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Move on foot / drive |
| E | Enter / exit a car |
| Space | Shoot (on foot) / handbrake (in car) |
| F | Punch |
| Shift | Run / boost |
| Mouse | Aim and shoot |
| P / Esc | Pause |
| M | Mute |
| S | Save now (while paused) |
| L | Continue a saved game (title screen) |

## Structure

The source is plain ES modules under `game/src/`, one job per file: `config.js` (tuning), `random.js` (seeded RNG), `input.js`, `world.js` (city generation + collision), `player.js`, `vehicles.js` (traffic + driving), `pedestrians.js`, `police.js` (wanted level), `missions.js` (story), `combat.js`, `hud.js` (HUD + minimap), `audio.js` (synthesized sound), `render.js`, `shots.js` (screenshot scenes), `main.js` (loop + screens).

Everything in Solara City — the city, the people, the cars and the story — is original and invented. No real city, person, brand or commercial game is copied.

<sub>Entered on [make.fun](https://make.fun/?ref=dbwh3rf9&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
