# Road Rash (1991 Sega Genesis) - 16-Bit Classic Reborn

An authentic, faithful web recreation of the 1991 Sega Genesis combat motorcycle racing classic **Road Rash**, engineered in modern TypeScript and Vite. Features dual-scanline pseudo-3D raster road projection, high-speed melee vehicular combat, authentic California highway biomes, 15 period-accurate motorcycles, 14 legendary AI rivals, relentless California Highway Patrol pursuits, Yamaha YM2612 FM synth audio synthesis, and the classic 8-character password save system.

---

## 🏁 Key Features & Mechanics

### 1. Authentic Pseudo-3D Raster Road Projection
- **OutRun / Road Rash Dual-Scanline Algorithm**: Projecting road polygons scanline by scanline with camera pitch and perspective scaling.
- **Elevation Hills & Occlusion Buffering (`clipY`)**: Seamless hill climbs, blind crests, and valley dips with occlusion clipping preventing unseen road segments from drawing over crests.
- **Dynamic Parallax Scenery**: Multi-layered mountain ranges, hills, and sky gradients that pan relative to road curvature and player heading.
- **Biomes & Hazards**: Guardrails, utility telephone poles, pine and redwood trees, desert saguaro cacti, boulders, wandering livestock, oil slicks, and launch dirt mounds that send riders airborne.

### 2. Lower Dashboard HUD & Live Rear-View Mirrors
- **Live 3D Rear-View Mirrors**: The left and right rearview mirrors embedded in the dashboard render the live 3D road behind the player, showing pursuing AI rivals and CHP cruisers approaching from behind in real time!
- **Sega Genesis Instrumentation**: Analog needle speedometer, segmented tachometer bar, digital speed readout, nitro LED gauge, segmented player and opponent stamina bars, and bike damage meters.
- **Event Banner Toasts**: Race notifications for knockouts, weapon snatches, wipeouts, nitrous boosts, and police alerts.

### 3. Vehicular Combat & Weapon Snatching
- **Melee Combat Arsenal**: Bare-knuckle punches, heavy heel kicks, Billy Clubs, Heavy Steel Chains, and Iron Crowbars.
- **Authentic Weapon Snatching**: Punching or kicking weapon-wielding rivals repeatedly knocks their weapon from their grasp, allowing you to snatch it for your own use.
- **Knockback Physics**: Strategic hits knock rivals sideways into guardrails, roadside boulders, telephone poles, or oncoming traffic for instant wipeouts.

### 4. Crash, Wipeout, & On-Foot Run-Back Mechanics
- **Multi-Stage Crash State Machine**: Airborne ejection (`flying`), cartwheeling across the asphalt (`tumbling`), standing up (`getting_up`), on-foot sprint back to the bike (`running_to_bike`), and remounting (`mounting_bike`).
- **On-Foot Danger**: While running back to your motorcycle, oncoming traffic or aggressive rivals can run you over, increasing damage and delay.

### 5. California Highway Patrol (CHP) Pursuit
- **Motorcycle Cops**: Officer O'Leary and Officer Garcia patrol California highways on high-performance pursuit bikes.
- **Traffic Stops & Arrests**: Cops pursue speeders with blaring sirens and batons. If you crash or get knocked down with police nearby, you get **BUSTED**, receiving heavy court fines that must be paid from your prize purse.

### 6. 15 Authentic Motorcycles Across 3 Classes
- **Panda Class (Standard Cruisers)**: Shuriken 400, Panda 600, Panda 750, Shuriken 1000, Banzai 750.
- **Sport Bike Class (Lightweight Carvers)**: Kamikaze 250, Kamikaze 400, Shuriken 800, Rat Bike, Diablo 1000.
- **Super Bike Class (Nitrous-Equipped Missiles)**: Capek 850 (3 N2O), Kula 1000 (4 N2O), Banzai 1100 (5 N2O), Corsair 1200 (6 N2O), and the legendary **Wild Thing 2000** (218 MPH, 8 N2O boosts).

### 7. 14 Legendary AI Rivals with Personalities
- **The Roster**: Biff, Natasha, Slater, Ikira, P.E. No. 1, Viper, Helga, Rude Boy, Gino, Butch, Sven, Tanya, Spike, and Diablo.
- **Distinct Personalities**: *Brawler* (relentless weapon swings), *Aggressive* (ramming & tight lines), *Speedster* (clean high-speed evasion), *Defensive* (counter-striking), *Unpredictable* (chaotic weaving), and *Tactical* (pinning player against hazards).
- **Championship Level Scaling**: Rivals upgrade their bikes, weapons, and aggressiveness across Levels 1 through 5.

### 8. 5 California Highway Tracks
1. **Sierra Nevada**: High-altitude alpine passes with pine forests, sharp S-bends, and rock cuts.
2. **Pacific Coast**: Scenic Highway 1 ocean bluffs, sweeping coastal curves, and fast straightaways.
3. **Redwood Forest**: Shadowed hairpin turns, giant trees, and dense tree canopies.
4. **Palm Desert**: Scorched salt flats, high-speed undulating roller-coaster dips, and cacti.
5. **Grass Valley**: Rolling foothill pastures, farm fences, and sudden blind hillcrests.

### 9. Yamaha YM2612 FM Synthesis Soundtrack & Audio Engine
- **Web Audio FM Synthesizer**: Period-accurate dual-operator FM voice synthesis recreating the Yamaha YM2612 sound chip.
- **Iconic Sound Effects**: Punch and kick impacts, chain whiplash, billy club strikes, engine throttle revs, tire screeches, crash tumbles, rider screams, and cash register bells.
- **Continuous Dynamic Audio**: Engine synthesizer shifts pitch and harmonic modulation based on RPM and speed; CHP cruiser sirens dynamically Doppler-shift and scale volume based on distance.

### 10. Classic 8-Character Password System
- Authentic bit-packed Base-32 password generator and decoder (level, bike index, cash purse, and qualified tracks bitmask with integrity checksums) ensuring full save compatibility.

---

## 🕹️ Controls

| Action | Keyboard Controls | Gamepad (Standard) | Touch Screen |
| :--- | :--- | :--- | :--- |
| **Throttle / Accelerate** | `Arrow Up` / `W` | `Button 1` / `R2` | `GAS` Button |
| **Brake / Decelerate** | `Arrow Down` / `S` | `Button 0` / `L2` | `BRK` Button |
| **Steer Left / Right** | `Arrow Left` / `Arrow Right` (`A` / `D`) | `D-Pad Left/Right` / `Left Stick` | `◄` / `►` Buttons |
| **Punch / Swing Weapon** | `Z` / `J` / `Left-Click` | `Button 2` (X / □) | `PUNCH` Button |
| **Kick** | `X` / `K` / `Right-Click` | `Button 3` (Y / △) | `KICK` Button |
| **Nitrous Oxide Boost** | `N` / Double-Tap `Up` | `R1` / Double-Tap `Up` | `N2O` Button |
| **Pause / In-Race Menu** | `P` / `Escape` | `Start` (Button 9) | `PAUSE` Button |
| **Menu Confirm / Select** | `Enter` / `Space` / `Z` | `A` (Button 0) / `Start` | Screen Tap / Click |
| **Menu Back / Cancel** | `Escape` / `Backspace` / `X` | `B` (Button 1) | Back Buttons |

---

## 📂 Architecture & Directory Structure

```
road-rash/
├── index.html                   # Retro Sega Genesis arcade cabinet UI & CRT scanlines
├── package.json                 # Project configuration & npm scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite bundler configuration
├── src/
│   ├── types.ts                 # Master TypeScript interfaces & data models
│   ├── main.ts                  # RoadRashGame controller class & browser bootstrap
│   ├── main.test.ts             # End-to-end integration test suite
│   ├── audio/
│   │   └── soundEngine.ts       # Yamaha YM2612 FM synth & dynamic audio engine
│   ├── data/
│   │   ├── gameData.ts          # 15 bikes, 14 rivals, 5 tracks, and 8-char passwords
│   │   └── gameData.test.ts     # Data verification unit tests
│   ├── engine/
│   │   ├── raceEngine.ts        # Pseudo-3D physics, AI behavior, collision & combat
│   │   └── raceEngine.test.ts   # Simulation & combat mechanics unit tests
│   ├── graphics/
│   │   ├── roadRenderer.ts      # Raster road projection, occlusion clipping & rear-view mirrors
│   │   ├── spriteGenerator.ts   # Procedural pixel-art sprites (bikes, scenery, riders, traffic)
│   │   └── graphics.test.ts     # Rendering pipeline unit tests
│   ├── input/
│   │   ├── inputManager.ts      # Multi-device input manager (keyboard, gamepad, touch)
│   │   └── inputManager.test.ts # Input handling unit tests
│   └── ui/
│       ├── hudRenderer.ts       # Lower dashboard gauges, HUD toasts, and rear-view mirrors
│       ├── screenRenderer.ts    # Title, Bike Shop, Clubhouse, Results, Wrecked & Busted screens
│       └── uiRenderers.test.ts  # HUD & menu screen unit tests
└── dist/                        # Production build artifacts
```

---

## 🛠️ Local Development & Testing

### Prerequisites
- Node.js (version 18 or newer recommended)
- npm (version 8 or newer)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your web browser to play.

### 3. Run the Automated Test Suite
```bash
npm test
# or with file watching:
npm run test:watch
```
Runs the full Vitest suite covering all modules, graphics, simulation physics, combat, audio, and end-to-end game controller integration.

### 4. Build for Production
```bash
npm run build
```
Typechecks via `tsc --noEmit` and bundles optimized production assets into `dist/`.

### 5. Preview the Production Build
```bash
npm run preview
```

---

## 🏆 Career & Championship Progression

1. **Qualifying Requirement**: You must finish in the **Top 3 (1st, 2nd, or 3rd)** on all 5 California tracks to qualify for the next Championship Level.
2. **Prize Purses**: Higher placements award larger prize money, necessary for upgrading your machine in the **Der Panzer Krad Bike Shop**.
3. **Totaled Bike (Wrecked)**: If your motorcycle takes 100% damage, you must pay a tow truck mechanic repair bill or face bankruptcy.
4. **Caught by Police (Busted)**: If you wipe out or slow down with Highway Patrol in pursuit, you must pay a steep citation fine.
5. **Championship Victory**: Defeating Level 5 earns the ultimate Road Rash Championship trophy and congratulatory victory sequence!

---

## 📜 License & Credits

Built with ❤️ for fans of the golden era of 16-bit Sega Genesis combat arcade racing.
Original Road Rash created by Electronic Arts (1991). This project is an independent educational engineering study recreating pseudo-3D raster graphics and FM synthesis algorithms in modern web technologies.
