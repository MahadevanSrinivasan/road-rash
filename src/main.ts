/**
 * Road Rash (1991 Sega Genesis) - Master Game Controller & Browser Bootstrap
 * Integrates pseudo-3D raster road projection, 16-bit FM synth audio,
 * multi-device input (keyboard, gamepad, touch), lower dashboard HUD with
 * dual rear-view mirrors, and full career championship progression.
 */

import {
  ChampionshipLevel,
  CombatHitEvent,
  GameScreen,
  GameState,
  PlayerInput,
  RacerEntity,
  RoadSegment,
  TrackId,
  WeaponType,
} from './types';
import {
  BIKES_BY_ID,
  TRACKS,
  TRACK_IDS,
  createInitialCareer,
  loadCareerFromStorage,
  saveCareerToStorage,
} from './data/gameData';
import {
  buildTrackSegments,
  renderRaceView,
  renderRearViewMirror,
} from './graphics/roadRenderer';
import {
  createRaceSimulation,
  RaceEngineCallbacks,
  updateRaceSimulation,
} from './engine/raceEngine';
import { soundEngine, SoundEngine } from './audio/soundEngine';
import { InputManager } from './input/inputManager';
import { HudRenderer } from './ui/hudRenderer';
import { ScreenActionResult, ScreenRenderer } from './ui/screenRenderer';

export class RoadRashGame {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public inputManager: InputManager;
  public hudRenderer: HudRenderer;
  public screenRenderer: ScreenRenderer;
  public soundEngine: SoundEngine;

  // Master Game Architecture State
  public state: GameState;

  // Active Race Simulation State
  public segments: RoadSegment[] = [];
  public countdownTimerMs: number = 0;
  private lastCountdownStage: number = -1; // 3, 2, 1, 0 ('GO!!'), -1 (off)
  public isPaused: boolean = false;
  public pauseSelectedIndex: number = 0;
  public pendingRepairCost: number = 0;
  public pendingFineAmount: number = 0;
  public arrestingCopName: string = "Officer O'Leary";

  // CRT Scanlines visual effect toggle
  public scanlinesActive: boolean = true;

  // Game Loop Tracking
  private lastTime: number = 0;
  private animFrameId: number | null = null;
  public isRunning: boolean = false;

  constructor(canvas?: HTMLCanvasElement | null) {
    if (canvas) {
      this.canvas = canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to obtain 2D rendering context from canvas.');
      }
      this.ctx = ctx;
    } else {
      // Fallback mock canvas for headless / unit test execution
      this.canvas = this.createMockCanvas();
      this.ctx = this.canvas.getContext('2d')!;
    }

    this.inputManager = new InputManager(this.canvas);
    this.hudRenderer = new HudRenderer();
    this.screenRenderer = new ScreenRenderer();
    this.soundEngine = soundEngine;

    // Load persisted career or create brand new Level 1 career
    const career = loadCareerFromStorage();

    this.state = {
      currentScreen: 'title',
      career,
      activeRace: null,
      audioMuted: this.soundEngine.isMuted(),
      soundVolume: this.soundEngine.getSoundVolume(),
      musicVolume: this.soundEngine.getMusicVolume(),
    };

    // Hook up keyboard password typing on password_entry screen
    this.inputManager.onPasswordKey((key) => {
      if (this.state.currentScreen === 'password_entry') {
        this.handlePasswordInput(key);
      }
    });
  }

  // ==========================================================================
  // LIFECYCLE & GAME LOOP
  // ==========================================================================

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance?.now ? performance.now() : Date.now();

    // Start Sega Genesis FM Title Music
    this.soundEngine.playMusic('title');

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.soundEngine.stopEngineSound();
    this.soundEngine.stopSirenSound();
    this.soundEngine.stopMusic();
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;

    const dtMs = this.lastTime > 0 ? Math.min(100, Math.max(1, time - this.lastTime)) : 16.6;
    this.lastTime = time;

    this.update(dtMs);
    this.render();

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  };

  // ==========================================================================
  // MAIN UPDATE DISPATCH
  // ==========================================================================

  public update(dtMs: number): void {
    this.inputManager.update(dtMs);
    const input = this.inputManager.getInput();

    if (this.state.currentScreen === 'race') {
      this.updateRaceScreen(input, dtMs);
    } else {
      this.updateNonRaceScreen();
    }
  }

  // ==========================================================================
  // RACE SCREEN UPDATE & SIMULATION
  // ==========================================================================

  private updateRaceScreen(input: PlayerInput, dtMs: number): void {
    if (!this.state.activeRace) return;

    // 1. Toggle Pause
    if (input.pause) {
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.soundEngine.stopEngineSound();
        this.soundEngine.stopSirenSound();
        this.soundEngine.playMenuSelect();
      } else {
        this.soundEngine.playMenuSelect();
      }
    }

    // 2. Handle Paused State
    if (this.isPaused) {
      this.updatePauseMenu();
      return;
    }

    // 3. Start-of-Race 3-2-1-GO Countdown State Machine
    if (this.countdownTimerMs > 0) {
      this.countdownTimerMs -= dtMs;

      let currentStage: number;
      if (this.countdownTimerMs > 3000) {
        currentStage = 3;
      } else if (this.countdownTimerMs > 2000) {
        currentStage = 2;
      } else if (this.countdownTimerMs > 1000) {
        currentStage = 1;
      } else if (this.countdownTimerMs > 0) {
        currentStage = 0; // 'GO!!'
      } else {
        currentStage = -1;
      }

      // Play authentic Genesis beeps on stage transitions
      if (currentStage !== this.lastCountdownStage) {
        this.lastCountdownStage = currentStage;
        if (currentStage > 0) {
          this.soundEngine.playCountdownBeep(false); // Low beep (3, 2, 1)
        } else if (currentStage === 0) {
          this.soundEngine.playCountdownBeep(true); // High sustained chime (GO!!)
        }
      }

      // During 3, 2, 1 countdown: rev engine on throttle without moving forward
      if (currentStage > 0) {
        const player = this.state.activeRace.player;
        if (input.accelerate) {
          this.soundEngine.updateEngineSound(28, player.maxSpeedMph, true, false, false, false);
        } else {
          this.soundEngine.updateEngineSound(0, player.maxSpeedMph, false, false, false, false);
        }
        return;
      }
    }

    // 4. Update 3D Raster Physics, AI Rivals, Traffic, & Combat
    const callbacks = this.createRaceEngineCallbacks();
    updateRaceSimulation(this.state.activeRace, this.segments, input, dtMs, callbacks);

    // 5. Update Continuous Engine & Police Siren Audio
    const player = this.state.activeRace.player;
    this.soundEngine.updateEngineSound(
      player.speedMph,
      player.maxSpeedMph,
      input.accelerate,
      player.nitroActive,
      player.crashData.state === 'flying',
      player.crashData.state !== 'none'
    );

    this.updatePursuingCopSirenSound(player);
  }

  /**
   * Calculates proximity to the nearest pursuing Highway Patrol motorcycle cop
   * and updates the sound engine's dynamic Doppler siren synthesizer.
   */
  private updatePursuingCopSirenSound(player: RacerEntity): void {
    if (!this.state.activeRace) return;

    const activeCops = this.state.activeRace.racers.filter(
      (r) => r.copProfile && r.copProfile.sirenActive && r.crashData.state === 'none'
    );

    if (activeCops.length > 0) {
      let minDistance = Infinity;
      for (const cop of activeCops) {
        const dist = Math.abs(cop.z - player.z);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }

      const maxAudibleDist = 3200;
      if (minDistance < maxAudibleDist) {
        const distFactor = Math.max(0, 1 - minDistance / maxAudibleDist);
        this.soundEngine.updateSirenSound(true, distFactor);
      } else {
        this.soundEngine.updateSirenSound(false, 0);
      }
    } else {
      this.soundEngine.updateSirenSound(false, 0);
    }
  }

  /**
   * Handles menu navigation and button clicks within the in-race pause menu.
   */
  private updatePauseMenu(): void {
    const menuActions = this.inputManager.consumeMenuActions();
    const pauseItemCount = 4;

    if (menuActions.up) {
      this.pauseSelectedIndex = (this.pauseSelectedIndex - 1 + pauseItemCount) % pauseItemCount;
      this.soundEngine.playMenuMove();
    } else if (menuActions.down) {
      this.pauseSelectedIndex = (this.pauseSelectedIndex + 1) % pauseItemCount;
      this.soundEngine.playMenuMove();
    } else if (menuActions.confirm) {
      this.executePauseActionIndex(this.pauseSelectedIndex);
    } else if (menuActions.back) {
      this.isPaused = false;
      this.soundEngine.playMenuSelect();
    }

    // Check pointer/touch click on pause menu hitboxes
    const click = this.inputManager.consumeClick();
    if (click) {
      const hitboxes = this.hudRenderer.getPauseHitboxes();
      for (const box of hitboxes) {
        if (
          click.x >= box.x &&
          click.x <= box.x + box.w &&
          click.y >= box.y &&
          click.y <= box.y + box.h
        ) {
          switch (box.action) {
            case 'resume':
              this.isPaused = false;
              this.soundEngine.playMenuSelect();
              break;
            case 'restart':
              this.isPaused = false;
              this.soundEngine.playMenuSelect();
              this.startRace(this.state.activeRace?.track.id || 'sierra_nevada');
              break;
            case 'quit':
              this.isPaused = false;
              this.soundEngine.playMenuSelect();
              this.quitRace();
              break;
            case 'toggle_audio':
              this.toggleAudio();
              this.soundEngine.playMenuSelect();
              break;
          }
          break;
        }
      }
    }
  }

  private executePauseActionIndex(index: number): void {
    this.soundEngine.playMenuSelect();
    switch (index) {
      case 0: // RESUME
        this.isPaused = false;
        break;
      case 1: // RESTART RACE
        this.isPaused = false;
        this.startRace(this.state.activeRace?.track.id || 'sierra_nevada');
        break;
      case 2: // QUIT TO MENU
        this.quitRace();
        break;
      case 3: // TOGGLE AUDIO
        this.toggleAudio();
        break;
    }
  }

  // ==========================================================================
  // NON-RACE SCREENS UPDATE (TITLE, TRACK SELECT, SHOP, CLUBHOUSE, ETC.)
  // ==========================================================================

  private updateNonRaceScreen(): void {
    const menuActions = this.inputManager.consumeMenuActions();

    // 1. Keyboard / Gamepad Navigation
    if (menuActions.up) {
      const res = this.screenRenderer.handleNavAction('up', this.state);
      this.soundEngine.playMenuMove();
      this.executeScreenActionResult(res);
    } else if (menuActions.down) {
      const res = this.screenRenderer.handleNavAction('down', this.state);
      this.soundEngine.playMenuMove();
      this.executeScreenActionResult(res);
    } else if (menuActions.left) {
      const res = this.screenRenderer.handleNavAction('left', this.state);
      this.soundEngine.playMenuMove();
      this.executeScreenActionResult(res);
    } else if (menuActions.right) {
      const res = this.screenRenderer.handleNavAction('right', this.state);
      this.soundEngine.playMenuMove();
      this.executeScreenActionResult(res);
    } else if (menuActions.confirm) {
      const res = this.screenRenderer.handleNavAction('confirm', this.state);
      this.executeScreenActionResult(res);
    } else if (menuActions.back) {
      const res = this.screenRenderer.handleNavAction('back', this.state);
      this.executeScreenActionResult(res);
    }

    // 2. Mouse / Touch Click Navigation
    const click = this.inputManager.consumeClick();
    if (click) {
      const res = this.screenRenderer.handleClick(click.x, click.y, this.state);
      if (res) {
        this.executeScreenActionResult(res);
      }
    }
  }

  /**
   * Executes actions dispatched by UI buttons, menus, and hitboxes.
   */
  public executeScreenActionResult(action: ScreenActionResult | null): void {
    if (!action || action.type === 'none') return;

    switch (action.type) {
      case 'start_race': {
        const trackId = action.trackId || TRACK_IDS[this.screenRenderer.trackSelectedIndex] || 'sierra_nevada';
        this.soundEngine.playMenuSelect();
        this.startRace(trackId);
        break;
      }

      case 'quick_race': {
        this.soundEngine.playMenuSelect();
        this.startRace(action.trackId || 'sierra_nevada');
        break;
      }

      case 'buy_bike': {
        const bikeId = action.bikeId;
        if (!bikeId) break;
        const bike = BIKES_BY_ID[bikeId];
        if (bike && this.state.career.cash >= bike.price && !this.state.career.ownedBikeIds.includes(bikeId)) {
          this.state.career.cash -= bike.price;
          this.state.career.ownedBikeIds.push(bikeId);
          this.state.career.currentBikeId = bikeId;
          saveCareerToStorage(this.state.career);
          this.soundEngine.playCashRegister();
        }
        break;
      }

      case 'equip_bike': {
        const bikeId = action.bikeId;
        if (bikeId && this.state.career.ownedBikeIds.includes(bikeId)) {
          this.state.career.currentBikeId = bikeId;
          saveCareerToStorage(this.state.career);
          this.soundEngine.playMenuSelect();
        }
        break;
      }

      case 'restore_career': {
        if (action.career) {
          this.state.career = action.career;
          saveCareerToStorage(this.state.career);
          this.soundEngine.playCashRegister();
          this.changeScreen('track_select');
        }
        break;
      }

      case 'advance_level': {
        if (this.state.career.level < 5) {
          this.state.career.level = (this.state.career.level + 1) as ChampionshipLevel;
          // Reset track qualification for the new tier
          for (const tid of TRACK_IDS) {
            if (this.state.career.trackProgress[tid]) {
              this.state.career.trackProgress[tid].qualified = false;
            }
          }
          saveCareerToStorage(this.state.career);
          this.soundEngine.playCashRegister();
        }
        this.changeScreen('track_select');
        break;
      }

      case 'pay_repair': {
        const cost = action.data?.cost ?? Math.round(250 * this.state.career.level);
        if (this.state.career.cash >= cost) {
          this.state.career.cash -= cost;
          saveCareerToStorage(this.state.career);
          this.soundEngine.playCashRegister();
          this.changeScreen('track_select');
        } else {
          this.executeScreenActionResult({ type: 'game_over_restart' });
        }
        break;
      }

      case 'pay_fine': {
        const fine = action.data?.fine ?? Math.round(350 * this.state.career.level);
        if (this.state.career.cash >= fine) {
          this.state.career.cash -= fine;
          saveCareerToStorage(this.state.career);
          this.soundEngine.playCashRegister();
          this.changeScreen('track_select');
        } else {
          this.executeScreenActionResult({ type: 'game_over_restart' });
        }
        break;
      }

      case 'game_over_restart': {
        this.state.career = createInitialCareer();
        saveCareerToStorage(this.state.career);
        this.soundEngine.playMenuSelect();
        this.changeScreen('title');
        break;
      }

      case 'toggle_audio': {
        this.toggleAudio();
        break;
      }

      case 'copy_password': {
        const pw = this.state.career.password;
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(pw).catch(() => {});
        }
        this.soundEngine.playMenuSelect();
        break;
      }

      case 'change_screen': {
        if (action.screen) {
          this.soundEngine.playMenuSelect();
          this.changeScreen(action.screen);
        }
        break;
      }
    }
  }

  // ==========================================================================
  // RACE ENGINE CALLBACKS FACTORY
  // ==========================================================================

  private createRaceEngineCallbacks(): RaceEngineCallbacks {
    return {
      onCombatHit: (event: CombatHitEvent, _attackerName: string, targetName: string) => {
        if (event.weapon === 'fist') {
          if (event.action === 'kick') {
            this.soundEngine.playKick();
          } else {
            this.soundEngine.playPunch();
          }
        } else {
          this.soundEngine.playWeaponHit(event.weapon);
        }

        if (event.targetWipedOut) {
          if (event.attackerId === 'player') {
            this.state.career.totalKnockouts++;
            saveCareerToStorage(this.state.career);
          }
          this.hudRenderer.addNotification(`${targetName.toUpperCase()} KNOCKED OUT!`, 'combat');
        }
      },

      onWeaponSnatch: (_stealerName: string, victimName: string, weapon: WeaponType) => {
        this.soundEngine.playWeaponSnatch();
        this.hudRenderer.addNotification(
          `SNATCHED ${weapon.toUpperCase()} FROM ${victimName.toUpperCase()}!`,
          'combat'
        );
      },

      onCrash: (racer: RacerEntity, severity: number) => {
        this.soundEngine.playCrashImpact(severity);
        this.soundEngine.playRiderScream();
        if (racer.isPlayer) {
          this.hudRenderer.addNotification('WIPEOUT! RUN BACK TO YOUR BIKE!', 'crash');
        }
      },

      onNitroActivate: (racer: RacerEntity) => {
        if (racer.isPlayer) {
          this.hudRenderer.addNotification('NITROUS OXIDE BOOST!', 'info');
        }
      },

      onCopPursuitStart: (_cop: RacerEntity) => {
        this.hudRenderer.addNotification('HIGHWAY PATROL IN PURSUIT!', 'police');
      },

      onPlayerWrecked: (repairCost: number) => {
        this.pendingRepairCost = repairCost;
        this.state.career.totalWrecks++;
        saveCareerToStorage(this.state.career);
        this.soundEngine.stopEngineSound();
        this.soundEngine.stopSirenSound();
        this.soundEngine.playMusic('wrecked', true);
        this.state.currentScreen = 'wrecked_screen';
      },

      onPlayerBusted: (fineAmount: number, copName: string) => {
        this.pendingFineAmount = fineAmount;
        this.arrestingCopName = copName;
        this.state.career.totalArrests++;
        saveCareerToStorage(this.state.career);
        this.soundEngine.stopEngineSound();
        this.soundEngine.stopSirenSound();
        this.soundEngine.playMusic('busted', true);
        this.state.currentScreen = 'busted_screen';
      },

      onRaceFinished: (position: number, prizeWon: number, qualified: boolean) => {
        this.soundEngine.stopEngineSound();
        this.soundEngine.stopSirenSound();

        if (this.state.activeRace) {
          const trackId = this.state.activeRace.track.id;
          const progress = this.state.career.trackProgress[trackId];

          if (qualified) {
            this.state.career.cash += prizeWon;
            if (progress) {
              progress.qualified = true;
              progress.bestPlace = progress.bestPlace === 0 ? position : Math.min(progress.bestPlace, position);
              progress.bestTimeMs = progress.bestTimeMs === 0 ? this.state.activeRace.elapsedTimeMs : Math.min(progress.bestTimeMs, this.state.activeRace.elapsedTimeMs);
              progress.prizeMoneyWon += prizeWon;
            }
            if (position === 1) {
              this.state.career.totalRacesWon++;
            }
            saveCareerToStorage(this.state.career);
            this.soundEngine.playMusic('victory', true);
          } else {
            if (progress) {
              progress.bestPlace = progress.bestPlace === 0 ? position : Math.min(progress.bestPlace, position);
            }
            saveCareerToStorage(this.state.career);
            this.soundEngine.playMusic('title', true);
          }
        }

        this.state.currentScreen = 'race_results';
      },
    };
  }

  // ==========================================================================
  // SCREEN DISPATCH & RACE LAUNCH
  // ==========================================================================

  public startRace(trackId: TrackId): void {
    const track = TRACKS[trackId] || TRACKS.sierra_nevada;

    // Generate 3D pseudo-raster curves, elevations, and biome roadside scenery
    this.segments = buildTrackSegments(track, this.state.career.level);

    // Initialize race state with 15 AI competitors & patrolling CHP officer
    this.state.activeRace = createRaceSimulation(
      trackId,
      this.state.career.level,
      this.state.career,
      this.segments
    );

    this.state.currentScreen = 'race';
    this.countdownTimerMs = 3800;
    this.lastCountdownStage = 4;
    this.isPaused = false;
    this.pauseSelectedIndex = 0;
    this.hudRenderer.clearNotifications();

    this.soundEngine.stopEngineSound();
    this.soundEngine.stopSirenSound();
    this.soundEngine.playMusic(trackId, true);
  }

  public quitRace(): void {
    this.isPaused = false;
    this.soundEngine.stopEngineSound();
    this.soundEngine.stopSirenSound();
    this.state.activeRace = null;
    this.changeScreen('track_select');
  }

  public changeScreen(screen: GameScreen): void {
    this.state.currentScreen = screen;
    this.soundEngine.stopEngineSound();
    this.soundEngine.stopSirenSound();

    switch (screen) {
      case 'title':
      case 'main_menu':
      case 'track_select':
      case 'bike_shop':
      case 'clubhouse':
      case 'password_entry':
        if (this.soundEngine.getCurrentTrack() !== 'title') {
          this.soundEngine.playMusic('title');
        }
        break;
      case 'wrecked_screen':
        this.soundEngine.playMusic('wrecked', true);
        break;
      case 'busted_screen':
        this.soundEngine.playMusic('busted', true);
        break;
      case 'victory_congratulations':
        this.soundEngine.playMusic('victory', true);
        break;
      case 'race_results':
        // Music handled on race finish
        break;
      case 'race':
        if (this.state.activeRace) {
          this.soundEngine.playMusic(this.state.activeRace.track.id, true);
        }
        break;
    }
  }

  // ==========================================================================
  // PASSWORD KEYBOARD INPUT HANDLER
  // ==========================================================================

  private handlePasswordInput(key: string): void {
    const hitboxes = this.screenRenderer.getHitboxes();

    if (key === 'BACKSPACE') {
      const box = hitboxes.find((b) => b.action === 'password_backspace');
      if (box) {
        this.screenRenderer.handleClick(box.x + 1, box.y + 1, this.state);
        this.soundEngine.playMenuMove();
      }
    } else if (key === 'ENTER') {
      const box = hitboxes.find((b) => b.action === 'submit_password');
      if (box) {
        const res = this.screenRenderer.handleClick(box.x + 1, box.y + 1, this.state);
        this.executeScreenActionResult(res);
      }
    } else {
      const char = key.toUpperCase();
      const box = hitboxes.find((b) => b.action === 'password_key' && b.data?.char === char);
      if (box) {
        this.screenRenderer.handleClick(box.x + 1, box.y + 1, this.state);
        this.soundEngine.playMenuMove();
      }
    }
  }

  // ==========================================================================
  // RENDERING DISPATCH
  // ==========================================================================

  public render(): void {
    const ctx = this.ctx;
    const now = performance?.now ? performance.now() : Date.now();

    if (this.state.currentScreen === 'race' && this.state.activeRace) {
      // 1. Render Top 3D Pseudo-Raster Race View (640x336)
      renderRaceView(ctx, this.state.activeRace, this.segments, 640, 336);

      // 2. Compute Countdown Value for HUD Overlay
      let countdownValue: number | string | null = null;
      if (this.countdownTimerMs > 3000) {
        countdownValue = 3;
      } else if (this.countdownTimerMs > 2000) {
        countdownValue = 2;
      } else if (this.countdownTimerMs > 1000) {
        countdownValue = 1;
      } else if (this.countdownTimerMs > 0) {
        countdownValue = 'GO!!';
      }

      // 3. Render Lower Dashboard HUD with Live Dual Rear-View Mirrors (y = 336..448)
      this.hudRenderer.render(ctx, this.state.activeRace, {
        customMirrorRenderer: (mCtx, side, x, y, w, h) => {
          if (this.state.activeRace) {
            renderRearViewMirror(mCtx, x, y, w, h, this.state.activeRace, side);
          }
        },
        countdownValue,
        isPaused: this.isPaused,
        pauseSelectedIndex: this.pauseSelectedIndex,
        audioMuted: this.state.audioMuted,
      });

      // 4. Render On-Screen Touch Controls (Mobile / Touch Devices)
      this.inputManager.renderTouchControls(ctx);
    } else {
      // Non-Race Menu Screens (Title, Track Select, Bike Shop, etc.)
      this.screenRenderer.render(ctx, this.state, now);
      this.inputManager.renderTouchControls(ctx);
    }
  }

  // ==========================================================================
  // AUDIO & UI TOGGLES
  // ==========================================================================

  public toggleAudio(): boolean {
    this.state.audioMuted = !this.state.audioMuted;
    this.soundEngine.setMuted(this.state.audioMuted);
    return this.state.audioMuted;
  }

  public setAudioMuted(muted: boolean): void {
    this.state.audioMuted = muted;
    this.soundEngine.setMuted(muted);
  }

  public isAudioMuted(): boolean {
    return this.state.audioMuted;
  }

  public toggleTouchControls(force?: boolean): boolean {
    this.inputManager.touchOverlayVisible =
      force !== undefined ? force : !this.inputManager.touchOverlayVisible;
    return this.inputManager.touchOverlayVisible;
  }

  public isTouchVisible(): boolean {
    return this.inputManager.touchOverlayVisible;
  }

  public toggleScanlines(force?: boolean): boolean {
    this.scanlinesActive = force !== undefined ? force : !this.scanlinesActive;
    return this.scanlinesActive;
  }

  public isScanlinesActive(): boolean {
    return this.scanlinesActive;
  }

  public toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('game-container') || this.canvas;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  // ==========================================================================
  // HEADLESS TEST CANVAS FACTORY
  // ==========================================================================

  private createMockCanvas(): HTMLCanvasElement {
    const mockCtx: Partial<CanvasRenderingContext2D> = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      rect: () => {},
      roundRect: () => {},
      quadraticCurveTo: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({ width: 100 } as TextMetrics),
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} } as any),
      createRadialGradient: () => ({ addColorStop: () => {} } as any),
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) } as any),
      putImageData: () => {},
    };

    return {
      width: 640,
      height: 448,
      getContext: () => mockCtx as CanvasRenderingContext2D,
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 448,
        right: 640,
        bottom: 448,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    } as unknown as HTMLCanvasElement;
  }
}

// ============================================================================
// BROWSER DOM BOOTSTRAP
// ============================================================================

export function bootstrapBrowser(): RoadRashGame | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) return null;

  const game = new RoadRashGame(canvas);
  (window as any).roadRashGame = game;

  // Header Bar Button Controls
  const btnScanlines = document.getElementById('btn-scanlines');
  const btnAudio = document.getElementById('btn-audio');
  const btnTouch = document.getElementById('btn-touch');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const crtOverlay = document.getElementById('crt-overlay');

  if (btnScanlines && crtOverlay) {
    btnScanlines.addEventListener('click', () => {
      const active = game.toggleScanlines();
      crtOverlay.style.display = active ? 'block' : 'none';
      btnScanlines.textContent = active ? 'CRT: [ON]' : 'CRT: [OFF]';
    });
  }

  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      const muted = game.toggleAudio();
      btnAudio.textContent = muted ? 'AUDIO: [MUTED]' : 'AUDIO: [ON]';
      if (!muted) {
        game.soundEngine.resumeAudioContext().catch(() => {});
      }
    });
  }

  if (btnTouch) {
    btnTouch.addEventListener('click', () => {
      const visible = game.toggleTouchControls();
      btnTouch.textContent = visible ? 'TOUCH: [ON]' : 'TOUCH: [OFF]';
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      game.toggleFullscreen();
    });
  }

  // Detect touch-capable devices and enable touch overlay automatically
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    game.toggleTouchControls(true);
    if (btnTouch) btnTouch.textContent = 'TOUCH: [ON]';
  }

  // Start Main Arcade Loop
  game.start();
  return game;
}

// Auto-run when loaded directly in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrapBrowser());
  } else {
    bootstrapBrowser();
  }
}
