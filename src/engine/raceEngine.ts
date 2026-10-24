/**
 * Road Rash (1991 Sega Genesis) - Complete Simulation Engine
 * Physics, pseudo-3D road dynamics, combat & weapon snatching,
 * AI rivals & police pursuits, and crash & run-back state machine.
 */

import {
  CareerProgress,
  ChampionshipLevel,
  CombatActionType,
  CombatHitEvent,
  PlayerInput,
  RacerEntity,
  RaceSimulationState,
  RiderCrashData,
  RoadSegment,
  RoadsideObject,
  TrackId,
  TrackPreset,
  TrafficDirection,
  TrafficType,
  TrafficVehicle,
  WeaponType,
} from '../types';

import {
  AI_RIVALS,
  BIKES,
  BIKES_BY_ID,
  POLICE_OFFICERS,
  TRACKS,
  WEAPONS,
} from '../data/gameData';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

export const SEGMENT_LENGTH = 200;
export const SPEED_SCALE = 10; // World units per second at 1 MPH
export const CENTRIFUGAL_SCALE = 2.2;
export const MAX_LATERAL_OFFSET = 2.4;
export const OFFROAD_MAX_SPEED = 45;
export const OFFROAD_FRICTION = 65; // MPH/sec deceleration when off-road
export const BRAKE_DECELERATION = 150; // MPH/sec deceleration under braking
export const COAST_DECELERATION = 22; // MPH/sec natural rolling resistance
export const NITRO_DURATION_MS = 3000;
export const NITRO_TOP_SPEED_BONUS = 38; // +38 MPH during nitrous boost
export const NITRO_ACCEL_MULTIPLIER = 1.8; // 1.8x acceleration boost

// ============================================================================
// ENGINE CALLBACKS INTERFACE
// ============================================================================

export interface RaceEngineCallbacks {
  onCombatHit?: (event: CombatHitEvent, attackerName: string, targetName: string) => void;
  onWeaponSnatch?: (stealerName: string, victimName: string, weapon: WeaponType) => void;
  onCrash?: (racer: RacerEntity, severity: number) => void;
  onNitroActivate?: (racer: RacerEntity) => void;
  onCopPursuitStart?: (cop: RacerEntity) => void;
  onPlayerWrecked?: (repairCost: number) => void;
  onPlayerBusted?: (fineAmount: number, copName: string) => void;
  onRaceFinished?: (position: number, prizeWon: number, qualified: boolean) => void;
}

// ============================================================================
// DEFAULT ENTITY & SEGMENT CREATION
// ============================================================================

export function createInitialCrashData(x = 0, z = 0): RiderCrashData {
  return {
    state: 'none',
    riderWorldX: x,
    riderWorldZ: z,
    bikeWorldX: x,
    bikeWorldZ: z,
    distanceToBikeFeet: 0,
    tumbleVelocity: { x: 0, y: 0, z: 0 },
    runSpeed: 14,
    isStunned: false,
    stunDurationMs: 0,
    runOverCount: 0,
  };
}

export function createDefaultSegment(
  index: number,
  curve = 0,
  elevation = 0,
  isDark = false
): RoadSegment {
  const z1 = index * SEGMENT_LENGTH;
  const z2 = (index + 1) * SEGMENT_LENGTH;
  return {
    index,
    p1: {
      world: { x: 0, y: elevation, z: z1 },
      screen: { x: 0, y: 0, w: 0, scale: 0 },
      camera: { x: 0, y: 0, z: 0 },
    },
    p2: {
      world: { x: 0, y: elevation, z: z2 },
      screen: { x: 0, y: 0, w: 0, scale: 0 },
      camera: { x: 0, y: 0, z: 0 },
    },
    curve,
    elevation,
    isDark,
    sprites: [],
    cars: [],
    clipY: 0,
  };
}

/**
 * Procedurally generates authentic road segments for a track with hills,
 * curves, roadside vegetation, and hazard sprites.
 */
export function generateTrackSegments(track: TrackPreset, level: ChampionshipLevel): RoadSegment[] {
  const totalSegments = track.totalSegmentsByLevel[level] || 800;
  const segments: RoadSegment[] = [];

  const geometry = track.geometryPattern.length > 0
    ? track.geometryPattern
    : [{ lengthInSegments: 50, curve: 0, hill: 0 }];

  let geomIdx = 0;
  let remainingInGeom = geometry[0].lengthInSegments;
  let currentElevation = 0;

  for (let i = 0; i < totalSegments; i++) {
    const pattern = geometry[geomIdx];
    currentElevation += pattern.hill;
    const isDark = Math.floor(i / 3) % 2 === 0;

    const seg = createDefaultSegment(i, pattern.curve, currentElevation, isDark);

    // Place thematic roadside objects
    if (i % 6 === 0) {
      const side = (i / 6) % 2 === 0 ? 1 : -1;
      let spriteType: RoadsideObject['type'] = 'tree_pine';

      if (track.id === 'redwood_forest') spriteType = 'tree_redwood';
      else if (track.id === 'palm_desert') spriteType = i % 12 === 0 ? 'cactus_saguaro' : 'rock_boulder';
      else if (track.id === 'pacific_coast') spriteType = i % 12 === 0 ? 'tree_palm' : 'guardrail';
      else if (track.id === 'grass_valley') spriteType = i % 18 === 0 ? 'cow' : 'telephone_pole';
      else if (track.id === 'sierra_nevada') spriteType = i % 12 === 0 ? 'rock_boulder' : 'tree_pine';

      seg.sprites.push({
        id: `sprite_${i}`,
        type: spriteType,
        x: side * (1.3 + (i % 4) * 0.1),
        z: i * SEGMENT_LENGTH,
        scale: 1.0,
        collidable: spriteType !== 'tree_palm',
        damageOnImpact: 35,
      });
    }

    // Occasional curve warnings
    if (pattern.curve !== 0 && remainingInGeom === pattern.lengthInSegments - 2) {
      const signType = pattern.curve > 0 ? 'road_sign_curve_right' : 'road_sign_curve_left';
      seg.sprites.push({
        id: `sign_${i}`,
        type: signType,
        x: pattern.curve > 0 ? 1.25 : -1.25,
        z: i * SEGMENT_LENGTH,
        scale: 0.9,
        collidable: true,
        damageOnImpact: 20,
      });
    }

    // Occasional oil slicks & dirt mounds
    if (i > 30 && i % 85 === 0) {
      seg.sprites.push({
        id: `oil_${i}`,
        type: 'oil_slick',
        x: ((i % 5) - 2) * 0.25,
        z: i * SEGMENT_LENGTH,
        scale: 1.0,
        collidable: false,
        damageOnImpact: 0,
      });
    } else if (i > 40 && i % 95 === 0) {
      seg.sprites.push({
        id: `dirt_${i}`,
        type: 'dirt_mound',
        x: ((i % 3) - 1) * 0.35,
        z: i * SEGMENT_LENGTH,
        scale: 1.0,
        collidable: false,
        damageOnImpact: 0,
        launchRampHeight: 18,
      });
    }

    segments.push(seg);

    remainingInGeom--;
    if (remainingInGeom <= 0) {
      geomIdx = (geomIdx + 1) % geometry.length;
      remainingInGeom = geometry[geomIdx].lengthInSegments;
    }
  }

  return segments;
}

/**
 * Creates initial traffic vehicles and distributes them along track lanes.
 */
export function generateInitialTraffic(
  track: TrackPreset,
  level: ChampionshipLevel,
  totalSegments: number,
  trackLengthWorld: number
): TrafficVehicle[] {
  const density = track.trafficDensityByLevel[level] || 0.15;
  const carCount = Math.max(12, Math.floor(totalSegments * density * 0.2));
  const vehicles: TrafficVehicle[] = [];

  const trafficTypes: TrafficType[] = [
    'sedan',
    'station_wagon',
    'pickup',
    'convertible',
    'semi_truck',
    'sports_car',
  ];
  const vehicleColors = ['#c83232', '#2a5a9c', '#dce0e6', '#e5aa17', '#387a3e', '#54504d', '#722f37'];

  const spacing = trackLengthWorld / (carCount + 1);

  for (let i = 0; i < carCount; i++) {
    const isSame = i % 2 === 0;
    const direction: TrafficDirection = isSame ? 'same' : 'oncoming';

    // Right lane: x in [0.15, 0.75]
    // Left lane:  x in [-0.75, -0.15]
    const x = isSame
      ? 0.20 + (i % 4) * 0.14
      : -0.68 + (i % 4) * 0.14;

    const z = Math.min(trackLengthWorld - 500, Math.max(400, (i + 1) * spacing + ((i * 37) % 150)));
    const speedMph = isSame ? 48 + (i % 4) * 6 : 52 + (i % 4) * 5;

    vehicles.push({
      id: `traffic_${i + 1}`,
      type: trafficTypes[i % trafficTypes.length],
      direction,
      x,
      z,
      speedMph,
      color: vehicleColors[i % vehicleColors.length],
      width: 0.35,
      length: 35,
      collided: false,
    });
  }

  return vehicles;
}

export function getAllTrafficVehicles(segments: RoadSegment[]): TrafficVehicle[] {
  const cars: TrafficVehicle[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segCars = segments[i].cars;
    for (let j = 0; j < segCars.length; j++) {
      cars.push(segCars[j]);
    }
  }
  return cars;
}

// ============================================================================
// 1. CREATE RACE SIMULATION
// ============================================================================

export function createRaceSimulation(
  trackId: TrackId,
  level: ChampionshipLevel,
  career: CareerProgress,
  segments?: RoadSegment[]
): RaceSimulationState {
  const track = TRACKS[trackId] || TRACKS.sierra_nevada;
  const totalSegments = segments ? segments.length : (track.totalSegmentsByLevel[level] || 800);
  const segmentLengthWorld = SEGMENT_LENGTH;
  const trackLengthWorld = totalSegments * segmentLengthWorld;

  // 1. Player RacerEntity
  const playerBike = BIKES_BY_ID[career.currentBikeId] || BIKES[0];
  const player: RacerEntity = {
    id: 'player',
    name: 'Player',
    isPlayer: true,
    bike: playerBike,
    x: 0,
    z: 0,
    speedMph: 0,
    maxSpeedMph: playerBike.topSpeedMph,
    stamina: 100,
    maxStamina: 100,
    bikeHealth: 100,
    weapon: 'fist',
    attacking: false,
    attackCooldownMs: 0,
    crashData: createInitialCrashData(0, 0),
    finishPosition: null,
    finishTimeMs: null,
    nitroRemaining: playerBike.nitroCharges,
    nitroActive: false,
    nitroTimerMs: 0,
  };

  // 2. 14 AI Rival RacerEntity instances
  const rivals: RacerEntity[] = AI_RIVALS.map((rival, index) => {
    const scaling = rival.levelScaling[level] || rival.levelScaling[1];
    const bikeId = scaling.bikeUpgradeId || rival.bikeId;
    const bike = BIKES_BY_ID[bikeId] || BIKES[0];
    const weapon = scaling.weaponUpgrade || rival.preferredWeapon;
    const speedBonus = scaling.speedBonusMph || 0;
    const maxSpeedMph = (bike.topSpeedMph + speedBonus) * rival.speedMultiplier;

    // Stagger starting grid positions
    const gridRow = Math.floor(index / 2) + 1;
    const laneSide = index % 2 === 0 ? 0.35 : -0.35;
    const startZ = gridRow * 30;

    return {
      id: `rival_${rival.id}`,
      name: rival.name,
      isPlayer: false,
      bike,
      x: laneSide,
      z: startZ,
      speedMph: 0,
      maxSpeedMph,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon,
      attacking: false,
      attackCooldownMs: 0,
      crashData: createInitialCrashData(laneSide, startZ),
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: bike.nitroCharges,
      nitroActive: false,
      nitroTimerMs: 0,
      rivalProfile: rival,
    };
  });

  // 3. 1-2 Police Officers spaced along track
  const cops: RacerEntity[] = [];
  const copCount = level >= 3 ? 2 : 1;

  for (let i = 0; i < copCount && i < POLICE_OFFICERS.length; i++) {
    const copTemplate = POLICE_OFFICERS[i];
    const copBike = BIKES_BY_ID[copTemplate.bikeId] || BIKES[0];
    const copZ = copCount === 1
      ? trackLengthWorld * 0.38
      : (i === 0 ? trackLengthWorld * 0.28 : trackLengthWorld * 0.65);

    const copEntity: RacerEntity = {
      id: `cop_${copTemplate.id}`,
      name: copTemplate.name,
      isPlayer: false,
      bike: copBike,
      x: 0.35,
      z: copZ,
      speedMph: 72,
      maxSpeedMph: copTemplate.pursuitSpeedMph,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'club',
      attacking: false,
      attackCooldownMs: 0,
      crashData: createInitialCrashData(0.35, copZ),
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: copBike.nitroCharges,
      nitroActive: false,
      nitroTimerMs: 0,
      copProfile: {
        ...copTemplate,
        state: 'patrolling',
        sirenActive: false,
      },
    };
    cops.push(copEntity);
  }

  // 4. Traffic Vehicles Generation
  const trafficVehicles = generateInitialTraffic(track, level, totalSegments, trackLengthWorld);

  if (segments && segments.length > 0) {
    for (const vehicle of trafficVehicles) {
      let segIdx = Math.floor(vehicle.z / segmentLengthWorld) % segments.length;
      if (segIdx < 0) segIdx += segments.length;
      segments[segIdx].cars.push(vehicle);
    }
  }

  const racers: RacerEntity[] = [player, ...rivals, ...cops];

  return {
    track,
    level,
    racers,
    player,
    trackLengthWorld,
    segmentLengthWorld,
    totalSegments,
    cameraZ: 0,
    cameraDepth: 0.84,
    elapsedTimeMs: 0,
    raceFinished: false,
    qualifyingThreshold: 3,
  };
}

// ============================================================================
// 2. COMBAT & WEAPON SNATCHING ENGINE
// ============================================================================

/**
 * Resolves a combat attack from an attacker toward target racer entity.
 */
export function executeAttack(
  attacker: RacerEntity,
  target: RacerEntity,
  action: CombatActionType,
  callbacks?: RaceEngineCallbacks,
  elapsedTimeMs = 0
): CombatHitEvent {
  const weaponType = attacker.weapon;
  const isKick = action === 'kick';

  const damage = isKick ? 15 : (WEAPONS[weaponType]?.damage ?? 15);
  const knockback = isKick ? 28 : (WEAPONS[weaponType]?.knockback ?? 15);

  // Lateral knockback shove direction
  const shoveDir = target.x >= attacker.x ? 1 : -1;
  target.x += shoveDir * (knockback / 100) * 0.45;
  target.x = Math.max(-MAX_LATERAL_OFFSET, Math.min(MAX_LATERAL_OFFSET, target.x));

  // Stamina reduction
  target.stamina = Math.max(0, target.stamina - damage);

  // Weapon Snatching Mechanic:
  // If an unarmed ('fist') attacker punches (not kicks) a target holding a snatchable weapon:
  let snatchedWeapon = false;
  if (
    !isKick &&
    attacker.weapon === 'fist' &&
    target.weapon !== 'fist' &&
    target.weapon !== 'none' &&
    WEAPONS[target.weapon]?.snatchable
  ) {
    const isWindingUpOrStaggered = target.attacking || target.attackCooldownMs > 0;
    // Guaranteed if winding up/staggered, 80% otherwise
    const snatchChance = isWindingUpOrStaggered ? 1.0 : 0.80;
    if (Math.random() <= snatchChance) {
      const stolen = target.weapon;
      attacker.weapon = stolen;
      target.weapon = 'fist';
      snatchedWeapon = true;
      callbacks?.onWeaponSnatch?.(attacker.name, target.name, stolen);
    }
  }

  // Knockout check
  const targetWipedOut = target.stamina <= 0;
  if (targetWipedOut && target.crashData.state === 'none') {
    triggerCrash(target, target.speedMph, 'combat_knockout', callbacks);
  }

  const hitEvent: CombatHitEvent = {
    attackerId: attacker.id,
    targetId: target.id,
    weapon: attacker.weapon,
    action,
    damage,
    snatchedWeapon,
    targetWipedOut,
    timestamp: elapsedTimeMs,
  };

  callbacks?.onCombatHit?.(hitEvent, attacker.name, target.name);
  return hitEvent;
}

// ============================================================================
// 3. CRASH & WIPEOUT STATE MACHINE
// ============================================================================

/**
 * Triggers a motorcycle wipeout crash, separating the rider from their bike.
 */
export function triggerCrash(
  racer: RacerEntity,
  impactSpeedMph: number,
  _reason = 'wipeout',
  callbacks?: RaceEngineCallbacks
): void {
  if (racer.crashData.state !== 'none') return;

  const slideDist = Math.max(60, impactSpeedMph * 1.6);
  const riderZ = racer.z;
  const bikeZ = racer.z + slideDist;

  racer.crashData = {
    state: 'flying',
    riderWorldX: racer.x,
    riderWorldZ: riderZ,
    bikeWorldX: racer.x,
    bikeWorldZ: bikeZ,
    distanceToBikeFeet: Math.round(slideDist * 0.5),
    tumbleVelocity: {
      x: (Math.random() - 0.5) * 6,
      y: 16, // airborne leap
      z: impactSpeedMph * 0.7,
    },
    runSpeed: 14,
    isStunned: false,
    stunDurationMs: 0,
    runOverCount: 0,
  };

  racer.speedMph = 0;
  racer.nitroActive = false;
  racer.nitroTimerMs = 0;
  racer.attacking = false;

  // Durability reduces bike damage from impact
  const durabilityFactor = Math.max(0.15, 1 - racer.bike.durability / 140);
  const bikeDamage = Math.max(12, Math.round((impactSpeedMph / Math.max(90, racer.bike.topSpeedMph)) * 55 * durabilityFactor));
  racer.bikeHealth = Math.max(0, racer.bikeHealth - bikeDamage);

  const severity = Math.min(10, Math.max(1, Math.round(impactSpeedMph / 18)));
  callbacks?.onCrash?.(racer, severity);

  // Check if player's bike is completely totaled
  if (racer.isPlayer && racer.bikeHealth <= 0) {
    racer.crashData.state = 'wrecked_totaled';
    const repairCost = Math.round(racer.bike.price * 0.45);
    callbacks?.onPlayerWrecked?.(repairCost);
  }
}

/**
 * Advances the crash progression:
 * flying -> tumbling -> getting_up -> running_to_bike -> mounting_bike -> none
 */
export function updateCrashState(
  racer: RacerEntity,
  dtMs: number,
  input: PlayerInput | null,
  trafficVehicles: TrafficVehicle[],
  cops: RacerEntity[],
  callbacks?: RaceEngineCallbacks
): void {
  const cd = racer.crashData;
  if (cd.state === 'none') return;

  // Terminal states
  if (cd.state === 'wrecked_totaled' || cd.state === 'busted') return;

  const dtSec = dtMs / 1000;

  // Check police apprehension while player is down or on foot
  if (racer.isPlayer && (cd.state === 'tumbling' || cd.state === 'getting_up' || cd.state === 'running_to_bike')) {
    const copClose = cops.find((cop) => {
      const isPatrolOrPursuit = cop.copProfile && cop.copProfile.state !== 'crashed';
      const dz = Math.abs(cop.z - cd.riderWorldZ);
      const dx = Math.abs(cop.x - cd.riderWorldX);
      return isPatrolOrPursuit && dz < 40 && dx < 0.65;
    });

    if (copClose) {
      cd.state = 'busted';
      const fine = copClose.copProfile?.fineAmountByLevel[1] ?? 500;
      callbacks?.onPlayerBusted?.(fine, copClose.name);
      return;
    }
  }

  switch (cd.state) {
    case 'flying': {
      cd.tumbleVelocity.y -= 38 * dtSec; // gravity
      cd.riderWorldZ += cd.tumbleVelocity.z * dtSec * SPEED_SCALE;
      cd.riderWorldX += cd.tumbleVelocity.x * dtSec;

      if (cd.tumbleVelocity.y <= 0) {
        cd.state = 'tumbling';
        cd.stunDurationMs = 600;
      }
      break;
    }

    case 'tumbling': {
      cd.tumbleVelocity.z = Math.max(0, cd.tumbleVelocity.z - 50 * dtSec);
      cd.riderWorldZ += cd.tumbleVelocity.z * dtSec * SPEED_SCALE;
      cd.stunDurationMs -= dtMs;

      if (cd.stunDurationMs <= 0 || cd.tumbleVelocity.z <= 0) {
        cd.state = 'getting_up';
        cd.stunDurationMs = 500;
      }
      break;
    }

    case 'getting_up': {
      cd.stunDurationMs -= dtMs;
      if (cd.stunDurationMs <= 0) {
        cd.state = 'running_to_bike';
      }
      break;
    }

    case 'running_to_bike': {
      const dz = cd.bikeWorldZ - cd.riderWorldZ;
      const dx = cd.bikeWorldX - cd.riderWorldX;
      cd.distanceToBikeFeet = Math.max(0, Math.round(Math.abs(dz) * 0.5));

      // Automated run trajectory toward motorcycle
      const runZStep = cd.runSpeed * dtSec * SPEED_SCALE * 0.65;
      if (Math.abs(dz) <= runZStep) {
        cd.riderWorldZ = cd.bikeWorldZ;
      } else {
        cd.riderWorldZ += Math.sign(dz) * runZStep;
      }

      const runXStep = 1.0 * dtSec;
      if (Math.abs(dx) <= runXStep) {
        cd.riderWorldX = cd.bikeWorldX;
      } else {
        cd.riderWorldX += Math.sign(dx) * runXStep;
      }

      // Player lateral steering to dodge traffic on foot
      if (racer.isPlayer && input) {
        if (input.steerLeft) cd.riderWorldX -= 1.4 * dtSec;
        if (input.steerRight) cd.riderWorldX += 1.4 * dtSec;
      }
      cd.riderWorldX = Math.max(-MAX_LATERAL_OFFSET, Math.min(MAX_LATERAL_OFFSET, cd.riderWorldX));

      // Sync racer position to runner
      racer.x = cd.riderWorldX;
      racer.z = cd.riderWorldZ;

      // Traffic collision while on foot knocks back into tumbling
      for (const car of trafficVehicles) {
        if (Math.abs(car.z - cd.riderWorldZ) < 18 && Math.abs(car.x - cd.riderWorldX) < 0.32) {
          cd.runOverCount++;
          cd.state = 'tumbling';
          cd.stunDurationMs = 700;
          cd.tumbleVelocity = {
            x: (Math.random() - 0.5) * 6,
            y: 6,
            z: Math.max(16, car.speedMph * 0.4),
          };
          racer.stamina = Math.max(0, racer.stamina - 20);
          callbacks?.onCrash?.(racer, 2);
          return;
        }
      }

      // Reaching bike remount threshold
      if (Math.abs(cd.riderWorldZ - cd.bikeWorldZ) < 8 && Math.abs(cd.riderWorldX - cd.bikeWorldX) < 0.45) {
        cd.state = 'mounting_bike';
        cd.stunDurationMs = 450;
      }
      break;
    }

    case 'mounting_bike': {
      cd.stunDurationMs -= dtMs;
      if (cd.stunDurationMs <= 0) {
        // Back in the race!
        cd.state = 'none';
        racer.z = cd.bikeWorldZ;
        racer.x = cd.bikeWorldX;
        racer.speedMph = 0;
        racer.stamina = Math.min(100, racer.stamina + 35);
      }
      break;
    }
  }
}

// ============================================================================
// 4. MAIN SIMULATION UPDATE LOOP
// ============================================================================

export function updateRaceSimulation(
  state: RaceSimulationState,
  segments: RoadSegment[],
  input: PlayerInput,
  dtMs: number,
  callbacks?: RaceEngineCallbacks
): void {
  const dtSec = dtMs / 1000;
  state.elapsedTimeMs += dtMs;

  const player = state.player;
  const allTraffic = getAllTrafficVehicles(segments);
  const cops = state.racers.filter((r) => !!r.copProfile);

  // --------------------------------------------------------------------------
  // A. PLAYER MOTORCYCLE PHYSICS & COMBAT INPUT
  // --------------------------------------------------------------------------
  if (player.crashData.state === 'none') {
    // 1. Nitrous Oxide Activation
    if (input.nitro && player.nitroRemaining > 0 && !player.nitroActive) {
      player.nitroRemaining--;
      player.nitroActive = true;
      player.nitroTimerMs = NITRO_DURATION_MS;
      callbacks?.onNitroActivate?.(player);
    }

    if (player.nitroActive) {
      player.nitroTimerMs -= dtMs;
      if (player.nitroTimerMs <= 0) {
        player.nitroActive = false;
        player.nitroTimerMs = 0;
      }
    }

    // 2. Throttle & Acceleration
    const topSpeed = player.bike.topSpeedMph + (player.nitroActive ? NITRO_TOP_SPEED_BONUS : 0);
    player.maxSpeedMph = topSpeed;

    if (input.accelerate) {
      let baseAccel = 12 + (player.bike.acceleration / 100) * 28 + (player.bike.hp / 235) * 16;
      if (player.nitroActive) baseAccel *= NITRO_ACCEL_MULTIPLIER;

      const powerDropoff = Math.max(0.15, 1 - (player.speedMph / topSpeed) * 0.72);
      player.speedMph = Math.min(topSpeed, player.speedMph + baseAccel * powerDropoff * dtSec);
    } else if (input.brake) {
      player.speedMph = Math.max(0, player.speedMph - BRAKE_DECELERATION * dtSec);
    } else {
      player.speedMph = Math.max(0, player.speedMph - COAST_DECELERATION * dtSec);
    }

    // Aerodynamic Drag when above top speed
    if (player.speedMph > topSpeed) {
      player.speedMph = Math.max(topSpeed, player.speedMph - 42 * dtSec);
    }

    // 3. Off-Road Drag & Slowdown
    if (Math.abs(player.x) > 1.0) {
      if (player.speedMph > OFFROAD_MAX_SPEED) {
        player.speedMph = Math.max(OFFROAD_MAX_SPEED, player.speedMph - OFFROAD_FRICTION * dtSec);
      }
    }

    // 4. Steering Scaled by Cornering Rating
    const corneringRating = (player.bike.cornering / 100) * 2.2;
    const speedRatio = Math.min(1.0, Math.max(0.2, player.speedMph / 50));
    const steerDelta = corneringRating * speedRatio * dtSec;

    if (input.steerLeft) player.x -= steerDelta;
    if (input.steerRight) player.x += steerDelta;

    // 5. Centrifugal Curve Drift: -curve * (speed / maxSpeed)^2
    if (segments.length > 0) {
      let segIdx = Math.floor(player.z / state.segmentLengthWorld) % segments.length;
      if (segIdx < 0) segIdx += segments.length;
      const currentSegment = segments[segIdx];

      if (currentSegment && currentSegment.curve !== 0) {
        const normSpeed = Math.min(1.4, player.speedMph / Math.max(1, player.bike.topSpeedMph));
        const centrifugal = -currentSegment.curve * Math.pow(normSpeed, 2) * CENTRIFUGAL_SCALE * dtSec;
        player.x += centrifugal;
      }

      // 6. Roadside Sprites Interaction (Oil Slicks, Dirt Mounds, Obstacles)
      if (currentSegment) {
        for (const sprite of currentSegment.sprites) {
          const dx = Math.abs(player.x - sprite.x);
          if (sprite.type === 'oil_slick' && dx < 0.35) {
            // Lateral slide
            player.x += (player.x >= sprite.x ? 1 : -1) * 1.6 * dtSec;
            player.speedMph = Math.max(0, player.speedMph - 15 * dtSec);
          } else if (sprite.type === 'dirt_mound' && dx < 0.35) {
            // Airborne launch burst
            player.speedMph = Math.min(topSpeed + 15, player.speedMph + 6.0);
          } else if (sprite.collidable && dx < 0.26) {
            triggerCrash(player, player.speedMph, 'obstacle_impact', callbacks);
            break;
          }
        }
      }
    }

    player.x = Math.max(-MAX_LATERAL_OFFSET, Math.min(MAX_LATERAL_OFFSET, player.x));

    // 7. Player Combat Trigger (Punch or Kick)
    if (player.attackCooldownMs <= 0) {
      if (input.punch || input.kick) {
        const isKick = input.kick;
        let action: CombatActionType = isKick ? 'kick' : 'punch';

        if (!isKick) {
          if (player.weapon === 'club') action = 'club_swing';
          else if (player.weapon === 'chain') action = 'chain_whip';
          else if (player.weapon === 'crowbar') action = 'crowbar_strike';
        }

        const swingDuration = isKick ? 260 : (WEAPONS[player.weapon]?.swingDurationMs ?? 250);
        player.attackCooldownMs = swingDuration;
        player.attacking = true;
        player.currentAttack = action;

        // Find closest target rival/cop
        const rangeDist = isKick ? 1.8 : (WEAPONS[player.weapon]?.rangeDistance ?? 1.8);
        const maxZReach = rangeDist * 28;

        const targets = state.racers.filter((r) => {
          if (r.id === player.id || r.crashData.state !== 'none') return false;
          const dz = Math.abs(r.z - player.z);
          const dx = Math.abs(r.x - player.x);
          return dz <= maxZReach && dx <= 0.46;
        });

        if (targets.length > 0) {
          targets.sort((a, b) => Math.hypot(a.z - player.z, a.x - player.x) - Math.hypot(b.z - player.z, b.x - player.x));
          executeAttack(player, targets[0], action, callbacks, state.elapsedTimeMs);
        }
      }
    }

    // Forward displacement
    player.z += player.speedMph * SPEED_SCALE * dtSec;
  } else {
    // Player is in crash state machine
    updateCrashState(player, dtMs, input, allTraffic, cops, callbacks);
  }

  // Decay attack cooldown for player
  if (player.attackCooldownMs > 0) {
    player.attackCooldownMs -= dtMs;
    if (player.attackCooldownMs <= 0) {
      player.attacking = false;
      player.currentAttack = undefined;
    }
  }

  // --------------------------------------------------------------------------
  // B. AI RIVALS & POLICE PURSUIT BEHAVIOR
  // --------------------------------------------------------------------------
  for (const racer of state.racers) {
    if (racer.isPlayer) continue;

    // Decay attack cooldown
    if (racer.attackCooldownMs > 0) {
      racer.attackCooldownMs -= dtMs;
      if (racer.attackCooldownMs <= 0) {
        racer.attacking = false;
        racer.currentAttack = undefined;
      }
    }

    if (racer.crashData.state !== 'none') {
      updateCrashState(racer, dtMs, null, allTraffic, cops, callbacks);
      continue;
    }

    // 1. Police Cruiser / Bike AI
    if (racer.copProfile) {
      const cop = racer.copProfile;
      const dzToPlayer = player.z - racer.z;

      if (cop.state === 'patrolling') {
        racer.speedMph = 76;
        // Engage pursuit when player approaches or passes within 500 units
        if (Math.abs(dzToPlayer) < 550 && player.z >= racer.z - 220) {
          cop.state = 'pursuing';
          cop.sirenActive = true;
          callbacks?.onCopPursuitStart?.(racer);
        }
      } else if (cop.state === 'pursuing' || cop.state === 'attacking') {
        // High-speed pursuit
        if (racer.speedMph < racer.maxSpeedMph) {
          racer.speedMph = Math.min(racer.maxSpeedMph, racer.speedMph + 38 * dtSec);
        }

        // Steer toward player lateral lane
        const dx = player.x - racer.x;
        racer.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.25 * dtSec);

        // Cop attacks player with club when alongside
        const distZ = Math.abs(player.z - racer.z);
        const distX = Math.abs(player.x - racer.x);

        if (distZ < 28 && distX < 0.44 && racer.attackCooldownMs <= 0 && player.crashData.state === 'none') {
          cop.state = 'attacking';
          racer.attacking = true;
          racer.attackCooldownMs = WEAPONS.club.swingDurationMs;
          racer.currentAttack = 'club_swing';
          executeAttack(racer, player, 'club_swing', callbacks, state.elapsedTimeMs);
        }
      }

      racer.z += racer.speedMph * SPEED_SCALE * dtSec;
      continue;
    }

    // 2. AI Rival Competitors
    if (racer.rivalProfile) {
      const rival = racer.rivalProfile;

      // Dynamic Rubber-Banding based on distance to player
      const dz = racer.z - player.z;
      let targetSpeed = racer.maxSpeedMph;

      if (dz > 900) {
        targetSpeed = racer.maxSpeedMph * 0.88; // Pace down if way ahead
      } else if (dz < -450) {
        targetSpeed = racer.maxSpeedMph * 1.06; // Catch up if behind
      }

      if (racer.speedMph < targetSpeed) {
        racer.speedMph = Math.min(targetSpeed, racer.speedMph + 26 * dtSec);
      } else {
        racer.speedMph = Math.max(targetSpeed, racer.speedMph - 18 * dtSec);
      }

      // Racing Line & Centrifugal drift
      if (segments.length > 0) {
        let segIdx = Math.floor(racer.z / state.segmentLengthWorld) % segments.length;
        if (segIdx < 0) segIdx += segments.length;
        const currentSeg = segments[segIdx];
        if (currentSeg && currentSeg.curve !== 0) {
          const normSpeed = Math.min(1.4, racer.speedMph / Math.max(1, racer.bike.topSpeedMph));
          const drift = -currentSeg.curve * Math.pow(normSpeed, 2) * CENTRIFUGAL_SCALE * (1 - rival.skill * 0.45) * dtSec;
          racer.x += drift;
        }
      }

      // Traffic Avoidance
      for (const car of allTraffic) {
        const carDz = car.z - racer.z;
        const carDx = Math.abs(car.x - racer.x);
        if (carDz > 0 && carDz < 140 && carDx < 0.35) {
          // Steer away into open asphalt
          racer.x += (racer.x > 0 ? -1 : 1) * 1.8 * dtSec;
          break;
        }
      }

      racer.x = Math.max(-1.1, Math.min(1.1, racer.x));

      // AI Rival Combat against player
      if (player.crashData.state === 'none' && racer.attackCooldownMs <= 0) {
        const dzToPlayer = Math.abs(player.z - racer.z);
        const dxToPlayer = Math.abs(player.x - racer.x);

        if (dzToPlayer < 26 && dxToPlayer < 0.42) {
          // Attack probability driven by aggression
          if (Math.random() < rival.aggression * 0.08) {
            const useKick = Math.random() < 0.35;
            let action: CombatActionType = useKick ? 'kick' : 'punch';
            if (!useKick) {
              if (racer.weapon === 'club') action = 'club_swing';
              else if (racer.weapon === 'chain') action = 'chain_whip';
              else if (racer.weapon === 'crowbar') action = 'crowbar_strike';
            }

            racer.attacking = true;
            racer.attackCooldownMs = useKick ? 260 : (WEAPONS[racer.weapon]?.swingDurationMs ?? 250);
            racer.currentAttack = action;
            executeAttack(racer, player, action, callbacks, state.elapsedTimeMs);
          }
        }
      }

      racer.z += racer.speedMph * SPEED_SCALE * dtSec;
    }
  }

  // --------------------------------------------------------------------------
  // C. TRAFFIC MOVEMENT & RACER COLLISIONS
  // --------------------------------------------------------------------------
  if (segments.length > 0) {
    // Clear segments' cars
    for (let i = 0; i < segments.length; i++) {
      segments[i].cars = [];
    }

    // Move cars and repopulate segments
    for (const car of allTraffic) {
      if (car.direction === 'same') {
        car.z += car.speedMph * SPEED_SCALE * dtSec;
        if (car.z >= state.trackLengthWorld) car.z -= state.trackLengthWorld;
      } else {
        car.z -= car.speedMph * SPEED_SCALE * dtSec;
        if (car.z < 0) car.z += state.trackLengthWorld;
      }

      let segIdx = Math.floor(car.z / state.segmentLengthWorld) % segments.length;
      if (segIdx < 0) segIdx += segments.length;
      segments[segIdx].cars.push(car);

      // Check racer collisions with traffic
      for (const racer of state.racers) {
        if (racer.crashData.state === 'none') {
          const dz = Math.abs(car.z - racer.z);
          const dx = Math.abs(car.x - racer.x);
          if (dz < 18 && dx < 0.30) {
            car.collided = true;
            const impact = racer.speedMph + (car.direction === 'oncoming' ? car.speedMph * 0.5 : 0);
            triggerCrash(racer, impact, 'traffic_collision', callbacks);
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // D. STANDINGS, CAMERA & FINISH LINE
  // --------------------------------------------------------------------------
  state.cameraZ = player.z;

  // Standings among the 15 competitors (player + 14 rivals, excluding cops)
  const competitors = state.racers.filter((r) => !r.copProfile);

  competitors.sort((a, b) => {
    if (a.finishTimeMs !== null && b.finishTimeMs !== null) {
      return (a.finishPosition ?? 0) - (b.finishPosition ?? 0);
    }
    if (a.finishTimeMs !== null) return -1;
    if (b.finishTimeMs !== null) return 1;
    return b.z - a.z;
  });

  competitors.forEach((racer, idx) => {
    if (racer.finishTimeMs === null) {
      racer.finishPosition = idx + 1;
    }
  });

  // Finish line check for player
  if (player.z >= state.trackLengthWorld && !state.raceFinished) {
    state.raceFinished = true;
    const finalPos = player.finishPosition ?? 1;
    player.finishPosition = finalPos;
    player.finishTimeMs = state.elapsedTimeMs;

    const cashPrizes = state.track.cashPrizesByLevel[state.level] || [1000, 600, 300];
    const prizeWon = finalPos <= 3 ? cashPrizes[finalPos - 1] : 0;
    const qualified = finalPos <= state.qualifyingThreshold;

    callbacks?.onRaceFinished?.(finalPos, prizeWon, qualified);
  }

  // Finish line check for AI rivals
  for (const rival of competitors) {
    if (!rival.isPlayer && rival.z >= state.trackLengthWorld && rival.finishTimeMs === null) {
      rival.finishTimeMs = state.elapsedTimeMs;
    }
  }
}
