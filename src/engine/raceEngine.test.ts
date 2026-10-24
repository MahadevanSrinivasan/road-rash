import { describe, it, expect, vi } from 'vitest';
import {
  createRaceSimulation,
  updateRaceSimulation,
  triggerCrash,
  updateCrashState,
  generateTrackSegments,
  generateInitialTraffic,
  RaceEngineCallbacks,
  SEGMENT_LENGTH,
  NITRO_DURATION_MS,
  NITRO_TOP_SPEED_BONUS,
} from './raceEngine';
import {
  TRACKS,
  createInitialCareer,
} from '../data/gameData';
import { PlayerInput, RoadSegment } from '../types';

function createEmptyInput(): PlayerInput {
  return {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    punch: false,
    kick: false,
    nitro: false,
    pause: false,
  };
}

describe('Race Simulation Initialization', () => {
  it('should initialize a race with 15 competitors (1 player + 14 rivals) plus patrolling police', () => {
    const career = createInitialCareer();
    career.currentBikeId = 'panda_600';

    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    // 1 player + 14 rivals = 15 competitors
    const competitors = state.racers.filter((r) => !r.copProfile);
    expect(competitors.length).toBe(15);

    // Level 1 should have 1 cop; total racers = 16
    const cops = state.racers.filter((r) => !!r.copProfile);
    expect(cops.length).toBe(1);
    expect(state.racers.length).toBe(16);

    // Level 3 should have 2 cops; total racers = 17
    const stateLevel3 = createRaceSimulation('sierra_nevada', 3, career, segments);
    const copsLevel3 = stateLevel3.racers.filter((r) => !!r.copProfile);
    expect(copsLevel3.length).toBe(2);
    expect(stateLevel3.racers.length).toBe(17);

    // Verify player bike & stats
    const player = state.player;
    expect(player.id).toBe('player');
    expect(player.isPlayer).toBe(true);
    expect(player.bike.id).toBe('panda_600');
    expect(player.stamina).toBe(100);
    expect(player.bikeHealth).toBe(100);
    expect(player.nitroRemaining).toBe(player.bike.nitroCharges);
    expect(player.crashData.state).toBe('none');

    // Verify track segments and length
    expect(state.totalSegments).toBe(segments.length);
    expect(state.segmentLengthWorld).toBe(SEGMENT_LENGTH);
    expect(state.trackLengthWorld).toBe(segments.length * SEGMENT_LENGTH);
  });

  it('should apply AI rival level upgrades for bikes, weapons, and speeds', () => {
    const career = createInitialCareer();

    // Check Level 1 scaling
    const stateL1 = createRaceSimulation('redwood_forest', 1, career);
    const biffL1 = stateL1.racers.find((r) => r.name === 'Biff');
    expect(biffL1).toBeDefined();
    expect(biffL1?.bike.id).toBe('panda_600');
    expect(biffL1?.weapon).toBe('club');

    // Check Level 4 scaling: Biff upgrades to Capek 850 and Crowbar
    const stateL4 = createRaceSimulation('redwood_forest', 4, career);
    const biffL4 = stateL4.racers.find((r) => r.name === 'Biff');
    expect(biffL4).toBeDefined();
    expect(biffL4?.bike.id).toBe('capek_850');
    expect(biffL4?.weapon).toBe('crowbar');
    expect(biffL4?.maxSpeedMph).toBeGreaterThan(biffL1!.maxSpeedMph);

    // Diablo at Level 5 should have Wild Thing 2000
    const stateL5 = createRaceSimulation('redwood_forest', 5, career);
    const diabloL5 = stateL5.racers.find((r) => r.name === 'Diablo');
    expect(diabloL5).toBeDefined();
    expect(diabloL5?.bike.id).toBe('wild_thing_2000');
  });

  it('should initialize police officers with patrol state and spaced along track', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.pacific_coast, 3);
    const state = createRaceSimulation('pacific_coast', 3, career, segments);

    const cops = state.racers.filter((r) => !!r.copProfile);
    expect(cops.length).toBe(2);

    expect(cops[0].name).toBe("Officer O'Leary");
    expect(cops[0].copProfile?.state).toBe('patrolling');
    expect(cops[0].copProfile?.sirenActive).toBe(false);
    expect(cops[0].weapon).toBe('club');
    expect(cops[0].z).toBeGreaterThan(0);

    expect(cops[1].name).toBe('Officer Garcia');
    expect(cops[1].z).toBeGreaterThan(cops[0].z);
  });

  it('should generate traffic vehicles correctly in same and oncoming lanes', () => {
    const track = TRACKS.palm_desert;
    const traffic = generateInitialTraffic(track, 1, 600, 120000);
    expect(traffic.length).toBeGreaterThanOrEqual(12);

    for (const car of traffic) {
      if (car.direction === 'same') {
        expect(car.x).toBeGreaterThanOrEqual(0.15);
        expect(car.x).toBeLessThanOrEqual(0.75);
      } else {
        expect(car.x).toBeGreaterThanOrEqual(-0.75);
        expect(car.x).toBeLessThanOrEqual(-0.15);
      }
      expect(car.speedMph).toBeGreaterThan(30);
      expect(car.collided).toBe(false);
    }
  });
});

describe('Player Motorcycle Physics', () => {
  it('should accelerate forward when accelerate input is held', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    expect(state.player.speedMph).toBe(0);
    expect(state.player.z).toBe(0);

    const input = createEmptyInput();
    input.accelerate = true;

    // Simulate 1 second (1000ms in 50ms steps)
    for (let i = 0; i < 20; i++) {
      updateRaceSimulation(state, segments, input, 50);
    }

    expect(state.player.speedMph).toBeGreaterThan(15);
    expect(state.player.z).toBeGreaterThan(50);
  });

  it('should decelerate when braking or coasting', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    state.player.speedMph = 80;

    // Coasting (no gas, no brake)
    const coastInput = createEmptyInput();
    updateRaceSimulation(state, segments, coastInput, 100);
    expect(state.player.speedMph).toBeLessThan(80);
    expect(state.player.speedMph).toBeGreaterThan(75);

    // Active braking
    const brakeInput = createEmptyInput();
    brakeInput.brake = true;
    updateRaceSimulation(state, segments, brakeInput, 100);
    expect(state.player.speedMph).toBeLessThan(70);
  });

  it('should cap top speed at bike.topSpeedMph due to aerodynamic drag', () => {
    const career = createInitialCareer();
    career.currentBikeId = 'shuriken_400'; // Top speed 112 MPH
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    // Force high speed
    state.player.speedMph = 140;

    const input = createEmptyInput();
    input.accelerate = true;

    for (let i = 0; i < 30; i++) {
      updateRaceSimulation(state, segments, input, 100);
    }

    expect(state.player.speedMph).toBeLessThanOrEqual(state.player.bike.topSpeedMph + 1);
  });

  it('should activate nitrous boost, boost top speed by +38 MPH, and fire onNitroActivate callback', () => {
    const career = createInitialCareer();
    career.currentBikeId = 'capek_850'; // Super bike with 3 nitro charges
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    const onNitroActivate = vi.fn();
    const callbacks: RaceEngineCallbacks = { onNitroActivate };

    expect(state.player.nitroRemaining).toBe(3);
    expect(state.player.nitroActive).toBe(false);

    const input = createEmptyInput();
    input.nitro = true;
    input.accelerate = true;

    updateRaceSimulation(state, segments, input, 50, callbacks);

    expect(onNitroActivate).toHaveBeenCalledTimes(1);
    expect(state.player.nitroRemaining).toBe(2);
    expect(state.player.nitroActive).toBe(true);
    expect(state.player.nitroTimerMs).toBe(NITRO_DURATION_MS - 50);
    expect(state.player.maxSpeedMph).toBe(state.player.bike.topSpeedMph + NITRO_TOP_SPEED_BONUS);

    // Fast-forward beyond 3000ms duration
    input.nitro = false;
    for (let i = 0; i < 35; i++) {
      updateRaceSimulation(state, segments, input, 100);
    }

    expect(state.player.nitroActive).toBe(false);
    expect(state.player.nitroTimerMs).toBe(0);
    expect(state.player.maxSpeedMph).toBe(state.player.bike.topSpeedMph);
  });

  it('should steer left and right according to cornering rating', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.palm_desert, 1);
    const state = createRaceSimulation('palm_desert', 1, career, segments);

    state.player.speedMph = 60;
    state.player.x = 0;

    const steerLeftInput = createEmptyInput();
    steerLeftInput.steerLeft = true;
    updateRaceSimulation(state, segments, steerLeftInput, 100);
    expect(state.player.x).toBeLessThan(0);

    const steerRightInput = createEmptyInput();
    steerRightInput.steerRight = true;
    updateRaceSimulation(state, segments, steerRightInput, 200);
    expect(state.player.x).toBeGreaterThan(0);
  });

  it('should apply centrifugal curve drift proportional to (speed/maxSpeed)^2 on curved segments', () => {
    const career = createInitialCareer();
    const segments: RoadSegment[] = [];
    // Segment with sharp right curve (+3.0)
    for (let i = 0; i < 20; i++) {
      segments.push({
        index: i,
        p1: { world: { x: 0, y: 0, z: i * 200 }, screen: { x: 0, y: 0, w: 0, scale: 0 }, camera: { x: 0, y: 0, z: 0 } },
        p2: { world: { x: 0, y: 0, z: (i + 1) * 200 }, screen: { x: 0, y: 0, w: 0, scale: 0 }, camera: { x: 0, y: 0, z: 0 } },
        curve: 3.0,
        elevation: 0,
        isDark: false,
        sprites: [],
        cars: [],
        clipY: 0,
      });
    }

    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    state.player.x = 0;
    state.player.speedMph = state.player.bike.topSpeedMph; // Full speed

    const noSteerInput = createEmptyInput();
    updateRaceSimulation(state, segments, noSteerInput, 100);

    // Positive curve (turning right) centrifugal force drifts rider to the left (negative x)
    expect(state.player.x).toBeLessThan(0);
  });

  it('should heavily decelerate player when riding off-road (|x| > 1.0)', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.grass_valley, 1);
    const state = createRaceSimulation('grass_valley', 1, career, segments);

    state.player.x = 1.35; // Shoulder/grass
    state.player.speedMph = 100;

    const input = createEmptyInput();
    input.accelerate = true;

    for (let i = 0; i < 20; i++) {
      updateRaceSimulation(state, segments, input, 100);
    }

    expect(state.player.speedMph).toBeLessThanOrEqual(45);
  });

  it('should trigger lateral slide on oil slick and speed burst on dirt mound', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.grass_valley, 1);
    // Inject oil slick at segment 0
    segments[0].sprites.push({
      id: 'test_oil',
      type: 'oil_slick',
      x: 0,
      z: 50,
      scale: 1,
      collidable: false,
      damageOnImpact: 0,
    });

    const state = createRaceSimulation('grass_valley', 1, career, segments);
    state.player.x = 0;
    state.player.speedMph = 80;

    const initialX = state.player.x;
    updateRaceSimulation(state, segments, createEmptyInput(), 100);

    // Oil slick causes lateral displacement
    expect(Math.abs(state.player.x - initialX)).toBeGreaterThan(0);

    // Inject dirt mound
    segments[1].sprites.push({
      id: 'test_mound',
      type: 'dirt_mound',
      x: 0,
      z: 250,
      scale: 1,
      collidable: false,
      damageOnImpact: 0,
      launchRampHeight: 20,
    });
    state.player.z = 240;
    state.player.x = 0;
    const speedBeforeMound = state.player.speedMph;
    updateRaceSimulation(state, segments, createEmptyInput(), 100);
    expect(state.player.speedMph).toBeGreaterThan(speedBeforeMound);
  });
});

describe('Combat System & Weapon Snatching', () => {
  it('should execute a kick attack with high lateral knockback', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.pacific_coast, 1);
    const state = createRaceSimulation('pacific_coast', 1, career, segments);

    const onCombatHit = vi.fn();
    const callbacks: RaceEngineCallbacks = { onCombatHit };

    // Place target rival directly alongside player
    const target = state.racers.find((r) => !r.isPlayer && !r.copProfile)!;
    target.z = state.player.z + 10;
    target.x = state.player.x + 0.25;
    const initialTargetX = target.x;
    const initialTargetStamina = target.stamina;

    const input = createEmptyInput();
    input.kick = true;

    updateRaceSimulation(state, segments, input, 50, callbacks);

    expect(onCombatHit).toHaveBeenCalled();
    const playerHit = onCombatHit.mock.calls.find((call) => call[0].attackerId === 'player');
    expect(playerHit).toBeDefined();
    expect(playerHit![0].action).toBe('kick');
    expect(target.x).toBeGreaterThan(initialTargetX); // Knocked to the right
    expect(target.stamina).toBeLessThan(initialTargetStamina);
    expect(state.player.attacking).toBe(true);
    expect(state.player.currentAttack).toBe('kick');
  });

  it('should use equipped weapon for punches (club, chain, crowbar)', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.pacific_coast, 1);
    const state = createRaceSimulation('pacific_coast', 1, career, segments);

    const target = state.racers.find((r) => !r.isPlayer && !r.copProfile)!;
    target.z = state.player.z + 10;
    target.x = state.player.x + 0.2;

    // Equip chain
    state.player.weapon = 'chain';

    const input = createEmptyInput();
    input.punch = true;

    updateRaceSimulation(state, segments, input, 50);

    expect(state.player.currentAttack).toBe('chain_whip');
    expect(target.stamina).toBe(100 - 38); // Chain damage is 38
  });

  it('should snatch weapon when an unarmed attacker punches an armed target', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    const onWeaponSnatch = vi.fn();
    const callbacks: RaceEngineCallbacks = { onWeaponSnatch };

    const player = state.player;
    player.weapon = 'fist'; // Unarmed

    // Target holding a club (e.g. Officer O'Leary or Biff)
    const target = state.racers.find((r) => r.weapon === 'club')!;
    expect(target).toBeDefined();
    target.z = player.z + 10;
    target.x = player.x + 0.25;
    target.attacking = true; // Winding up guarantees snatch

    const input = createEmptyInput();
    input.punch = true;

    updateRaceSimulation(state, segments, input, 50, callbacks);

    expect(onWeaponSnatch).toHaveBeenCalledTimes(1);
    expect(player.weapon).toBe('club');
    expect(target.weapon).toBe('fist');
  });

  it('should trigger a wipeout crash when target stamina is reduced to 0', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    const target = state.racers.find((r) => !r.isPlayer && !r.copProfile)!;
    target.z = state.player.z + 10;
    target.x = state.player.x + 0.25;
    target.stamina = 10; // Low stamina
    target.speedMph = 70;

    const input = createEmptyInput();
    input.kick = true; // Kick deals 15 damage -> depletes to 0

    updateRaceSimulation(state, segments, input, 50);

    expect(target.stamina).toBe(0);
    expect(target.crashData.state).toBe('flying');
    expect(target.speedMph).toBe(0);
  });
});

describe('Crash & Run-Back State Machine', () => {
  it('should initialize crash into flying state and reduce bike health based on impact', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    const player = state.player;

    player.speedMph = 100;
    player.z = 1000;
    player.x = 0;

    const onCrash = vi.fn();
    triggerCrash(player, 100, 'test_crash', { onCrash });

    expect(onCrash).toHaveBeenCalledTimes(1);
    expect(player.crashData.state).toBe('flying');
    expect(player.crashData.riderWorldZ).toBe(1000);
    expect(player.crashData.bikeWorldZ).toBeGreaterThan(1100); // Bike slid forward
    expect(player.bikeHealth).toBeLessThan(100);
    expect(player.speedMph).toBe(0);
  });

  it('should transition through flying -> tumbling -> getting_up -> running_to_bike -> mounting_bike -> none', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    const player = state.player;

    player.speedMph = 50;
    triggerCrash(player, 50, 'test');
    expect(player.crashData.state).toBe('flying');

    // 1. Advance through airborne flight until landing (tumbleVelocity.y <= 0)
    while (player.crashData.state === 'flying') {
      updateCrashState(player, 50, null, [], []);
    }
    expect(player.crashData.state).toBe('tumbling');

    // 2. Advance tumbling slide until rider stops
    while (player.crashData.state === 'tumbling') {
      updateCrashState(player, 50, null, [], []);
    }
    expect(player.crashData.state).toBe('getting_up');

    // 3. Advance getting up pause
    while (player.crashData.state === 'getting_up') {
      updateCrashState(player, 50, null, [], []);
    }
    expect(player.crashData.state).toBe('running_to_bike');

    // 4. Advance running back to motorcycle
    while (player.crashData.state === 'running_to_bike') {
      updateCrashState(player, 50, null, [], []);
    }
    expect(player.crashData.state).toBe('mounting_bike');

    // 5. Advance remount animation
    while (player.crashData.state === 'mounting_bike') {
      updateCrashState(player, 50, null, [], []);
    }
    expect(player.crashData.state).toBe('none');
    expect(player.z).toBe(player.crashData.bikeWorldZ);
  });

  it('should allow player to steer while running back to bike to dodge traffic', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    const player = state.player;

    player.crashData.state = 'running_to_bike';
    player.crashData.bikeWorldZ = 500;
    player.crashData.riderWorldZ = 100;
    player.crashData.bikeWorldX = 0;
    player.crashData.riderWorldX = 0;

    const steerRightInput = createEmptyInput();
    steerRightInput.steerRight = true;

    updateCrashState(player, 100, steerRightInput, [], []);
    expect(player.crashData.riderWorldX).toBeGreaterThan(0);
  });

  it('should knock running rider back into tumbling if hit by traffic on foot', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    const player = state.player;

    player.crashData.state = 'running_to_bike';
    player.crashData.bikeWorldZ = 500;
    player.crashData.riderWorldZ = 200;
    player.crashData.riderWorldX = 0.3;

    const trafficCar = {
      id: 'car_1',
      type: 'sedan' as const,
      direction: 'same' as const,
      x: 0.3,
      z: 202,
      speedMph: 50,
      color: '#fff',
      width: 0.35,
      length: 35,
      collided: false,
    };

    updateCrashState(player, 50, null, [trafficCar], []);
    expect(player.crashData.state).toBe('tumbling');
    expect(player.crashData.runOverCount).toBe(1);
  });

  it('should transition to wrecked_totaled when bike health reaches 0', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    const player = state.player;

    player.bikeHealth = 15; // Fragile
    player.speedMph = 140;

    const onPlayerWrecked = vi.fn();
    triggerCrash(player, 140, 'fatal_crash', { onPlayerWrecked });

    expect(player.bikeHealth).toBe(0);
    expect(player.crashData.state).toBe('wrecked_totaled');
    expect(onPlayerWrecked).toHaveBeenCalledTimes(1);
    expect(onPlayerWrecked.mock.calls[0][0]).toBeGreaterThan(0); // Repair cost
  });

  it('should bust player if a pursuing cop is near while player is down or on foot', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);
    const player = state.player;

    player.crashData.state = 'running_to_bike';
    player.crashData.riderWorldZ = 300;
    player.crashData.riderWorldX = 0.35;

    const cop = state.racers.find((r) => !!r.copProfile)!;
    cop.z = 310; // Within 40 units
    cop.x = 0.35;
    cop.copProfile!.state = 'pursuing';

    const onPlayerBusted = vi.fn();
    updateCrashState(player, 50, null, [], [cop], { onPlayerBusted });

    expect(player.crashData.state).toBe('busted');
    expect(onPlayerBusted).toHaveBeenCalledTimes(1);
  });
});

describe('AI Rivals & Police Pursuit Dynamics', () => {
  it('should trigger police pursuit and siren when player approaches patrolling cop', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.pacific_coast, 1);
    const state = createRaceSimulation('pacific_coast', 1, career, segments);

    const cop = state.racers.find((r) => !!r.copProfile)!;
    expect(cop.copProfile?.state).toBe('patrolling');

    const onCopPursuitStart = vi.fn();
    const callbacks: RaceEngineCallbacks = { onCopPursuitStart };

    // Position player right behind cop
    state.player.z = cop.z - 100;
    state.player.speedMph = 100;

    updateRaceSimulation(state, segments, createEmptyInput(), 100, callbacks);

    expect(cop.copProfile?.state).toBe('pursuing');
    expect(cop.copProfile?.sirenActive).toBe(true);
    expect(onCopPursuitStart).toHaveBeenCalledWith(cop);
  });
});

describe('Standings & Finish Line Qualification', () => {
  it('should sort standings dynamically by distance along track (1 to 15)', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    // Give player the furthest lead
    state.player.z = 5000;
    for (const r of state.racers) {
      if (!r.isPlayer) r.z = 1000;
    }

    updateRaceSimulation(state, segments, createEmptyInput(), 50);
    expect(state.player.finishPosition).toBe(1);

    // Move a rival ahead of the player
    const rival = state.racers.find((r) => !r.isPlayer && !r.copProfile)!;
    rival.z = 6000;

    updateRaceSimulation(state, segments, createEmptyInput(), 50);
    expect(state.player.finishPosition).toBe(2);
  });

  it('should finish race, award prize money and qualify when player places top 3', () => {
    const career = createInitialCareer();
    const segments = generateTrackSegments(TRACKS.sierra_nevada, 1);
    const state = createRaceSimulation('sierra_nevada', 1, career, segments);

    const onRaceFinished = vi.fn();
    const callbacks: RaceEngineCallbacks = { onRaceFinished };

    // Move player past the finish line in 1st place
    state.player.z = state.trackLengthWorld + 50;

    updateRaceSimulation(state, segments, createEmptyInput(), 50, callbacks);

    expect(state.raceFinished).toBe(true);
    expect(state.player.finishPosition).toBe(1);
    expect(state.player.finishTimeMs).toBeGreaterThan(0);
    expect(onRaceFinished).toHaveBeenCalledWith(1, 1000, true);
  });
});
