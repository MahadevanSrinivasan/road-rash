/**
 * Road Rash (1991 Sega Genesis) - Graphics & Renderer Test Suite
 * Comprehensive verification for procedural 16-bit sprite generation,
 * sprite caching, track segment generation, pseudo-3D road rasterization,
 * and rear-view mirrors.
 */

import { describe, expect, it } from 'vitest';
import { TRACKS, BIKES, AI_RIVALS, POLICE_OFFICERS } from '../data/gameData';
import {
  ChampionshipLevel,
  RacerEntity,
  RaceSimulationState,
  RivalName,
  RoadsideSpriteType,
  TrafficDirection,
  TrafficType,
} from '../types';
import {
  clearSpriteCache,
  createMockCanvas,
  createOffscreenCanvas,
  getCombatSparkSprite,
  getEffectSprite,
  getFrontBikeSprite,
  getNitroFlameSprite,
  getPortraitSprite,
  getRacerSprite,
  getRiderPalette,
  getRoadsideSprite,
  getSmokeSprite,
  getTrafficSprite,
  RacerPose,
  RIVAL_PALETTES,
  PLAYER_PALETTE,
  COP_PALETTE,
} from './spriteGenerator';
import {
  buildTrackSegments,
  renderRaceView,
  renderRearViewMirror,
  SEGMENT_LENGTH,
  ROAD_WIDTH,
  DRAW_DISTANCE,
} from './roadRenderer';

describe('16-Bit Procedural Sprite Generator', () => {
  it('should create valid offscreen canvas or mock canvas in headless test environment', () => {
    const canvas = createOffscreenCanvas(64, 64);
    expect(canvas).toBeDefined();
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
    const ctx = canvas.getContext('2d');
    expect(ctx).toBeDefined();

    const mock = createMockCanvas(32, 32);
    expect(mock.width).toBe(32);
    expect(mock.height).toBe(32);
    expect(mock.getContext('2d')).toBeDefined();
  });

  it('should provide distinct palettes for Player, Cops, and all 14 AI Rivals', () => {
    expect(PLAYER_PALETTE.jacketPrimary).toBe('#c82020');
    expect(PLAYER_PALETTE.jacketSecondary).toBe('#ffffff');
    expect(COP_PALETTE.jacketPrimary).toBe('#142240');
    expect(COP_PALETTE.helmetPrimary).toBe('#f8f8f8');

    const rivalNames: RivalName[] = [
      'Biff', 'Natasha', 'Slater', 'Ikira', 'P.E. No. 1', 'Viper', 'Helga',
      'Rude Boy', 'Gino', 'Butch', 'Sven', 'Tanya', 'Spike', 'Diablo',
    ];

    expect(Object.keys(RIVAL_PALETTES)).toHaveLength(14);

    for (const name of rivalNames) {
      expect(RIVAL_PALETTES[name]).toBeDefined();
      const palette = getRiderPalette(name);
      expect(palette).toBeDefined();
      expect(palette.jacketPrimary).toBeDefined();
      expect(palette.helmetPrimary).toBeDefined();
      expect(palette.visor).toBeDefined();
    }

    expect(getRiderPalette(undefined, true)).toBe(PLAYER_PALETTE);
    expect(getRiderPalette(undefined, false, true)).toBe(COP_PALETTE);
  });

  it('should generate rider and bike sprites for all required poses', () => {
    const bike = BIKES[0];
    const poses: RacerPose[] = [
      // Banking / Riding
      'straight', 'lean_left', 'lean_left_hard', 'lean_right', 'lean_right_hard', 'wheelie',
      // Combat
      'punch_left', 'punch_right', 'kick_left', 'kick_right',
      'club_left', 'club_right', 'chain_left', 'chain_right',
      'crowbar_left', 'crowbar_right',
      // Crash & Run-back
      'flying', 'tumbling_0', 'tumbling_1', 'tumbling_2', 'tumbling_3',
      'getting_up', 'running_0', 'running_1', 'running_2', 'running_3',
      'downed_bike',
    ];

    for (const pose of poses) {
      // Player
      const playerSprite = getRacerSprite({
        colorScheme: bike.colorScheme,
        isPlayer: true,
        pose,
      });
      expect(playerSprite).toBeDefined();
      expect(playerSprite.width).toBe(72);
      expect(playerSprite.height).toBe(72);

      // Cop with flashing pursuit beacon phases
      const copSprite0 = getRacerSprite({
        colorScheme: bike.colorScheme,
        isCop: true,
        pose,
        beaconPhase: 0,
      });
      const copSprite1 = getRacerSprite({
        colorScheme: bike.colorScheme,
        isCop: true,
        pose,
        beaconPhase: 1,
      });
      expect(copSprite0).toBeDefined();
      expect(copSprite1).toBeDefined();
    }
  });

  it('should generate rider sprites for each of the 14 AI rivals', () => {
    for (const rival of AI_RIVALS) {
      const sprite = getRacerSprite({
        colorScheme: BIKES[0].colorScheme,
        riderName: rival.name,
        pose: 'straight',
      });
      expect(sprite).toBeDefined();
    }
  });

  it('should generate front-view bike sprites for rear-view mirror rendering', () => {
    const bike = BIKES[0];
    const frontSprite = getFrontBikeSprite({
      colorScheme: bike.colorScheme,
      riderName: 'Biff',
      pose: 'straight',
    });
    expect(frontSprite).toBeDefined();
    expect(frontSprite.width).toBe(48);
    expect(frontSprite.height).toBe(48);

    const copFront = getFrontBikeSprite({
      colorScheme: bike.colorScheme,
      isCop: true,
      pose: 'straight',
      beaconPhase: 0,
    });
    expect(copFront).toBeDefined();
  });

  it('should generate traffic vehicle sprites for all 6 vehicle types in both directions', () => {
    const types: TrafficType[] = [
      'sedan', 'station_wagon', 'pickup', 'convertible', 'semi_truck', 'sports_car',
    ];
    const directions: TrafficDirection[] = ['same', 'oncoming'];

    for (const type of types) {
      for (const dir of directions) {
        const sprite = getTrafficSprite(type, dir);
        expect(sprite).toBeDefined();
        expect(sprite.width).toBe(96);
        expect(sprite.height).toBe(64);

        const customColorSprite = getTrafficSprite(type, dir, '#ff4400');
        expect(customColorSprite).toBeDefined();
      }
    }
  });

  it('should generate roadside scenery sprites for all 15 sprite types', () => {
    const types: RoadsideSpriteType[] = [
      'tree_pine', 'tree_redwood', 'tree_palm', 'cactus_saguaro', 'telephone_pole',
      'rock_boulder', 'cow', 'billboard', 'guardrail', 'road_sign_curve_left',
      'road_sign_curve_right', 'road_sign_steep', 'dirt_mound', 'oil_slick', 'spectator',
    ];

    for (const type of types) {
      const sprite = getRoadsideSprite(type);
      expect(sprite).toBeDefined();
      expect(sprite.width).toBeGreaterThan(0);
      expect(sprite.height).toBeGreaterThan(0);
    }
  });

  it('should generate 64x64 character portraits for all 14 rivals, cop, mechanic, shop_dealer, and trophy_girl', () => {
    const characters = [
      ...AI_RIVALS.map((r) => r.name),
      'cop' as const,
      'mechanic' as const,
      'shop_dealer' as const,
      'trophy_girl' as const,
    ];

    expect(characters).toHaveLength(18);

    for (const char of characters) {
      const portrait = getPortraitSprite(char);
      expect(portrait).toBeDefined();
      expect(portrait.width).toBe(64);
      expect(portrait.height).toBe(64);
    }
  });

  it('should generate particle and combat effect sprites', () => {
    const nitro0 = getNitroFlameSprite(0);
    const nitro1 = getNitroFlameSprite(1);
    expect(nitro0).toBeDefined();
    expect(nitro1).toBeDefined();

    const smoke = getSmokeSprite(2);
    expect(smoke).toBeDefined();

    const spark = getCombatSparkSprite('spark');
    const pow = getCombatSparkSprite('pow');
    expect(spark).toBeDefined();
    expect(pow).toBeDefined();

    const effectPow = getEffectSprite('pow');
    expect(effectPow).toBeDefined();
  });

  it('should cache generated sprites and allow clearing the cache', () => {
    clearSpriteCache();
    const s1 = getRoadsideSprite('cow');
    const s2 = getRoadsideSprite('cow');
    expect(s1).toBe(s2); // Reference equality from cache

    clearSpriteCache();
    const s3 = getRoadsideSprite('cow');
    expect(s3).toBeDefined();
  });
});

describe('Pseudo-3D Road Renderer', () => {
  it('should export correct road simulation constants', () => {
    expect(SEGMENT_LENGTH).toBe(200);
    expect(ROAD_WIDTH).toBe(2000);
    expect(DRAW_DISTANCE).toBe(120);
  });

  it('should build track segments matching track preset and level specifications', () => {
    const trackIds = Object.keys(TRACKS) as Array<keyof typeof TRACKS>;

    for (const trackId of trackIds) {
      const track = TRACKS[trackId];
      for (let lvl = 1; lvl <= 5; lvl++) {
        const level = lvl as ChampionshipLevel;
        const expectedCount = track.totalSegmentsByLevel[level];
        const segments = buildTrackSegments(track, level);

        expect(segments).toHaveLength(expectedCount);

        // Verify segment properties
        const first = segments[0];
        expect(first.index).toBe(0);
        expect(first.p1.world.z).toBe(0);
        expect(first.p2.world.z).toBe(SEGMENT_LENGTH);
        expect(typeof first.curve).toBe('number');
        expect(typeof first.elevation).toBe('number');
        expect(typeof first.isDark).toBe('boolean');
        expect(Array.isArray(first.sprites)).toBe(true);

        const last = segments[segments.length - 1];
        expect(last.index).toBe(expectedCount - 1);
        expect(last.p2.world.z).toBe(expectedCount * SEGMENT_LENGTH);

        // Check biome-specific roadside object distribution
        const allSprites = segments.flatMap((s) => s.sprites);
        expect(allSprites.length).toBeGreaterThan(0);

        if (trackId === 'sierra_nevada') {
          expect(allSprites.some((s) => s.type === 'tree_pine')).toBe(true);
        } else if (trackId === 'pacific_coast') {
          expect(allSprites.some((s) => s.type === 'tree_palm')).toBe(true);
        } else if (trackId === 'redwood_forest') {
          expect(allSprites.some((s) => s.type === 'tree_redwood')).toBe(true);
        } else if (trackId === 'palm_desert') {
          expect(allSprites.some((s) => s.type === 'cactus_saguaro')).toBe(true);
        } else if (trackId === 'grass_valley') {
          expect(allSprites.some((s) => s.type === 'cow')).toBe(true);
        }
      }
    }
  });

  it('should render race view without crashing under various race states', () => {
    const canvas = createOffscreenCanvas(640, 336);
    const ctx = canvas.getContext('2d')!;
    const track = TRACKS.sierra_nevada;
    const segments = buildTrackSegments(track, 1);

    const player: RacerEntity = {
      id: 'player_1',
      name: 'Player',
      isPlayer: true,
      bike: BIKES[0],
      x: 0,
      z: 500,
      speedMph: 120,
      maxSpeedMph: 130,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'club',
      attacking: false,
      attackCooldownMs: 0,
      crashData: {
        state: 'none',
        riderWorldX: 0,
        riderWorldZ: 0,
        bikeWorldX: 0,
        bikeWorldZ: 0,
        distanceToBikeFeet: 0,
        tumbleVelocity: { x: 0, y: 0, z: 0 },
        runSpeed: 0,
        isStunned: false,
        stunDurationMs: 0,
        runOverCount: 0,
      },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 2,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    const rivalRacer: RacerEntity = {
      id: 'rival_biff',
      name: 'Biff',
      isPlayer: false,
      bike: BIKES[1],
      x: -0.4,
      z: 1400,
      speedMph: 115,
      maxSpeedMph: 125,
      stamina: 90,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'club',
      attacking: true,
      currentAttack: 'club_swing',
      attackCooldownMs: 0,
      crashData: { ...player.crashData },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 0,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    const copRacer: RacerEntity = {
      id: 'cop_oleary',
      name: "Officer O'Leary",
      isPlayer: false,
      bike: BIKES[2],
      x: 0.35,
      z: 1800,
      speedMph: 135,
      maxSpeedMph: 145,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'club',
      attacking: false,
      attackCooldownMs: 0,
      copProfile: POLICE_OFFICERS[0],
      crashData: { ...player.crashData },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 0,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    // Add traffic to a visible segment
    segments[5].cars = [
      {
        id: 'traffic_1',
        type: 'sedan',
        direction: 'same',
        x: -0.2,
        z: 1000,
        speedMph: 60,
        color: '#3b668f',
        width: 80,
        length: 120,
        collided: false,
      },
    ];

    const state: RaceSimulationState = {
      track,
      level: 1,
      racers: [player, rivalRacer, copRacer],
      player,
      trackLengthWorld: segments.length * SEGMENT_LENGTH,
      segmentLengthWorld: SEGMENT_LENGTH,
      totalSegments: segments.length,
      cameraZ: player.z,
      cameraDepth: 0.84,
      elapsedTimeMs: 1250,
      raceFinished: false,
      qualifyingThreshold: 3,
    };

    // Test normal rendering
    expect(() => renderRaceView(ctx, state, segments, 640, 336)).not.toThrow();

    // Test player with Nitro active and steering hard
    player.nitroActive = true;
    player.x = 0.55;
    player.attacking = true;
    player.currentAttack = 'punch';
    expect(() => renderRaceView(ctx, state, segments, 640, 336)).not.toThrow();

    // Test player in crashed state (flying, tumbling, getting up, running)
    const crashStates = ['flying', 'tumbling', 'getting_up', 'running_to_bike'] as const;
    for (const cs of crashStates) {
      player.crashData.state = cs;
      player.crashData.riderWorldX = 0.2;
      player.crashData.bikeWorldX = -0.3;
      expect(() => renderRaceView(ctx, state, segments, 640, 336)).not.toThrow();
    }
  });

  it('should render left and right rear-view mirrors without crashing', () => {
    const canvas = createOffscreenCanvas(120, 60);
    const ctx = canvas.getContext('2d')!;
    const track = TRACKS.pacific_coast;
    const segments = buildTrackSegments(track, 1);

    const player: RacerEntity = {
      id: 'player_1',
      name: 'Player',
      isPlayer: true,
      bike: BIKES[0],
      x: 0,
      z: 2000,
      speedMph: 120,
      maxSpeedMph: 130,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'fist',
      attacking: false,
      attackCooldownMs: 0,
      crashData: {
        state: 'none',
        riderWorldX: 0,
        riderWorldZ: 0,
        bikeWorldX: 0,
        bikeWorldZ: 0,
        distanceToBikeFeet: 0,
        tumbleVelocity: { x: 0, y: 0, z: 0 },
        runSpeed: 0,
        isStunned: false,
        stunDurationMs: 0,
        runOverCount: 0,
      },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 0,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    // Racer approaching from behind on the left
    const rivalBehind: RacerEntity = {
      id: 'rival_slater',
      name: 'Slater',
      isPlayer: false,
      bike: BIKES[1],
      x: -0.3,
      z: 1600, // 400 world units behind player
      speedMph: 125,
      maxSpeedMph: 130,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'fist',
      attacking: false,
      attackCooldownMs: 0,
      crashData: { ...player.crashData },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 0,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    // Cop approaching dangerously close behind on the right
    const copBehind: RacerEntity = {
      id: 'cop_garcia',
      name: 'Officer Garcia',
      isPlayer: false,
      bike: BIKES[3],
      x: 0.25,
      z: 1850, // 150 units behind player
      speedMph: 130,
      maxSpeedMph: 140,
      stamina: 100,
      maxStamina: 100,
      bikeHealth: 100,
      weapon: 'club',
      attacking: false,
      attackCooldownMs: 0,
      copProfile: POLICE_OFFICERS[1],
      crashData: { ...player.crashData },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 0,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    const state: RaceSimulationState = {
      track,
      level: 1,
      racers: [player, rivalBehind, copBehind],
      player,
      trackLengthWorld: segments.length * SEGMENT_LENGTH,
      segmentLengthWorld: SEGMENT_LENGTH,
      totalSegments: segments.length,
      cameraZ: player.z,
      cameraDepth: 0.84,
      elapsedTimeMs: 2500,
      raceFinished: false,
      qualifyingThreshold: 3,
    };

    // Left mirror
    expect(() => renderRearViewMirror(ctx, 10, 10, 100, 48, state, 'left')).not.toThrow();

    // Right mirror
    expect(() => renderRearViewMirror(ctx, 10, 10, 100, 48, state, 'right')).not.toThrow();
  });
});
