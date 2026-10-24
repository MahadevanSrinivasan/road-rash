import { describe, it, expect } from 'vitest';
import {
  BIKES,
  AI_RIVALS,
  TRACKS,
  TRACK_IDS,
  WEAPONS,
  createInitialCareer,
  encodePassword,
  decodePassword,
} from './gameData';

describe('Road Rash Master Game Data', () => {
  it('should have all 15 authentic bikes with valid properties', () => {
    expect(BIKES.length).toBe(15);
    const classes = new Set(BIKES.map((b) => b.class));
    expect(classes.has('Panda')).toBe(true);
    expect(classes.has('Sport')).toBe(true);
    expect(classes.has('Super')).toBe(true);

    // Wild Thing 2000 should be the ultimate superbike
    const wildThing = BIKES.find((b) => b.id === 'wild_thing_2000');
    expect(wildThing).toBeDefined();
    expect(wildThing?.class).toBe('Super');
    expect(wildThing?.hasNitro).toBe(true);
    expect(wildThing?.nitroCharges).toBeGreaterThanOrEqual(8);
    expect(wildThing?.topSpeedMph).toBeGreaterThan(200);

    // Check each bike has color scheme and valid stats
    for (const bike of BIKES) {
      expect(bike.id).toBeTruthy();
      expect(bike.name).toBeTruthy();
      expect(bike.price).toBeGreaterThan(0);
      expect(bike.topSpeedMph).toBeGreaterThan(100);
      expect(bike.durability).toBeGreaterThan(0);
      expect(bike.colorScheme.fairing).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should have all 14 named AI rivals with authentic profiles and quotes', () => {
    expect(AI_RIVALS.length).toBe(14);
    const expectedRivalNames = [
      'Biff',
      'Natasha',
      'Slater',
      'Ikira',
      'P.E. No. 1',
      'Viper',
      'Helga',
      'Rude Boy',
      'Gino',
      'Butch',
      'Sven',
      'Tanya',
      'Spike',
      'Diablo',
    ];

    const actualNames = AI_RIVALS.map((r) => r.name);
    for (const name of expectedRivalNames) {
      expect(actualNames).toContain(name);
    }

    // Check each rival has quotes and level scaling 1-5
    for (const rival of AI_RIVALS) {
      expect(rival.quotes.preRace.length).toBeGreaterThan(0);
      expect(rival.quotes.winRace.length).toBeGreaterThan(0);
      expect(rival.quotes.loseRace.length).toBeGreaterThan(0);
      expect(rival.quotes.taunt.length).toBeGreaterThan(0);
      expect(rival.levelScaling[1]).toBeDefined();
      expect(rival.levelScaling[5]).toBeDefined();
    }
  });

  it('should have all 5 California tracks with palettes and geometry', () => {
    expect(TRACK_IDS.length).toBe(5);
    for (const trackId of TRACK_IDS) {
      const track = TRACKS[trackId];
      expect(track).toBeDefined();
      expect(track.name).toBeTruthy();
      expect(track.colors.skyGradientTop).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(track.colors.roadLight).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(track.colors.grassLight).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(track.geometryPattern.length).toBeGreaterThan(0);
      expect(track.lengthMilesByLevel[1]).toBeGreaterThan(0);
      expect(track.lengthMilesByLevel[5]).toBeGreaterThan(track.lengthMilesByLevel[1]);
    }
  });

  it('should include all required weapons', () => {
    expect(WEAPONS.fist).toBeDefined();
    expect(WEAPONS.club).toBeDefined();
    expect(WEAPONS.chain).toBeDefined();
    expect(WEAPONS.crowbar).toBeDefined();
    expect(WEAPONS.club.snatchable).toBe(true);
    expect(WEAPONS.chain.snatchable).toBe(true);
  });

  it('should correctly encode and decode 8-character classic passwords', () => {
    const career = createInitialCareer();
    career.level = 3;
    career.cash = 12500;
    career.currentBikeId = 'diablo_1000';
    career.trackProgress.sierra_nevada.qualified = true;
    career.trackProgress.pacific_coast.qualified = true;

    const password = encodePassword(career);
    expect(password.length).toBe(8);

    const decoded = decodePassword(password);
    expect(decoded.valid).toBe(true);
    expect(decoded.level).toBe(3);
    // Cash is encoded in $50 units, so $12500 is exact
    expect(decoded.cash).toBe(12500);
    const bike = BIKES[decoded.bikeIndex];
    expect(bike.id).toBe('diablo_1000');
    // First two tracks (bits 0 and 1) should be set: 1 | 2 = 3
    expect(decoded.tracksQualifiedBits & 0x03).toBe(3);
  });

  it('should reject invalid or tampered passwords', () => {
    const invalidResult = decodePassword('INVALID1');
    expect(invalidResult.valid).toBe(false);
  });
});
