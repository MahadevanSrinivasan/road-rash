import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoadRashGame } from './main';
import { BIKES, TRACK_IDS } from './data/gameData';
import { CombatHitEvent } from './types';

describe('RoadRashGame Integration Tests', () => {
  let game: RoadRashGame;
  const storageMap: Record<string, string> = {};

  beforeEach(() => {
    // Provide standard Web Storage mock
    const mockStorage = {
      getItem: (key: string) => storageMap[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMap[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storageMap[key];
      },
      clear: () => {
        for (const k in storageMap) delete storageMap[k];
      },
      length: 0,
      key: () => null,
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    mockStorage.clear();
    game = new RoadRashGame();
  });

  afterEach(() => {
    game.stop();
  });

  describe('1. Initialization & State', () => {
    it('initializes with default retro state and title screen', () => {
      expect(game.state.currentScreen).toBe('title');
      expect(game.state.career.level).toBe(1);
      expect(game.state.career.cash).toBe(1000);
      expect(game.state.career.currentBikeId).toBe('shuriken_400');
      expect(game.state.activeRace).toBeNull();
      expect(game.isPaused).toBe(false);
      expect(game.countdownTimerMs).toBe(0);
      expect(game.scanlinesActive).toBe(true);
    });

    it('renders title screen frame without errors', () => {
      expect(() => game.render()).not.toThrow();
    });
  });

  describe('2. Screen Navigation & Transitions', () => {
    it('transitions from title to track_select via action', () => {
      game.executeScreenActionResult({ type: 'change_screen', screen: 'track_select' });
      expect(game.state.currentScreen).toBe('track_select');
      expect(() => game.render()).not.toThrow();
    });

    it('transitions to bike_shop and allows browsing bikes', () => {
      game.changeScreen('bike_shop');
      expect(game.state.currentScreen).toBe('bike_shop');
      expect(() => game.render()).not.toThrow();
    });

    it('transitions to clubhouse and password_entry screens', () => {
      game.changeScreen('clubhouse');
      expect(game.state.currentScreen).toBe('clubhouse');
      expect(() => game.render()).not.toThrow();

      game.changeScreen('password_entry');
      expect(game.state.currentScreen).toBe('password_entry');
      expect(() => game.render()).not.toThrow();
    });

    it('transitions to victory_congratulations screen', () => {
      game.changeScreen('victory_congratulations');
      expect(game.state.currentScreen).toBe('victory_congratulations');
      expect(() => game.render()).not.toThrow();
    });
  });

  describe('3. Race Startup & Simulation Lifecycle', () => {
    it('starts a race on Sierra Nevada with full 3D track and competitors', () => {
      game.startRace('sierra_nevada');

      expect(game.state.currentScreen).toBe('race');
      expect(game.state.activeRace).not.toBeNull();
      expect(game.state.activeRace?.track.id).toBe('sierra_nevada');
      expect(game.segments.length).toBeGreaterThan(100);
      expect(game.countdownTimerMs).toBeGreaterThan(0);
      expect(game.state.activeRace?.racers.length).toBe(16); // Player + 14 Rivals + 1 Cop
    });

    it('processes countdown ticks and triggers GO!! state', () => {
      game.startRace('pacific_coast');

      // Initial stage 3
      expect(game.countdownTimerMs).toBeGreaterThan(3000);

      // Tick 1000ms -> stage 2
      game.update(1000);
      expect(game.countdownTimerMs).toBeLessThanOrEqual(3000);

      // Tick 2000ms -> stage 0 ('GO!!')
      game.update(2000);
      expect(game.countdownTimerMs).toBeLessThanOrEqual(1000);

      // Tick 1000ms -> countdown finishes
      game.update(1000);
      expect(game.countdownTimerMs).toBeLessThanOrEqual(0);
    });

    it('updates race physics and moves player forward on acceleration', () => {
      game.startRace('redwood_forest');
      // Complete countdown
      game.countdownTimerMs = 0;

      const player = game.state.activeRace!.player;
      const initialZ = player.z;

      // Simulate throttle
      game.inputManager.simulateKeyDown('ArrowUp');
      for (let i = 0; i < 20; i++) {
        game.update(50);
      }
      game.inputManager.simulateKeyUp('ArrowUp');

      expect(player.speedMph).toBeGreaterThan(0);
      expect(player.z).toBeGreaterThan(initialZ);
    });

    it('renders top 3D view and lower HUD with rear-view mirrors without throwing', () => {
      game.startRace('palm_desert');
      game.countdownTimerMs = 1500; // In countdown

      expect(() => game.render()).not.toThrow();

      game.countdownTimerMs = 0; // Active race
      expect(() => game.render()).not.toThrow();
    });
  });

  describe('4. In-Race Pause Menu', () => {
    beforeEach(() => {
      game.startRace('grass_valley');
      game.countdownTimerMs = 0;
    });

    it('toggles pause on pause input', () => {
      expect(game.isPaused).toBe(false);

      game.inputManager.simulateKeyDown('KeyP');
      game.update(16);
      game.inputManager.simulateKeyUp('KeyP');

      expect(game.isPaused).toBe(true);
      expect(() => game.render()).not.toThrow();
    });

    it('quits active race to track_select via pause menu', () => {
      game.isPaused = true;
      game.pauseSelectedIndex = 2; // QUIT TO MENU

      game.inputManager.simulateKeyDown('Enter');
      game.update(16);
      game.inputManager.simulateKeyUp('Enter');

      expect(game.isPaused).toBe(false);
      expect(game.state.activeRace).toBeNull();
      expect(game.state.currentScreen).toBe('track_select');
    });

    it('restarts active race from pause menu', () => {
      game.isPaused = true;
      game.pauseSelectedIndex = 1; // RESTART RACE

      game.inputManager.simulateKeyDown('Enter');
      game.update(16);
      game.inputManager.simulateKeyUp('Enter');

      expect(game.isPaused).toBe(false);
      expect(game.state.activeRace).not.toBeNull();
      expect(game.state.activeRace?.track.id).toBe('grass_valley');
      expect(game.countdownTimerMs).toBeGreaterThan(0);
    });
  });

  describe('5. Combat, Knockouts & Snatches', () => {
    it('handles combat hit and knockout notifications', () => {
      game.startRace('sierra_nevada');
      game.countdownTimerMs = 0;

      const hitEvent: CombatHitEvent = {
        attackerId: 'player',
        targetId: 'rival_biff',
        weapon: 'fist',
        action: 'punch',
        damage: 25,
        snatchedWeapon: false,
        targetWipedOut: true,
        timestamp: 1000,
      };

      const callbacks = (game as any).createRaceEngineCallbacks();
      const initialKnockouts = game.state.career.totalKnockouts;

      callbacks.onCombatHit(hitEvent, 'Player', 'Biff');

      expect(game.state.career.totalKnockouts).toBe(initialKnockouts + 1);
    });

    it('handles weapon snatching', () => {
      game.startRace('pacific_coast');
      const callbacks = (game as any).createRaceEngineCallbacks();

      expect(() => {
        callbacks.onWeaponSnatch('Player', 'Natasha', 'chain');
      }).not.toThrow();
    });

    it('handles player crash wipeout notification', () => {
      game.startRace('redwood_forest');
      const callbacks = (game as any).createRaceEngineCallbacks();

      const player = game.state.activeRace!.player;
      expect(() => {
        callbacks.onCrash(player, 1.5);
      }).not.toThrow();
    });
  });

  describe('6. Wrecked & Busted State Transitions', () => {
    it('transitions to wrecked_screen when player bike is totaled', () => {
      game.startRace('palm_desert');
      const callbacks = (game as any).createRaceEngineCallbacks();

      callbacks.onPlayerWrecked(450);

      expect(game.state.currentScreen).toBe('wrecked_screen');
      expect(game.pendingRepairCost).toBe(450);
      expect(game.state.career.totalWrecks).toBe(1);
      expect(() => game.render()).not.toThrow();
    });

    it('allows paying repair bill on wrecked screen', () => {
      game.changeScreen('wrecked_screen');
      game.state.career.cash = 1000;

      game.executeScreenActionResult({ type: 'pay_repair', data: { cost: 250 } });

      expect(game.state.career.cash).toBe(750);
      expect(game.state.currentScreen).toBe('track_select');
    });

    it('transitions to busted_screen when arrested by police', () => {
      game.startRace('grass_valley');
      const callbacks = (game as any).createRaceEngineCallbacks();

      callbacks.onPlayerBusted(350, "Officer O'Leary");

      expect(game.state.currentScreen).toBe('busted_screen');
      expect(game.pendingFineAmount).toBe(350);
      expect(game.arrestingCopName).toBe("Officer O'Leary");
      expect(game.state.career.totalArrests).toBe(1);
      expect(() => game.render()).not.toThrow();
    });

    it('allows paying fine on busted screen', () => {
      game.changeScreen('busted_screen');
      game.state.career.cash = 1000;

      game.executeScreenActionResult({ type: 'pay_fine', data: { fine: 350 } });

      expect(game.state.career.cash).toBe(650);
      expect(game.state.currentScreen).toBe('track_select');
    });

    it('triggers game_over_restart when bankrupt', () => {
      game.changeScreen('wrecked_screen');
      game.state.career.cash = 50; // Insufficient cash

      game.executeScreenActionResult({ type: 'pay_repair', data: { cost: 250 } });

      expect(game.state.currentScreen).toBe('title');
      expect(game.state.career.cash).toBe(1000); // Reset initial
    });
  });

  describe('7. Race Finishing & Championship Career Progression', () => {
    it('qualifies track and awards prize money on top 3 finish', () => {
      game.startRace('sierra_nevada');
      const callbacks = (game as any).createRaceEngineCallbacks();

      const initialCash = game.state.career.cash;
      callbacks.onRaceFinished(1, 1000, true);

      expect(game.state.currentScreen).toBe('race_results');
      expect(game.state.career.cash).toBe(initialCash + 1000);
      expect(game.state.career.totalRacesWon).toBe(1);
      expect(game.state.career.trackProgress.sierra_nevada.qualified).toBe(true);
      expect(() => game.render()).not.toThrow();
    });

    it('advances championship level when all 5 tracks are qualified', () => {
      // Mark all 5 tracks as qualified
      for (const trackId of TRACK_IDS) {
        game.state.career.trackProgress[trackId].qualified = true;
      }

      game.executeScreenActionResult({ type: 'advance_level' });

      expect(game.state.career.level).toBe(2);
      expect(game.state.currentScreen).toBe('track_select');
      // Qualifications reset for Level 2
      expect(game.state.career.trackProgress.sierra_nevada.qualified).toBe(false);
    });
  });

  describe('8. Bike Shop & Equipment', () => {
    it('buys and equips a higher-tier motorcycle when player has enough cash', () => {
      game.state.career.cash = 5000;
      const targetBike = BIKES.find((b) => b.id === 'panda_600')!;

      game.executeScreenActionResult({ type: 'buy_bike', bikeId: targetBike.id });

      expect(game.state.career.cash).toBe(5000 - targetBike.price);
      expect(game.state.career.ownedBikeIds).toContain(targetBike.id);
      expect(game.state.career.currentBikeId).toBe(targetBike.id);
    });

    it('equips an already owned bike', () => {
      game.state.career.ownedBikeIds = ['shuriken_400', 'panda_600'];
      game.executeScreenActionResult({ type: 'equip_bike', bikeId: 'panda_600' });

      expect(game.state.career.currentBikeId).toBe('panda_600');
    });
  });

  describe('9. Audio & Video Settings Toggles', () => {
    it('toggles audio mute status', () => {
      expect(game.isAudioMuted()).toBe(false);

      const muted = game.toggleAudio();
      expect(muted).toBe(true);
      expect(game.isAudioMuted()).toBe(true);

      const unmuted = game.toggleAudio();
      expect(unmuted).toBe(false);
    });

    it('toggles touch controls visibility', () => {
      expect(game.isTouchVisible()).toBe(false);

      game.toggleTouchControls(true);
      expect(game.isTouchVisible()).toBe(true);

      game.toggleTouchControls(false);
      expect(game.isTouchVisible()).toBe(false);
    });

    it('toggles scanlines overlay', () => {
      expect(game.isScanlinesActive()).toBe(true);

      game.toggleScanlines(false);
      expect(game.isScanlinesActive()).toBe(false);

      game.toggleScanlines(true);
      expect(game.isScanlinesActive()).toBe(true);
    });
  });
});
