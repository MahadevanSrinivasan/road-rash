import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HudRenderer } from './hudRenderer';
import { ScreenRenderer } from './screenRenderer';
import { GameState, RaceSimulationState, RacerEntity } from '../types';
import { BIKES, TRACKS, createInitialCareer } from '../data/gameData';

function createMockContext(): CanvasRenderingContext2D {
  const ctx: Partial<CanvasRenderingContext2D> = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    clip: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  };
  return ctx as CanvasRenderingContext2D;
}

describe('HUD & Screen Renderers', () => {
  let mockCtx: CanvasRenderingContext2D;
  let mockGameState: GameState;
  let mockRaceState: RaceSimulationState;
  let playerRacer: RacerEntity;

  beforeEach(() => {
    mockCtx = createMockContext();

    playerRacer = {
      id: 'player_1',
      name: 'Player',
      isPlayer: true,
      bike: BIKES[0],
      x: 0,
      z: 1500,
      speedMph: 120,
      maxSpeedMph: 140,
      stamina: 85,
      maxStamina: 100,
      bikeHealth: 90,
      weapon: 'club',
      attacking: false,
      attackCooldownMs: 0,
      crashData: {
        state: 'none',
        riderWorldX: 0,
        riderWorldZ: 1500,
        bikeWorldX: 0,
        bikeWorldZ: 1500,
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
      x: -0.3,
      z: 1300, // Behind player
      speedMph: 115,
      maxSpeedMph: 135,
      stamina: 70,
      maxStamina: 100,
      bikeHealth: 80,
      weapon: 'fist',
      attacking: false,
      attackCooldownMs: 0,
      crashData: { ...playerRacer.crashData },
      finishPosition: null,
      finishTimeMs: null,
      nitroRemaining: 0,
      nitroActive: false,
      nitroTimerMs: 0,
    };

    mockRaceState = {
      track: TRACKS.sierra_nevada,
      level: 1,
      racers: [playerRacer, rivalRacer],
      player: playerRacer,
      trackLengthWorld: 12000,
      segmentLengthWorld: 200,
      totalSegments: 60,
      cameraZ: 1200,
      cameraDepth: 0.84,
      elapsedTimeMs: 45000,
      raceFinished: false,
      qualifyingThreshold: 3,
    };

    mockGameState = {
      currentScreen: 'title',
      career: createInitialCareer(),
      activeRace: mockRaceState,
      audioMuted: false,
      soundVolume: 0.8,
      musicVolume: 0.8,
    };
  });

  describe('HudRenderer', () => {
    let hud: HudRenderer;

    beforeEach(() => {
      hud = new HudRenderer();
    });

    it('should render dashboard and instruments without crashing', () => {
      hud.render(mockCtx, mockRaceState);
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should invoke custom mirror renderer callback when provided', () => {
      const customMirrorSpy = vi.fn();
      hud.render(mockCtx, mockRaceState, {
        customMirrorRenderer: customMirrorSpy,
      });

      expect(customMirrorSpy).toHaveBeenCalledTimes(2); // Left & right mirrors
      expect(customMirrorSpy).toHaveBeenCalledWith(
        mockCtx,
        'left',
        14,
        348,
        110,
        68
      );
      expect(customMirrorSpy).toHaveBeenCalledWith(
        mockCtx,
        'right',
        516,
        348,
        110,
        68
      );
    });

    it('should manage and render banner toast notifications', () => {
      hud.addNotification('SNATCHED CLUB FROM BIFF!', 'combat');
      hud.addNotification('OFFICER IN PURSUIT!', 'police');

      hud.render(mockCtx, mockRaceState);
      expect(mockCtx.fillText).toHaveBeenCalled();

      hud.clearNotifications();
      hud.render(mockCtx, mockRaceState);
    });

    it('should render countdown overlays (3, 2, 1, GO!!)', () => {
      hud.render(mockCtx, mockRaceState, { countdownValue: 'GO!!' });
      expect(mockCtx.strokeText).toHaveBeenCalled();
    });

    it('should render pause menu overlay and register hitboxes when paused', () => {
      hud.render(mockCtx, mockRaceState, {
        isPaused: true,
        pauseSelectedIndex: 0,
      });

      const hitboxes = hud.getPauseHitboxes();
      expect(hitboxes.length).toBe(4);
      expect(hitboxes[0].action).toBe('resume');
      expect(hitboxes[1].action).toBe('restart');
      expect(hitboxes[2].action).toBe('quit');
      expect(hitboxes[3].action).toBe('toggle_audio');
    });
  });

  describe('ScreenRenderer', () => {
    let screenRenderer: ScreenRenderer;

    beforeEach(() => {
      screenRenderer = new ScreenRenderer();
    });

    it('should render all non-race screens without crashing', () => {
      const screens = [
        'title',
        'track_select',
        'main_menu',
        'bike_shop',
        'clubhouse',
        'race_results',
        'wrecked_screen',
        'busted_screen',
        'password_entry',
        'victory_congratulations',
      ] as const;

      for (const scr of screens) {
        mockGameState.currentScreen = scr;
        screenRenderer.render(mockCtx, mockGameState);
        expect(screenRenderer.getHitboxes().length).toBeGreaterThan(0);
      }
    });

    it('should handle title menu navigation and clicks', () => {
      mockGameState.currentScreen = 'title';
      screenRenderer.render(mockCtx, mockGameState);

      // Nav Down
      screenRenderer.handleNavAction('down', mockGameState);
      expect(screenRenderer.titleSelectedIndex).toBe(1);

      // Confirm Selection on Quick Race (index 1)
      const actionResult = screenRenderer.handleNavAction('confirm', mockGameState);
      expect(actionResult).toEqual({
        type: 'quick_race',
        trackId: 'sierra_nevada',
      });
    });

    it('should handle track select clicks and race launch', () => {
      mockGameState.currentScreen = 'track_select';
      screenRenderer.render(mockCtx, mockGameState);

      const hitboxes = screenRenderer.getHitboxes();
      const startRaceBtn = hitboxes.find((h) => h.action === 'start_selected_race');
      expect(startRaceBtn).toBeDefined();

      if (startRaceBtn) {
        const result = screenRenderer.handleClick(
          startRaceBtn.x + 5,
          startRaceBtn.y + 5,
          mockGameState
        );
        expect(result?.type).toBe('start_race');
      }
    });

    it('should allow cycling classes and buying bikes in bike shop', () => {
      mockGameState.currentScreen = 'bike_shop';
      screenRenderer.render(mockCtx, mockGameState);

      // Change class to Sport
      screenRenderer.handleNavAction('down', mockGameState);
      expect(screenRenderer.bikeShopClass).toBe('Sport');

      // Cycle bike to right
      screenRenderer.handleNavAction('right', mockGameState);
      expect(screenRenderer.bikeShopBikeIndex).toBe(1);

      // Buying bike
      mockGameState.career.cash = 50000;
      const buyResult = screenRenderer.handleNavAction('confirm', mockGameState);
      expect(buyResult?.type).toBe('buy_bike');
    });

    it('should browse rivals and police officers in the clubhouse', () => {
      mockGameState.currentScreen = 'clubhouse';
      screenRenderer.render(mockCtx, mockGameState);

      expect(screenRenderer.clubhouseRivalIndex).toBe(0);
      screenRenderer.handleNavAction('right', mockGameState);
      expect(screenRenderer.clubhouseRivalIndex).toBe(1);

      // Clubhouse back action
      const backResult = screenRenderer.handleNavAction('back', mockGameState);
      expect(backResult?.type).toBe('change_screen');
      expect(backResult?.screen).toBe('track_select');
    });

    it('should interactively type, validate, and restore career passwords', () => {
      mockGameState.currentScreen = 'password_entry';
      screenRenderer.render(mockCtx, mockGameState);

      // Valid 8-char password from initial career
      const validPass = mockGameState.career.password;
      expect(validPass.length).toBe(8);

      // Paste current password
      const hitboxes = screenRenderer.getHitboxes();
      const pasteBtn = hitboxes.find((h) => h.action === 'password_copy_current');
      expect(pasteBtn).toBeDefined();

      if (pasteBtn) {
        screenRenderer.handleClick(pasteBtn.x + 2, pasteBtn.y + 2, mockGameState);
        expect(screenRenderer.passwordBuffer).toBe(validPass);
        expect(screenRenderer.passwordFeedback?.isError).toBe(false);

        // Submit password
        const submitResult = screenRenderer.handleNavAction('confirm', mockGameState);
        expect(submitResult?.type).toBe('restore_career');
        expect(submitResult?.career?.level).toBe(1);
      }
    });

    it('should handle repair and fine deduction on wrecked and busted screens', () => {
      // Wrecked Screen
      mockGameState.currentScreen = 'wrecked_screen';
      mockGameState.career.cash = 2000;
      screenRenderer.render(mockCtx, mockGameState);

      let result = screenRenderer.handleNavAction('confirm', mockGameState);
      expect(result?.type).toBe('pay_repair');

      // Bankrupt Wrecked Screen
      mockGameState.career.cash = 10;
      screenRenderer.render(mockCtx, mockGameState);
      result = screenRenderer.handleNavAction('confirm', mockGameState);
      expect(result?.type).toBe('game_over_restart');

      // Busted Screen
      mockGameState.currentScreen = 'busted_screen';
      mockGameState.career.cash = 3000;
      screenRenderer.render(mockCtx, mockGameState);
      result = screenRenderer.handleNavAction('confirm', mockGameState);
      expect(result?.type).toBe('pay_fine');
    });
  });
});
