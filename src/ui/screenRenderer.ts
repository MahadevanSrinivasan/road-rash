/**
 * Road Rash (1991 Sega Genesis) - Menu & Cutscene Screen Renderers
 * Renders all authentic 16-bit non-race screens onto the 640x448 canvas:
 * - 'title': Sunset highway with animated fighting biker silhouettes & chrome/fire logo
 * - 'main_menu' / 'track_select': California tracks, cash, level, and career hub
 * - 'bike_shop': Interactive dealership with Panda, Sport, Super classes & stat bars
 * - 'clubhouse': 14 AI Rivals + CHP Officers with 16-bit portraits, quotes & tips
 * - 'race_results': Standings, qualification banner, rival quotes, and level progression
 * - 'wrecked_screen': Animated 16-bit tow-truck / chop shop & repair deductions
 * - 'busted_screen': Flashing CHP cruiser lights, officer citation & fine deductions
 * - 'password_entry': Interactive 8-character arcade password grid & decoder
 * - 'victory_congratulations': Grand championship trophy presentation & career stats
 */

import {
  BikeClass,
  CareerProgress,
  GameState,
  GameScreen,
  RacerEntity,
  TrackId,
  DecodedPassword,
} from '../types';
import {
  BIKES,
  BIKES_BY_ID,
  AI_RIVALS,
  POLICE_OFFICERS,
  TRACKS,
  TRACK_IDS,
  decodePassword,
  createInitialCareer,
} from '../data/gameData';
import { MenuAction } from '../input/inputManager';

export interface ScreenHitbox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  action: string;
  data?: any;
}

export interface ScreenActionResult {
  type:
    | 'change_screen'
    | 'start_race'
    | 'quick_race'
    | 'buy_bike'
    | 'equip_bike'
    | 'restore_career'
    | 'advance_level'
    | 'pay_repair'
    | 'pay_fine'
    | 'game_over_restart'
    | 'toggle_audio'
    | 'copy_password'
    | 'none';
  screen?: GameScreen;
  trackId?: TrackId;
  bikeId?: string;
  career?: CareerProgress;
  data?: any;
}

const PASSWORD_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export class ScreenRenderer {
  // Navigation & Sub-Selection States
  public titleSelectedIndex: number = 0;
  public trackSelectedIndex: number = 0;
  public bikeShopClass: BikeClass = 'Panda';
  public bikeShopBikeIndex: number = 0;
  public clubhouseRivalIndex: number = 0;

  // Password Entry Buffer
  public passwordBuffer: string = '';
  public passwordFeedback: { text: string; isError: boolean } | null = null;

  // Cached Clickable Hitboxes for the current frame
  private activeHitboxes: ScreenHitbox[] = [];

  constructor() {}

  /**
   * Main render dispatch for non-race screens.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    animTimeMs?: number
  ): void {
    const now = animTimeMs ?? (performance?.now ? performance.now() : Date.now());
    this.activeHitboxes = [];

    switch (state.currentScreen) {
      case 'title':
        this.renderTitleScreen(ctx, state, now);
        break;
      case 'main_menu':
      case 'track_select':
        this.renderTrackSelectScreen(ctx, state, now);
        break;
      case 'bike_shop':
        this.renderBikeShopScreen(ctx, state, now);
        break;
      case 'clubhouse':
        this.renderClubhouseScreen(ctx, state, now);
        break;
      case 'race_results':
        this.renderRaceResultsScreen(ctx, state, now);
        break;
      case 'wrecked_screen':
        this.renderWreckedScreen(ctx, state, now);
        break;
      case 'busted_screen':
        this.renderBustedScreen(ctx, state, now);
        break;
      case 'password_entry':
        this.renderPasswordEntryScreen(ctx, state, now);
        break;
      case 'victory_congratulations':
        this.renderVictoryScreen(ctx, state, now);
        break;
      case 'race':
      default:
        // Race screen is handled by the raster 3D road renderer and hudRenderer
        break;
    }
  }

  /**
   * Get hitboxes registered during the most recent render pass.
   */
  public getHitboxes(): ScreenHitbox[] {
    return this.activeHitboxes;
  }

  // ==========================================================================
  // INPUT & INTERACTION HANDLING
  // ==========================================================================

  /**
   * Handles canvas clicks/taps in 640x448 virtual space.
   */
  public handleClick(
    x: number,
    y: number,
    state: GameState
  ): ScreenActionResult | null {
    for (const box of this.activeHitboxes) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        return this.handleAction(box.action, state, box.data);
      }
    }
    return null;
  }

  /**
   * Handles keyboard/gamepad menu navigation (up, down, left, right, confirm, back).
   */
  public handleNavAction(
    action: MenuAction,
    state: GameState
  ): ScreenActionResult | null {
    const screen = state.currentScreen;

    if (screen === 'title') {
      const optionsCount = 5;
      if (action === 'up') {
        this.titleSelectedIndex = (this.titleSelectedIndex - 1 + optionsCount) % optionsCount;
      } else if (action === 'down') {
        this.titleSelectedIndex = (this.titleSelectedIndex + 1) % optionsCount;
      } else if (action === 'confirm') {
        const actions = [
          'goto_championship',
          'start_quick_race',
          'goto_bike_shop',
          'goto_clubhouse',
          'goto_password',
        ];
        return this.handleAction(actions[this.titleSelectedIndex], state);
      }
    } else if (screen === 'track_select' || screen === 'main_menu') {
      const trackCount = TRACK_IDS.length;
      if (action === 'up' || action === 'left') {
        this.trackSelectedIndex = (this.trackSelectedIndex - 1 + trackCount) % trackCount;
      } else if (action === 'down' || action === 'right') {
        this.trackSelectedIndex = (this.trackSelectedIndex + 1) % trackCount;
      } else if (action === 'confirm') {
        return this.handleAction('start_selected_race', state);
      } else if (action === 'back') {
        return { type: 'change_screen', screen: 'title' };
      }
    } else if (screen === 'bike_shop') {
      const classes: BikeClass[] = ['Panda', 'Sport', 'Super'];
      const classIdx = classes.indexOf(this.bikeShopClass);
      const bikesInClass = BIKES.filter((b) => b.class === this.bikeShopClass);

      if (action === 'left') {
        this.bikeShopBikeIndex =
          (this.bikeShopBikeIndex - 1 + bikesInClass.length) % bikesInClass.length;
      } else if (action === 'right') {
        this.bikeShopBikeIndex = (this.bikeShopBikeIndex + 1) % bikesInClass.length;
      } else if (action === 'up') {
        const nextClass = classes[(classIdx - 1 + classes.length) % classes.length];
        this.bikeShopClass = nextClass;
        this.bikeShopBikeIndex = 0;
      } else if (action === 'down') {
        const nextClass = classes[(classIdx + 1) % classes.length];
        this.bikeShopClass = nextClass;
        this.bikeShopBikeIndex = 0;
      } else if (action === 'confirm') {
        const bike = bikesInClass[this.bikeShopBikeIndex];
        if (bike) {
          if (state.career.ownedBikeIds.includes(bike.id)) {
            return this.handleAction('equip_bike', state, { bikeId: bike.id });
          } else {
            return this.handleAction('buy_bike', state, { bikeId: bike.id });
          }
        }
      } else if (action === 'back') {
        return { type: 'change_screen', screen: 'track_select' };
      }
    } else if (screen === 'clubhouse') {
      const totalChars = AI_RIVALS.length + POLICE_OFFICERS.length;
      if (action === 'left' || action === 'up') {
        this.clubhouseRivalIndex =
          (this.clubhouseRivalIndex - 1 + totalChars) % totalChars;
      } else if (action === 'right' || action === 'down') {
        this.clubhouseRivalIndex = (this.clubhouseRivalIndex + 1) % totalChars;
      } else if (action === 'back' || action === 'confirm') {
        return { type: 'change_screen', screen: 'track_select' };
      }
    } else if (screen === 'race_results') {
      if (action === 'confirm' || action === 'back') {
        return this.handleAction('continue_from_results', state);
      }
    } else if (screen === 'wrecked_screen') {
      if (action === 'confirm' || action === 'back') {
        return this.handleAction('pay_repair_or_continue', state);
      }
    } else if (screen === 'busted_screen') {
      if (action === 'confirm' || action === 'back') {
        return this.handleAction('pay_fine_or_continue', state);
      }
    } else if (screen === 'password_entry') {
      if (action === 'back') {
        return { type: 'change_screen', screen: 'track_select' };
      } else if (action === 'confirm') {
        return this.handleAction('submit_password', state);
      }
    } else if (screen === 'victory_congratulations') {
      if (action === 'confirm' || action === 'back') {
        return { type: 'change_screen', screen: 'title' };
      }
    }

    return null;
  }

  /**
   * Internal action router.
   */
  private handleAction(
    action: string,
    state: GameState,
    data?: any
  ): ScreenActionResult | null {
    switch (action) {
      case 'goto_championship':
      case 'goto_track_select':
        return { type: 'change_screen', screen: 'track_select' };

      case 'start_quick_race':
        return { type: 'quick_race', trackId: 'sierra_nevada' };

      case 'goto_bike_shop':
        return { type: 'change_screen', screen: 'bike_shop' };

      case 'goto_clubhouse':
        return { type: 'change_screen', screen: 'clubhouse' };

      case 'goto_password':
        this.passwordBuffer = '';
        this.passwordFeedback = null;
        return { type: 'change_screen', screen: 'password_entry' };

      case 'goto_title':
        return { type: 'change_screen', screen: 'title' };

      case 'start_selected_race': {
        const trackId = TRACK_IDS[this.trackSelectedIndex] || 'sierra_nevada';
        return { type: 'start_race', trackId };
      }

      case 'select_track':
        if (typeof data?.index === 'number') {
          this.trackSelectedIndex = data.index;
        }
        return null;

      case 'set_bike_class':
        if (data?.class) {
          this.bikeShopClass = data.class;
          this.bikeShopBikeIndex = 0;
        }
        return null;

      case 'cycle_bike':
        if (typeof data?.delta === 'number') {
          const list = BIKES.filter((b) => b.class === this.bikeShopClass);
          this.bikeShopBikeIndex =
            (this.bikeShopBikeIndex + data.delta + list.length) % list.length;
        }
        return null;

      case 'buy_bike':
        return { type: 'buy_bike', bikeId: data?.bikeId };

      case 'equip_bike':
        return { type: 'equip_bike', bikeId: data?.bikeId };

      case 'cycle_clubhouse':
        if (typeof data?.delta === 'number') {
          const total = AI_RIVALS.length + POLICE_OFFICERS.length;
          this.clubhouseRivalIndex =
            (this.clubhouseRivalIndex + data.delta + total) % total;
        }
        return null;

      case 'continue_from_results': {
        // Check if all 5 tracks are qualified on current level
        const currentLevel = state.career.level;
        const allQualified = TRACK_IDS.every(
          (t) => state.career.trackProgress[t]?.qualified
        );

        if (allQualified) {
          if (currentLevel >= 5) {
            return { type: 'change_screen', screen: 'victory_congratulations' };
          } else {
            return { type: 'advance_level' };
          }
        }
        return { type: 'change_screen', screen: 'track_select' };
      }

      case 'retry_race': {
        const activeTrack = state.activeRace?.track.id || TRACK_IDS[this.trackSelectedIndex];
        return { type: 'start_race', trackId: activeTrack };
      }

      case 'pay_repair_or_continue': {
        const repairCost = Math.round(250 * state.career.level);
        if (state.career.cash < repairCost) {
          return { type: 'game_over_restart' };
        }
        return { type: 'pay_repair', data: { cost: repairCost } };
      }

      case 'pay_fine_or_continue': {
        const fineCost = Math.round(350 * state.career.level);
        if (state.career.cash < fineCost) {
          return { type: 'game_over_restart' };
        }
        return { type: 'pay_fine', data: { fine: fineCost } };
      }

      case 'password_key':
        if (data?.char && this.passwordBuffer.length < 8) {
          this.passwordBuffer += data.char;
          this.validatePasswordBuffer();
        }
        return null;

      case 'password_backspace':
        this.passwordBuffer = this.passwordBuffer.slice(0, -1);
        this.validatePasswordBuffer();
        return null;

      case 'password_clear':
        this.passwordBuffer = '';
        this.passwordFeedback = null;
        return null;

      case 'password_copy_current':
        this.passwordBuffer = state.career.password;
        this.validatePasswordBuffer();
        return null;

      case 'submit_password': {
        const decoded = this.validatePasswordBuffer();
        if (decoded && decoded.valid) {
          const restoredCareer: CareerProgress = {
            level: decoded.level,
            cash: decoded.cash,
            currentBikeId: BIKES[decoded.bikeIndex]?.id || BIKES[0].id,
            ownedBikeIds: [BIKES[decoded.bikeIndex]?.id || BIKES[0].id],
            trackProgress: { ...createInitialCareer().trackProgress },
            totalRacesWon: 0,
            totalKnockouts: 0,
            totalArrests: 0,
            totalWrecks: 0,
            password: this.passwordBuffer,
          };

          // Re-populate qualified tracks from bitmask
          TRACK_IDS.forEach((id, idx) => {
            if (decoded.tracksQualifiedBits & (1 << idx)) {
              restoredCareer.trackProgress[id] = {
                trackId: id,
                qualified: true,
                bestPlace: 1,
                bestTimeMs: 120000,
                prizeMoneyWon: 1000,
              };
            }
          });

          return { type: 'restore_career', career: restoredCareer };
        }
        return null;
      }

      default:
        return null;
    }
  }

  private validatePasswordBuffer(): DecodedPassword | null {
    if (this.passwordBuffer.length === 8) {
      const decoded = decodePassword(this.passwordBuffer);
      if (decoded.valid) {
        const bikeName = BIKES[decoded.bikeIndex]?.name || 'Unknown Bike';
        this.passwordFeedback = {
          text: `VALID! LVL ${decoded.level} • $${decoded.cash.toLocaleString()} • ${bikeName}`,
          isError: false,
        };
        return decoded;
      } else {
        this.passwordFeedback = {
          text: 'INVALID PASSWORD! CHECKSUM FAILED',
          isError: true,
        };
        return null;
      }
    } else {
      this.passwordFeedback = null;
      return null;
    }
  }

  // ==========================================================================
  // 1. TITLE SCREEN
  // ==========================================================================

  private renderTitleScreen(
    ctx: CanvasRenderingContext2D,
    _state: GameState,
    now: number
  ): void {
    const w = 640;
    const h = 448;

    // 1. Sunset Sky Bands
    const sky = ctx.createLinearGradient(0, 0, 0, 260);
    sky.addColorStop(0, '#150624'); // Deep twilight purple
    sky.addColorStop(0.25, '#3b0d3a');
    sky.addColorStop(0.5, '#781c3e'); // Crimson
    sky.addColorStop(0.75, '#c84414'); // Orange
    sky.addColorStop(1, '#ff9900'); // Radiant golden horizon
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, 260);

    // 2. Setting Sun on Horizon
    const sunGrad = ctx.createRadialGradient(320, 240, 10, 320, 240, 90);
    sunGrad.addColorStop(0, '#ffffff');
    sunGrad.addColorStop(0.2, '#fff176');
    sunGrad.addColorStop(0.6, '#ff6d00');
    sunGrad.addColorStop(1, 'rgba(255, 109, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(320, 240, 90, 0, Math.PI * 2);
    ctx.fill();

    // 3. Distant Jagged Mountains Silhouette
    ctx.fillStyle = '#11051b';
    ctx.beginPath();
    ctx.moveTo(0, 240);
    ctx.lineTo(60, 210);
    ctx.lineTo(130, 228);
    ctx.lineTo(210, 195);
    ctx.lineTo(290, 230);
    ctx.lineTo(360, 205);
    ctx.lineTo(440, 235);
    ctx.lineTo(520, 190);
    ctx.lineTo(590, 220);
    ctx.lineTo(640, 238);
    ctx.lineTo(640, 260);
    ctx.lineTo(0, 260);
    ctx.closePath();
    ctx.fill();

    // 4. Highway Asphalt Road Converging to Horizon
    const road = ctx.createLinearGradient(0, 240, 0, h);
    road.addColorStop(0, '#1c1d22');
    road.addColorStop(1, '#08080a');
    ctx.fillStyle = road;
    ctx.fillRect(0, 240, w, h - 240);

    // Shoulder & Rumble Strips
    ctx.fillStyle = '#3a2210';
    ctx.fillRect(0, 240, 40, h - 240);
    ctx.fillRect(w - 40, 240, 40, h - 240);

    // Perspective Road Markings (animated forward motion)
    const animOffset = (now * 0.15) % 40;
    ctx.strokeStyle = '#e5b800';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(320, 240 + animOffset);
    ctx.lineTo(320, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Animated Biker Battle Silhouettes on Highway
    this.renderBikerBattleSilhouettes(ctx, now);

    // 6. Extruded Chrome/Fire "ROAD RASH" Emblem
    this.renderRoadRashLogo(ctx, 320, 78, now);

    // Subtitle
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SEGA GENESIS 16-BIT RETRO COMBAT MOTORCYCLE RACING', 320, 118);

    // 7. Title Menu Options Box
    const menuOptions = [
      { text: 'START CHAMPIONSHIP', action: 'goto_championship' },
      { text: 'QUICK RACE (THRASH MODE)', action: 'start_quick_race' },
      { text: 'BIKE SHOP', action: 'goto_bike_shop' },
      { text: 'CLUBHOUSE (RIVALS)', action: 'goto_clubhouse' },
      { text: 'ENTER PASSWORD', action: 'goto_password' },
    ];

    const boxX = 140;
    const boxY = 250;
    const boxW = 360;
    const boxH = 160;

    // Menu backdrop panel
    ctx.fillStyle = 'rgba(10, 12, 16, 0.90)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    for (let i = 0; i < menuOptions.length; i++) {
      const opt = menuOptions[i];
      const oy = boxY + 16 + i * 28;
      const isSelected = i === this.titleSelectedIndex;

      // Register clickable hitbox
      this.activeHitboxes.push({
        id: `title_opt_${i}`,
        x: boxX + 10,
        y: oy - 6,
        w: boxW - 20,
        h: 24,
        action: opt.action,
      });

      if (isSelected) {
        // Glowing gold highlight rect
        ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
        ctx.fillRect(boxX + 10, oy - 6, boxW - 20, 24);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 10, oy - 6, boxW - 20, 24);

        // Blinking arrow cursor
        ctx.fillStyle = '#ff3d00';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('►', boxX + 34, oy + 11);
      }

      ctx.fillStyle = isSelected ? '#ffffff' : '#a0aec0';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(opt.text, boxX + 44, oy + 11);
    }

    // Footer prompt
    const promptFlash = Math.floor(now / 350) % 2 === 0;
    ctx.fillStyle = promptFlash ? '#ffd700' : '#8899aa';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS UP/DOWN & ENTER OR CLICK TO SELECT', 320, 424);

    ctx.fillStyle = '#556677';
    ctx.font = '8px "Courier New", monospace';
    ctx.fillText('© 1991 ELECTRONIC ARTS / SEGA GENESIS REMAKE', 320, 438);
  }

  private renderBikerBattleSilhouettes(ctx: CanvasRenderingContext2D, now: number): void {
    // Rider 1 (Left - Swinging Billy Club)
    const bob1 = Math.sin(now * 0.01) * 3;
    const r1X = 220;
    const r1Y = 220 + bob1;

    // Bike Silhouette 1
    ctx.fillStyle = '#060608';
    ctx.beginPath();
    ctx.ellipse(r1X - 25, r1Y + 15, 14, 14, 0, 0, Math.PI * 2); // Rear wheel
    ctx.ellipse(r1X + 25, r1Y + 15, 14, 14, 0, 0, Math.PI * 2); // Front wheel
    ctx.rect(r1X - 20, r1Y - 2, 40, 14); // Frame
    ctx.fill();

    // Rider 1 Torso & Swinging Weapon Arm
    ctx.fillRect(r1X - 8, r1Y - 24, 16, 22);
    ctx.beginPath();
    ctx.arc(r1X + 2, r1Y - 30, 8, 0, Math.PI * 2); // Helmet
    ctx.fill();

    // Club swing angle
    const swingAngle = Math.sin(now * 0.008) * 0.5 - 0.3;
    ctx.save();
    ctx.translate(r1X + 8, r1Y - 20);
    ctx.rotate(swingAngle);
    ctx.fillStyle = '#d97706'; // Wooden club highlight
    ctx.fillRect(0, -2, 26, 4);
    ctx.restore();

    // Rider 2 (Right - Counter punch)
    const bob2 = Math.cos(now * 0.012) * 3;
    const r2X = 420;
    const r2Y = 215 + bob2;

    // Bike Silhouette 2
    ctx.fillStyle = '#060608';
    ctx.beginPath();
    ctx.ellipse(r2X - 25, r2Y + 15, 14, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(r2X + 25, r2Y + 15, 14, 14, 0, 0, Math.PI * 2);
    ctx.rect(r2X - 20, r2Y - 2, 40, 14);
    ctx.fill();

    // Rider 2 Torso & Head
    ctx.fillRect(r2X - 8, r2Y - 24, 16, 22);
    ctx.beginPath();
    ctx.arc(r2X - 2, r2Y - 30, 8, 0, Math.PI * 2);
    ctx.fill();

    // Exhaust Flame Sparks
    if (Math.sin(now * 0.02) > 0) {
      ctx.fillStyle = '#ff4400';
      ctx.beginPath();
      ctx.arc(r1X - 35, r1Y + 12, 4, 0, Math.PI * 2);
      ctx.arc(r2X - 35, r2Y + 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderRoadRashLogo(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    _now: number
  ): void {
    ctx.save();

    const logoText = 'ROAD RASH';

    // 1. Heavy Extruded 3D Drop Shadow (Burgundy/Black)
    ctx.fillStyle = '#220408';
    ctx.font = '900 68px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(logoText, cx + 5, cy + 6);

    // 2. Outer Chrome Stroke
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeText(logoText, cx, cy);

    // 3. Dark Crimson Inner Stroke
    ctx.strokeStyle = '#7f0000';
    ctx.lineWidth = 4;
    ctx.strokeText(logoText, cx, cy);

    // 4. Fire Gradient Fill (Yellow -> Vivid Orange -> Crimson)
    const fireGrad = ctx.createLinearGradient(0, cy - 35, 0, cy + 35);
    fireGrad.addColorStop(0, '#ffffff');
    fireGrad.addColorStop(0.2, '#fff200');
    fireGrad.addColorStop(0.55, '#ff4800');
    fireGrad.addColorStop(0.85, '#b30000');
    fireGrad.addColorStop(1, '#520000');
    ctx.fillStyle = fireGrad;
    ctx.fillText(logoText, cx, cy);

    // 5. Metallic Chrome Glint Line across middle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(cx - 200, cy - 2, 400, 3);

    ctx.restore();
  }

  // ==========================================================================
  // 2. TRACK SELECT / MAIN MENU HUB SCREEN
  // ==========================================================================

  private renderTrackSelectScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    now: number
  ): void {
    const career = state.career;
    const currentBike = BIKES_BY_ID[career.currentBikeId] || BIKES[0];

    // Background gradient (Steel Blue / Carbon)
    const bg = ctx.createLinearGradient(0, 0, 0, 448);
    bg.addColorStop(0, '#10141d');
    bg.addColorStop(1, '#080a0f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 448);

    // 1. Top Status HUD Bar
    this.renderTopMenuBar(ctx, career, currentBike);

    // 2. Track Selection Carousel Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SELECT CALIFORNIA TRACK • CHAMPIONSHIP LEVEL ${career.level}`, 320, 72);

    // 3. Render 5 Track Cards
    const cardW = 114;
    const cardH = 240;
    const startX = 23;
    const startY = 88;

    for (let i = 0; i < TRACK_IDS.length; i++) {
      const trackId = TRACK_IDS[i];
      const track = TRACKS[trackId];
      const tx = startX + i * (cardW + 8);
      const isSelected = i === this.trackSelectedIndex;
      const progress = career.trackProgress[trackId];
      const isQualified = progress?.qualified;

      // Register clickable card hitbox
      this.activeHitboxes.push({
        id: `track_card_${i}`,
        x: tx,
        y: startY,
        w: cardW,
        h: cardH,
        action: 'select_track',
        data: { index: i },
      });

      // Card Background
      ctx.fillStyle = isSelected ? '#1c2230' : '#12151c';
      ctx.fillRect(tx, startY, cardW, cardH);

      // Card Border
      ctx.strokeStyle = isSelected ? '#ffd700' : isQualified ? '#2ecc71' : '#2d3748';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeRect(tx, startY, cardW, cardH);

      // Mini Landscape Swatch (Palette Preview)
      this.renderTrackPaletteSwatch(ctx, track.colors, tx + 6, startY + 8, cardW - 12, 60);

      // Track Name
      ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e0';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(track.name.toUpperCase(), tx + cardW / 2, startY + 82);

      // Track Mileage
      const miles = track.lengthMilesByLevel[career.level] || 5.0;
      ctx.fillStyle = '#a0aec0';
      ctx.font = '9px "Courier New", monospace';
      ctx.fillText(`${miles} MILES`, tx + cardW / 2, startY + 98);

      // Prize Money Breakdown
      const prizes = track.cashPrizesByLevel[career.level] || [1000, 750, 500];
      ctx.fillStyle = '#718096';
      ctx.font = '8px "Courier New", monospace';
      ctx.fillText('PRIZE MONEY', tx + cardW / 2, startY + 118);

      ctx.fillStyle = '#ffd700';
      ctx.fillText(`1ST: $${prizes[0]}`, tx + cardW / 2, startY + 132);
      ctx.fillStyle = '#cbd5e0';
      ctx.fillText(`2ND: $${prizes[1]}`, tx + cardW / 2, startY + 146);
      ctx.fillStyle = '#ed8936';
      ctx.fillText(`3RD: $${prizes[2]}`, tx + cardW / 2, startY + 160);

      // Best Place or Finish
      if (progress && progress.bestPlace < 99) {
        ctx.fillStyle = '#81e6d9';
        ctx.fillText(`BEST: ${progress.bestPlace}TH`, tx + cardW / 2, startY + 180);
      }

      // Qualification Badge Stamp
      const stampY = startY + 204;
      if (isQualified) {
        ctx.fillStyle = '#065f46';
        ctx.fillRect(tx + 8, stampY, cardW - 16, 22);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 8, stampY, cardW - 16, 22);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.fillText('QUALIFIED', tx + cardW / 2, stampY + 15);
      } else {
        ctx.fillStyle = '#4a1d24';
        ctx.fillRect(tx + 8, stampY, cardW - 16, 22);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx + 8, stampY, cardW - 16, 22);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 9px "Courier New", monospace';
        ctx.fillText('NEED TOP 3', tx + cardW / 2, stampY + 15);
      }
    }

    // 4. Bottom Navigation Button Bar
    const navButtons = [
      { text: 'START RACE', action: 'start_selected_race', bg: '#059669', border: '#10b981' },
      { text: 'BIKE SHOP', action: 'goto_bike_shop', bg: '#1d4ed8', border: '#3b82f6' },
      { text: 'CLUBHOUSE', action: 'goto_clubhouse', bg: '#6d28d9', border: '#8b5cf6' },
      { text: 'PASSWORD', action: 'goto_password', bg: '#b45309', border: '#f59e0b' },
      { text: 'TITLE', action: 'goto_title', bg: '#374151', border: '#6b7280' },
    ];

    const btnW = 110;
    const btnH = 36;
    const btnGap = 12;
    const totalBtnW = navButtons.length * btnW + (navButtons.length - 1) * btnGap;
    const btnStartX = (640 - totalBtnW) / 2;
    const btnY = 356;

    for (let i = 0; i < navButtons.length; i++) {
      const b = navButtons[i];
      const bx = btnStartX + i * (btnW + btnGap);

      // Register hitbox
      this.activeHitboxes.push({
        id: `main_btn_${i}`,
        x: bx,
        y: btnY,
        w: btnW,
        h: btnH,
        action: b.action,
      });

      // Button background
      ctx.fillStyle = b.bg;
      ctx.fillRect(bx, btnY, btnW, btnH);
      ctx.strokeStyle = b.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, btnY, btnW, btnH);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.text, bx + btnW / 2, btnY + 22);
    }

    // Prompt Footer
    const promptFlash = Math.floor(now / 300) % 2 === 0;
    ctx.fillStyle = promptFlash ? '#ffd700' : '#a0aec0';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT TRACK WITH ARROW KEYS & HIT ENTER OR CLICK START RACE', 320, 420);
  }

  private renderTopMenuBar(
    ctx: CanvasRenderingContext2D,
    career: CareerProgress,
    currentBike: any
  ): void {
    // Metallic bezel strip across top (y = 0..48)
    ctx.fillStyle = '#141822';
    ctx.fillRect(0, 0, 640, 48);
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 640, 48);

    // Level Badge
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${career.level}`, 20, 22);

    // Cash Display
    ctx.fillStyle = '#10b981'; // Green
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`CASH: $${career.cash.toLocaleString()}`, 110, 22);

    // Current Bike
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`BIKE: ${currentBike.name.toUpperCase()} [${currentBike.class.toUpperCase()}]`, 270, 22);

    // Career Password Tag
    ctx.fillStyle = '#a0aec0';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`PASSWORD: [ ${career.password} ]`, 620, 22);
    ctx.fillText('CLICK TO COPY', 620, 36);

    // Password hitbox
    this.activeHitboxes.push({
      id: 'copy_password_hud',
      x: 480,
      y: 8,
      w: 150,
      h: 34,
      action: 'goto_password',
    });
  }

  private renderTrackPaletteSwatch(
    ctx: CanvasRenderingContext2D,
    colors: any,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Sky
    const sky = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    sky.addColorStop(0, colors.skyGradientTop);
    sky.addColorStop(1, colors.skyGradientBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h * 0.5);

    // Mountains
    ctx.fillStyle = colors.distantMountains;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.5);
    ctx.lineTo(x + w * 0.3, y + h * 0.25);
    ctx.lineTo(x + w * 0.7, y + h * 0.4);
    ctx.lineTo(x + w, y + h * 0.3);
    ctx.lineTo(x + w, y + h * 0.5);
    ctx.closePath();
    ctx.fill();

    // Hills
    ctx.fillStyle = colors.hills;
    ctx.beginPath();
    ctx.arc(x + w * 0.4, y + h * 0.6, w * 0.4, Math.PI, 0);
    ctx.fill();

    // Road & Grass
    ctx.fillStyle = colors.grassDark;
    ctx.fillRect(x, y + h * 0.5, w, h * 0.5);

    // Road Trapezoid
    ctx.fillStyle = colors.roadDark;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.4, y + h * 0.5);
    ctx.lineTo(x + w * 0.6, y + h * 0.5);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.closePath();
    ctx.fill();

    // Frame
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  // ==========================================================================
  // 3. BIKE SHOP SCREEN
  // ==========================================================================

  private renderBikeShopScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    _now: number
  ): void {
    const career = state.career;
    const currentBike = BIKES_BY_ID[career.currentBikeId] || BIKES[0];

    // Background
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, 640, 448);

    // Top Dealership Banner
    ctx.fillStyle = '#171c26';
    ctx.fillRect(0, 0, 640, 44);
    ctx.strokeStyle = '#2a3444';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 640, 44);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText("DERBI'S MOTORCYCLE DEALERSHIP", 20, 28);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`BANKROLL: $${career.cash.toLocaleString()}`, 620, 28);

    // 3 Class Tabs: Panda, Sport, Super
    const classes: BikeClass[] = ['Panda', 'Sport', 'Super'];
    const tabW = 120;
    const tabH = 28;
    const tabStartX = 20;
    const tabY = 54;

    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const tx = tabStartX + i * (tabW + 8);
      const isSelected = cls === this.bikeShopClass;

      this.activeHitboxes.push({
        id: `bike_tab_${cls}`,
        x: tx,
        y: tabY,
        w: tabW,
        h: tabH,
        action: 'set_bike_class',
        data: { class: cls },
      });

      ctx.fillStyle = isSelected ? '#1e3a8a' : '#1e293b';
      ctx.fillRect(tx, tabY, tabW, tabH);
      ctx.strokeStyle = isSelected ? '#60a5fa' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tx, tabY, tabW, tabH);

      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${cls.toUpperCase()} CLASS`, tx + tabW / 2, tabY + 18);
    }

    // Filter bikes by selected class
    const bikesInClass = BIKES.filter((b) => b.class === this.bikeShopClass);
    if (this.bikeShopBikeIndex >= bikesInClass.length) {
      this.bikeShopBikeIndex = 0;
    }
    const bike = bikesInClass[this.bikeShopBikeIndex] || bikesInClass[0];

    // Left Panel: Bike Visual Preview (x = 20, y = 92, w = 280, h = 260)
    this.renderBikeVisualCard(ctx, bike, 20, 92, 280, 260);

    // Right Panel: Bike Stats & Pricing (x = 312, y = 92, w = 308, h = 260)
    this.renderBikeStatsCard(ctx, bike, currentBike, career, 312, 92, 308, 260);

    // Bottom Action Bar
    this.renderBikeShopActionBar(ctx, bike, currentBike, career);
  }

  private renderBikeVisualCard(
    ctx: CanvasRenderingContext2D,
    bike: any,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Card Housing
    ctx.fillStyle = '#121722';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2a3444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Bike Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bike.name.toUpperCase(), x + w / 2, y + 28);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(`${bike.class.toUpperCase()} CLASS • $${bike.price.toLocaleString()}`, x + w / 2, y + 46);

    // Left / Right Bike Switcher Hitboxes & Arrows
    this.activeHitboxes.push({
      id: 'bike_prev',
      x: x + 8,
      y: y + 90,
      w: 30,
      h: 40,
      action: 'cycle_bike',
      data: { delta: -1 },
    });
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('◄', x + 22, y + 115);

    this.activeHitboxes.push({
      id: 'bike_next',
      x: x + w - 38,
      y: y + 90,
      w: 30,
      h: 40,
      action: 'cycle_bike',
      data: { delta: 1 },
    });
    ctx.fillText('►', x + w - 22, y + 115);

    // 16-Bit Motorcycle Pixel Artwork Preview
    this.drawMotorcycleGraphic(ctx, bike, x + 40, y + 70, w - 80, 110);

    // Description
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'center';
    this.wrapText(ctx, bike.description, x + w / 2, y + 200, w - 24, 13);
  }

  private drawMotorcycleGraphic(
    ctx: CanvasRenderingContext2D,
    bike: any,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2 + 10;
    const colors = bike.colorScheme;

    // Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 30, 70, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels (Rear & Front)
    const wheelR = 24;
    const rearX = cx - 45;
    const frontX = cx + 45;
    const wheelY = cy + 14;

    // Outer Tires
    ctx.fillStyle = colors.wheels || '#181818';
    ctx.beginPath();
    ctx.arc(rearX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.arc(frontX, wheelY, wheelR, 0, Math.PI * 2);
    ctx.fill();

    // Rims
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rearX, wheelY, wheelR - 6, 0, Math.PI * 2);
    ctx.arc(frontX, wheelY, wheelR - 6, 0, Math.PI * 2);
    ctx.stroke();

    // Wheel Hubs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rearX, wheelY, 4, 0, Math.PI * 2);
    ctx.arc(frontX, wheelY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Exhaust Pipes
    ctx.strokeStyle = colors.exhaust || '#cccccc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 12);
    ctx.lineTo(rearX - 10, cy + 12);
    ctx.stroke();

    // Engine Block
    ctx.fillStyle = colors.engine || '#333333';
    ctx.fillRect(cx - 16, cy - 4, 32, 22);

    // Cylinder Cooling Fins
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    for (let f = 0; f < 4; f++) {
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy + f * 5);
      ctx.lineTo(cx + 14, cy + f * 5);
      ctx.stroke();
    }

    // Main Fairing & Gas Tank
    ctx.fillStyle = colors.fairing || '#c83232';
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy - 8); // Tail
    ctx.lineTo(cx - 12, cy - 14); // Seat
    ctx.lineTo(cx + 12, cy - 18); // Tank
    ctx.lineTo(cx + 40, cy - 12); // Front Nose
    ctx.lineTo(cx + 28, cy + 6); // Lower Fairing
    ctx.lineTo(cx - 14, cy + 6);
    ctx.closePath();
    ctx.fill();

    // Accent Stripe on Tank
    ctx.fillStyle = colors.tank || '#ffffff';
    ctx.fillRect(cx - 6, cy - 16, 24, 3);

    // Windshield Visor
    ctx.fillStyle = colors.windshield || '#80b8d8';
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy - 14);
    ctx.lineTo(cx + 44, cy - 24);
    ctx.lineTo(cx + 42, cy - 12);
    ctx.closePath();
    ctx.fill();

    // Handlebars
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy - 20);
    ctx.lineTo(cx + 28, cy - 24);
    ctx.stroke();
  }

  private renderBikeStatsCard(
    ctx: CanvasRenderingContext2D,
    bike: any,
    currentBike: any,
    career: CareerProgress,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#121722';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2a3444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Header
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SPECIFICATIONS & BENCHMARK', x + 16, y + 24);

    // Stats Grid
    const stats = [
      { name: 'HORSEPOWER', val: `${bike.hp} HP`, fraction: bike.hp / 180 },
      { name: 'WEIGHT', val: `${bike.weightLbs} LBS`, fraction: (500 - bike.weightLbs) / 200 },
      { name: 'TOP SPEED', val: `${bike.topSpeedMph} MPH`, fraction: bike.topSpeedMph / 200 },
      { name: 'ACCELERATION', val: `${bike.acceleration}%`, fraction: bike.acceleration / 100 },
      { name: 'CORNERING', val: `${bike.cornering}%`, fraction: bike.cornering / 100 },
      { name: 'DURABILITY', val: `${bike.durability}%`, fraction: bike.durability / 100 },
      { name: 'NITRO CHARGES', val: bike.hasNitro ? `${bike.nitroCharges} BOOSTS` : 'NONE', fraction: bike.nitroCharges / 5 },
    ];

    const statStartY = y + 42;
    const statH = 18;

    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      const sy = statStartY + i * statH;

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, x + 16, sy + 8);

      // Meter bar
      const barX = x + 120;
      const barW = 110;
      const barH = 8;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(barX, sy, barW, barH);

      ctx.fillStyle = s.fraction > 0.75 ? '#10b981' : s.fraction > 0.45 ? '#f59e0b' : '#38bdf8';
      ctx.fillRect(barX, sy, Math.max(2, Math.min(barW, barW * s.fraction)), barH);

      // Value text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(s.val, x + w - 16, sy + 8);
    }

    // Trade-in Financial Calculation
    const tradeInCredit = Math.floor(currentBike.price * 0.75);
    const netCost = Math.max(0, bike.price - tradeInCredit);
    const finY = y + 180;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 12, finY, w - 24, 68);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 12, finY, w - 24, 68);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STICKER PRICE:`, x + 20, finY + 18);
    ctx.fillText(`TRADE-IN (${currentBike.name}):`, x + 20, finY + 34);
    ctx.fillText(`NET COST TO UPGRADE:`, x + 20, finY + 52);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`$${bike.price.toLocaleString()}`, x + w - 20, finY + 18);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`-$${tradeInCredit.toLocaleString()}`, x + w - 20, finY + 34);

    const canAfford = career.cash >= netCost;
    ctx.fillStyle = canAfford ? '#10b981' : '#ef4444';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(`$${netCost.toLocaleString()}`, x + w - 20, finY + 52);
  }

  private renderBikeShopActionBar(
    ctx: CanvasRenderingContext2D,
    bike: any,
    currentBike: any,
    career: CareerProgress
  ): void {
    const tradeInCredit = Math.floor(currentBike.price * 0.75);
    const netCost = Math.max(0, bike.price - tradeInCredit);
    const isOwned = career.ownedBikeIds.includes(bike.id);
    const isCurrent = career.currentBikeId === bike.id;
    const canAfford = career.cash >= netCost;

    const barY = 368;
    const btnW = 200;
    const btnH = 44;

    // Action Button 1: Buy / Equip / Owned
    const bx1 = 110;
    let label = `BUY BIKE ($${netCost.toLocaleString()})`;
    let action = 'buy_bike';
    let btnColor = '#059669';
    let btnBorder = '#10b981';

    if (isCurrent) {
      label = 'CURRENT BIKE EQUIPPED';
      action = 'none';
      btnColor = '#334155';
      btnBorder = '#64748b';
    } else if (isOwned) {
      label = 'EQUIP THIS BIKE';
      action = 'equip_bike';
      btnColor = '#2563eb';
      btnBorder = '#60a5fa';
    } else if (!canAfford) {
      label = `NEED $${(netCost - career.cash).toLocaleString()} MORE`;
      action = 'none';
      btnColor = '#7f1d1d';
      btnBorder = '#f87171';
    }

    this.activeHitboxes.push({
      id: 'bike_action_btn',
      x: bx1,
      y: barY,
      w: btnW,
      h: btnH,
      action: action,
      data: { bikeId: bike.id },
    });

    ctx.fillStyle = btnColor;
    ctx.fillRect(bx1, barY, btnW, btnH);
    ctx.strokeStyle = btnBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx1, barY, btnW, btnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx1 + btnW / 2, barY + 26);

    // Action Button 2: Back to Track Select
    const bx2 = 330;
    this.activeHitboxes.push({
      id: 'bike_back_btn',
      x: bx2,
      y: barY,
      w: btnW,
      h: btnH,
      action: 'goto_track_select',
    });

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx2, barY, btnW, btnH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx2, barY, btnW, btnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText('BACK TO MENU', bx2 + btnW / 2, barY + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText('USE LEFT/RIGHT TO BROWSE BIKES • UP/DOWN TO CHANGE CLASS', 320, 430);
  }

  // ==========================================================================
  // 4. CLUBHOUSE (RIVALS & COPS) SCREEN
  // ==========================================================================

  private renderClubhouseScreen(
    ctx: CanvasRenderingContext2D,
    _state: GameState,
    _now: number
  ): void {
    // Roadhouse / Clubhouse dark wood & brick background
    ctx.fillStyle = '#120d09';
    ctx.fillRect(0, 0, 640, 448);

    // Wood panel horizontal ridges
    ctx.fillStyle = '#1a130e';
    for (let wy = 0; wy < 448; wy += 32) {
      ctx.fillRect(0, wy, 640, 2);
    }

    // Top Neon Sign Header
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText("DERBI'S BIKER CLUBHOUSE", 320, 36);

    ctx.fillStyle = '#ffaa00';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('MEET THE STREET FIGHTERS, LOCAL LEGENDS & POLICE PURSUIT', 320, 52);

    // Combine 14 rivals and 2 police officers
    const totalRivals = AI_RIVALS.length;
    const isCop = this.clubhouseRivalIndex >= totalRivals;
    const character = isCop
      ? POLICE_OFFICERS[this.clubhouseRivalIndex - totalRivals]
      : AI_RIVALS[this.clubhouseRivalIndex];

    // Left Panel: 16-Bit Pixel Portrait Card (x = 30, y = 72, w = 220, h = 300)
    this.renderClubhousePortraitCard(ctx, character, isCop, 30, 72, 220, 300);

    // Right Panel: Personality, Stats & Dialogue Card (x = 264, y = 72, w = 346, h = 300)
    this.renderClubhouseDialogueCard(ctx, character, isCop, 264, 72, 346, 300);

    // Bottom Navigation Bar
    this.renderClubhouseNavBar(ctx);
  }

  private renderClubhousePortraitCard(
    ctx: CanvasRenderingContext2D,
    char: any,
    isCop: boolean,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#1a1614';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isCop ? '#3b82f6' : '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Character Name
    ctx.fillStyle = isCop ? '#60a5fa' : '#ffd700';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(char.name.toUpperCase(), x + w / 2, y + 26);

    ctx.fillStyle = '#a8a29e';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillText(isCop ? 'CALIFORNIA HIGHWAY PATROL' : `RIVAL #${this.clubhouseRivalIndex + 1} OF 14`, x + w / 2, y + 40);

    // 16-Bit Face Portrait Graphic Box
    const px = x + 25;
    const py = y + 50;
    const pw = w - 50;
    const ph = 150;
    this.drawRivalPortrait(ctx, char.name, isCop, px, py, pw, ph);

    // Weapon Badge
    const weaponName = isCop ? 'Billy Club & Handcuffs' : char.preferredWeapon?.toUpperCase() || 'FISTS';
    ctx.fillStyle = '#292524';
    ctx.fillRect(x + 16, y + 214, w - 32, 28);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 16, y + 214, w - 32, 28);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText(`WEAPON: ${weaponName}`, x + w / 2, y + 232);

    // Bike info
    const bike = BIKES_BY_ID[char.bikeId];
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`RIDING: ${bike?.name || 'Police Cruiser'}`, x + w / 2, y + 264);
  }

  private drawRivalPortrait(
    ctx: CanvasRenderingContext2D,
    name: string,
    isCop: boolean,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Backdrop
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const cx = x + w / 2;
    const cy = y + h / 2;

    // Neck / Shoulders (Leather Jacket or Uniform)
    ctx.fillStyle = isCop ? '#1e3a8a' : '#1c1917';
    ctx.beginPath();
    ctx.moveTo(cx - 45, y + h);
    ctx.lineTo(cx - 30, cy + 20);
    ctx.lineTo(cx + 30, cy + 20);
    ctx.lineTo(cx + 45, y + h);
    ctx.closePath();
    ctx.fill();

    // Face Skin
    ctx.fillStyle = '#e2996d'; // Caucasian/Tanned skin tone
    if (name === 'Ikira' || name === 'Gino') ctx.fillStyle = '#f1b88e';
    if (name === 'P.E. No. 1' || name === 'Rude Boy') ctx.fillStyle = '#8b5a2b'; // Darker skin tone
    ctx.beginPath();
    ctx.ellipse(cx, cy - 8, 28, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair or Headwear
    if (isCop) {
      // CHP Campaign Hat / Police Cap
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 38, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 24, cy - 54, 48, 20);
      // Gold Badge on cap
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(cx - 6, cy - 46, 12, 10);
      // Aviator Sunglasses
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 22, cy - 14, 18, 14);
      ctx.fillRect(cx + 4, cy - 14, 18, 14);
    } else {
      // Biker Bandanas / Mohawk / Sunglasses
      if (name === 'Biff' || name === 'Butch') {
        // Red Bandana
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 28, cy - 44, 56, 18);
        // Sunglasses
        ctx.fillStyle = '#09090b';
        ctx.fillRect(cx - 22, cy - 14, 18, 12);
        ctx.fillRect(cx + 4, cy - 14, 18, 12);
      } else if (name === 'Spike') {
        // Tall Orange Mohawk
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(cx - 6, cy - 65, 12, 35);
      } else if (name === 'Natasha' || name === 'Tanya') {
        // Blonde / Pink Hair
        ctx.fillStyle = name === 'Natasha' ? '#f472b6' : '#fde047';
        ctx.beginPath();
        ctx.arc(cx, cy - 18, 32, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 32, cy - 18, 10, 40);
        ctx.fillRect(cx + 22, cy - 18, 10, 40);
      } else {
        // Default Sunglasses & Headband
        ctx.fillStyle = '#09090b';
        ctx.fillRect(cx - 20, cy - 14, 17, 12);
        ctx.fillRect(cx + 3, cy - 14, 17, 12);
      }
    }

    // Mouth / Smirk
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 14);
    ctx.lineTo(cx + 10, cy + 14);
    ctx.stroke();
  }

  private renderClubhouseDialogueCard(
    ctx: CanvasRenderingContext2D,
    char: any,
    isCop: boolean,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#1a1614';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isCop ? '#3b82f6' : '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Personality Badge
    const personality = isCop ? 'LAW ENFORCEMENT' : (char.personality || 'BRAWLER').toUpperCase();
    ctx.fillStyle = isCop ? '#1e3a8a' : '#7c2d12';
    ctx.fillRect(x + 16, y + 16, 140, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`STYLE: ${personality}`, x + 86, y + 31);

    // Ratings (Aggression & Skill)
    const aggression = isCop ? 0.9 : char.aggression ?? 0.6;
    const skill = isCop ? 0.8 : char.skill ?? 0.7;

    ctx.fillStyle = '#a8a29e';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('AGGRESSION:', x + 16, y + 60);
    this.renderRatingBar(ctx, aggression, x + 100, y + 52, 110, 10, '#ef4444');

    ctx.fillStyle = '#a8a29e';
    ctx.fillText('RACE SKILL:', x + 16, y + 80);
    this.renderRatingBar(ctx, skill, x + 100, y + 72, 110, 10, '#3b82f6');

    // Pre-Race Speech Bubble
    const quoteY = y + 104;
    ctx.fillStyle = '#292524';
    ctx.fillRect(x + 16, quoteY, w - 32, 88);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 16, quoteY, w - 32, 88);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText('PRE-RACE TAUNT:', x + 24, quoteY + 18);

    // Pick a quote
    let quoteText = '"You better stay out of my way, rookie!"';
    if (isCop) {
      quoteText = char.taunts?.[0] || '"Pull over to the shoulder immediately!"';
    } else if (char.quotes?.preRace?.length) {
      quoteText = `"${char.quotes.preRace[0]}"`;
    }

    ctx.fillStyle = '#f5f5f4';
    ctx.font = 'italic 10px "Courier New", monospace';
    this.wrapText(ctx, quoteText, x + 24, quoteY + 36, w - 48, 14);

    // Racing Tips / Intel
    const tipY = y + 206;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText('DERBI\'S INTEL & SCOUT REPORT:', x + 16, tipY);

    let tipText = 'Watch for sudden counter-punches when riding closely along the inside shoulder.';
    if (isCop) {
      tipText = 'High pursuit acceleration. Evade into heavy oncoming traffic or execute a sharp brake check.';
    } else if (char.personality === 'brawler') {
      tipText = 'Carries lethal knockback weapons. Stay outside his swing reach until his attack cools down.';
    } else if (char.personality === 'speedster') {
      tipText = 'Rarely attacks but holds flawless apex lines. Must draft closely and strike early.';
    }

    ctx.fillStyle = '#d6d3d1';
    ctx.font = '9px "Courier New", monospace';
    this.wrapText(ctx, tipText, x + 16, tipY + 16, w - 32, 13);
  }

  private renderRatingBar(
    ctx: CanvasRenderingContext2D,
    fraction: number,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(2, w * fraction), h);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  private renderClubhouseNavBar(ctx: CanvasRenderingContext2D): void {
    const navY = 388;
    const btnW = 160;
    const btnH = 38;

    // Prev Button
    this.activeHitboxes.push({
      id: 'clubhouse_prev',
      x: 60,
      y: navY,
      w: btnW,
      h: btnH,
      action: 'cycle_clubhouse',
      data: { delta: -1 },
    });
    ctx.fillStyle = '#292524';
    ctx.fillRect(60, navY, btnW, btnH);
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, navY, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◄ PREVIOUS RIVAL', 60 + btnW / 2, navY + 23);

    // Next Button
    this.activeHitboxes.push({
      id: 'clubhouse_next',
      x: 240,
      y: navY,
      w: btnW,
      h: btnH,
      action: 'cycle_clubhouse',
      data: { delta: 1 },
    });
    ctx.fillStyle = '#292524';
    ctx.fillRect(240, navY, btnW, btnH);
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(240, navY, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEXT RIVAL ►', 240 + btnW / 2, navY + 23);

    // Back to Menu Button
    this.activeHitboxes.push({
      id: 'clubhouse_back',
      x: 420,
      y: navY,
      w: btnW,
      h: btnH,
      action: 'goto_track_select',
    });
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(420, navY, btnW, btnH);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(420, navY, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BACK TO MENU', 420 + btnW / 2, navY + 23);
  }

  // ==========================================================================
  // 5. RACE RESULTS SCREEN
  // ==========================================================================

  private renderRaceResultsScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    now: number
  ): void {
    const active = state.activeRace;
    const track = active ? active.track : TRACKS.sierra_nevada;
    const player = active ? active.player : ({ finishPosition: 1, finishTimeMs: 145000 } as any);
    const pos = player.finishPosition || 1;
    const isQualified = pos <= 3;

    // Background
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, 640, 448);

    // Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`RACE RESULTS - ${track.name.toUpperCase()}`, 320, 32);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`CHAMPIONSHIP LEVEL ${state.career.level} • 15 RACERS FINISHED`, 320, 48);

    // Standings Table (x = 30, y = 62, w = 360, h = 300)
    this.renderStandingsTable(ctx, active, state);

    // Right Side: Player Summary & Qualification Banner
    this.renderResultsSummary(ctx, state, pos, isQualified, now);

    // Bottom Navigation Buttons
    const btnW = 180;
    const btnH = 38;

    this.activeHitboxes.push({
      id: 'results_continue',
      x: 120,
      y: 388,
      w: btnW,
      h: btnH,
      action: 'continue_from_results',
    });
    ctx.fillStyle = '#059669';
    ctx.fillRect(120, 388, btnW, btnH);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 388, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTINUE TO MENU', 120 + btnW / 2, 388 + 24);

    this.activeHitboxes.push({
      id: 'results_retry',
      x: 340,
      y: 388,
      w: btnW,
      h: btnH,
      action: 'retry_race',
    });
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(340, 388, btnW, btnH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 388, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RETRY RACE', 340 + btnW / 2, 388 + 24);
  }

  private renderStandingsTable(
    ctx: CanvasRenderingContext2D,
    active: any,
    state: GameState
  ): void {
    const tx = 30;
    const ty = 62;
    const tw = 340;
    const th = 310;

    ctx.fillStyle = '#111827';
    ctx.fillRect(tx, ty, tw, th);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx, ty, tw, th);

    // Table Header
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(tx, ty, tw, 22);
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('POS', tx + 8, ty + 15);
    ctx.fillText('RACER', tx + 40, ty + 15);
    ctx.fillText('BIKE', tx + 150, ty + 15);
    ctx.fillText('TIME', tx + 240, ty + 15);
    ctx.fillText('PRIZE', tx + 295, ty + 15);

    // Generate or read racer standings
    const racers: RacerEntity[] = active?.racers ? [...active.racers] : [];
    // Sort by finishPosition or z position
    racers.sort((a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99));

    const rowH = 19;
    const maxRows = Math.min(15, racers.length || 15);
    const prizes = active?.track.cashPrizesByLevel[state.career.level] || [1000, 750, 500];

    for (let r = 0; r < maxRows; r++) {
      const racer = racers[r];
      const ry = ty + 24 + r * rowH;
      const pos = r + 1;
      const isPlayer = racer ? racer.isPlayer : pos === 1;

      if (isPlayer) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(tx + 2, ry - 2, tw - 4, rowH);
      }

      ctx.fillStyle = isPlayer ? '#ffd700' : pos <= 3 ? '#60a5fa' : '#d1d5db';
      ctx.font = 'bold 9px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${pos}`, tx + 10, ry + 11);

      const name = racer ? racer.name.toUpperCase() : `RACER ${pos}`;
      ctx.fillText(name.slice(0, 14), tx + 40, ry + 11);

      const bike = racer ? racer.bike.name : 'Shuriken 400';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(bike.slice(0, 12), tx + 150, ry + 11);

      const timeMs = racer?.finishTimeMs || 120000 + pos * 2400;
      const timeStr = this.formatRaceTime(timeMs);
      ctx.fillText(timeStr, tx + 240, ry + 11);

      const prizeStr = pos === 1 ? `$${prizes[0]}` : pos === 2 ? `$${prizes[1]}` : pos === 3 ? `$${prizes[2]}` : '-';
      ctx.fillStyle = pos <= 3 ? '#34d399' : '#6b7280';
      ctx.fillText(prizeStr, tx + 295, ry + 11);
    }
  }

  private renderResultsSummary(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    pos: number,
    isQualified: boolean,
    now: number
  ): void {
    const rx = 385;
    const ry = 62;
    const rw = 225;
    const rh = 310;

    ctx.fillStyle = '#111827';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);

    // Player Finish Banner
    ctx.fillStyle = isQualified ? '#065f46' : '#7f1d1d';
    ctx.fillRect(rx + 10, ry + 12, rw - 20, 48);
    ctx.strokeStyle = isQualified ? '#34d399' : '#f87171';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 10, ry + 12, rw - 20, 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${pos}${this.getOrdinal(pos)} PLACE`, rx + rw / 2, ry + 34);

    ctx.fillStyle = isQualified ? '#a7f3d0' : '#fca5a5';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillText(isQualified ? '★ QUALIFIED ★' : 'DID NOT QUALIFY', rx + rw / 2, ry + 49);

    // Prize & Bankroll Update
    const prizes = state.activeRace?.track.cashPrizesByLevel[state.career.level] || [1000, 750, 500];
    const prizeWon = pos === 1 ? prizes[0] : pos === 2 ? prizes[1] : pos === 3 ? prizes[2] : 0;

    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PRIZE EARNED:  +$${prizeWon.toLocaleString()}`, rx + 16, ry + 84);
    ctx.fillText(`TOTAL BANKROLL: $${state.career.cash.toLocaleString()}`, rx + 16, ry + 102);

    // Level Progression Status
    const allQualified = TRACK_IDS.every(
      (t) => state.career.trackProgress[t]?.qualified
    );

    if (allQualified) {
      // Giant Level Up / Victory Banner
      const isFlashing = Math.floor(now / 200) % 2 === 0;
      ctx.fillStyle = isFlashing ? '#ffd700' : '#ffffff';
      ctx.fillRect(rx + 10, ry + 124, rw - 20, 50);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      if (state.career.level >= 5) {
        ctx.fillText('🏆 GRAND CHAMPION! 🏆', rx + rw / 2, ry + 146);
        ctx.fillText('PROCEED TO VICTORY', rx + rw / 2, ry + 162);
      } else {
        ctx.fillText(`LEVEL UP! ADVANCE TO`, rx + rw / 2, ry + 146);
        ctx.fillText(`CHAMPIONSHIP LEVEL ${state.career.level + 1}`, rx + rw / 2, ry + 162);
      }
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CHAMPIONSHIP PROGRESSION:', rx + rw / 2, ry + 130);

      const qualCount = TRACK_IDS.filter(
        (t) => state.career.trackProgress[t]?.qualified
      ).length;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`${qualCount} OF 5 TRACKS QUALIFIED`, rx + rw / 2, ry + 148);
    }

    // Post-Race Rival Quote
    const quoteY = ry + 190;
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(rx + 10, quoteY, rw - 20, 106);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + 10, quoteY, rw - 20, 106);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('BIFF SAYS:', rx + 16, quoteY + 16);

    const rivalQuote = isQualified
      ? '"Lucky break this time, roadkill. Next race you will eat the guardrail!"'
      : '"Too slow! Stick to tricycles or get off California asphalt!"';

    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'italic 10px "Courier New", monospace';
    this.wrapText(ctx, rivalQuote, rx + 16, quoteY + 32, rw - 32, 14);
  }

  // ==========================================================================
  // 6. WRECKED SCREEN (MECHANIC / TOW TRUCK)
  // ==========================================================================

  private renderWreckedScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    now: number
  ): void {
    const repairBill = Math.round(250 * state.career.level);
    const isBankrupt = state.career.cash < repairBill;

    // Dark roadside ditch background
    ctx.fillStyle = '#0f0806';
    ctx.fillRect(0, 0, 640, 448);

    // Tow Truck Amber Strobe Light
    const strobe = Math.floor(now / 150) % 2 === 0;
    ctx.fillStyle = strobe ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.05)';
    ctx.fillRect(0, 0, 640, 180);

    // Billowing smoke clouds
    ctx.fillStyle = '#262626';
    ctx.beginPath();
    ctx.arc(180, 200, 45, 0, Math.PI * 2);
    ctx.arc(230, 170, 55, 0, Math.PI * 2);
    ctx.arc(280, 210, 50, 0, Math.PI * 2);
    ctx.fill();

    // Totaled Mangled Bike Silhouette
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(160, 230, 120, 40);
    // Embers
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.arc(200, 235, 4, 0, Math.PI * 2);
    ctx.arc(220, 240, 3, 0, Math.PI * 2);
    ctx.fill();

    // Title Banner
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TOTALED! YOUR BIKE IS WRECKED', 320, 42);

    // Mechanic dialogue card (x = 80, y = 80, w = 480, h = 260)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(80, 80, 480, 260);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, 480, 260);

    // Grease-Monkey Mechanic Portrait
    ctx.fillStyle = '#292524';
    ctx.fillRect(100, 100, 80, 90);
    ctx.fillStyle = '#e2996d';
    ctx.beginPath();
    ctx.arc(140, 140, 24, 0, Math.PI * 2);
    ctx.fill();
    // Mechanic cap & smudge
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(116, 118, 48, 12);
    ctx.fillStyle = '#171717';
    ctx.fillRect(132, 136, 12, 6);

    // Dialogue text
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DERBI TOW & REPAIR SERVICE', 200, 116);

    ctx.fillStyle = '#e7e5e4';
    ctx.font = 'italic 11px "Courier New", monospace';
    const diag =
      '"Ouch! Look at that frame - bent into a pretzel, front forks snapped clean off! That is going to cost some serious green to hammer back into shape."';
    this.wrapText(ctx, diag, 200, 138, 340, 16);

    // Financial Breakdown
    const finY = 210;
    ctx.fillStyle = '#292524';
    ctx.fillRect(100, finY, 440, 70);
    ctx.strokeStyle = '#44403c';
    ctx.strokeRect(100, finY, 440, 70);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`PREVIOUS BANKROLL:`, 120, finY + 22);
    ctx.fillText(`TOW & REPAIR BILL:`, 120, finY + 40);
    ctx.fillText(`REMAINING BANKROLL:`, 120, finY + 58);

    ctx.textAlign = 'right';
    ctx.fillText(`$${state.career.cash.toLocaleString()}`, 520, finY + 22);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`-$${repairBill.toLocaleString()}`, 520, finY + 40);

    const remaining = Math.max(0, state.career.cash - repairBill);
    ctx.fillStyle = isBankrupt ? '#ef4444' : '#34d399';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(`$${remaining.toLocaleString()}`, 520, finY + 58);

    // Bottom Action / Bankruptcy
    if (isBankrupt) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💀 BANKRUPT! LOAN SHARK DENIED • GAME OVER 💀', 320, 372);

      this.activeHitboxes.push({
        id: 'wrecked_game_over',
        x: 220,
        y: 390,
        w: 200,
        h: 40,
        action: 'pay_repair_or_continue',
      });
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(220, 390, 200, 40);
      ctx.strokeStyle = '#f87171';
      ctx.strokeRect(220, 390, 200, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('START NEW CAREER', 320, 415);
    } else {
      this.activeHitboxes.push({
        id: 'wrecked_pay_repair',
        x: 180,
        y: 380,
        w: 280,
        h: 44,
        action: 'pay_repair_or_continue',
      });
      ctx.fillStyle = '#b45309';
      ctx.fillRect(180, 380, 280, 44);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(180, 380, 280, 44);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PAY REPAIR BILL ($${repairBill}) & CONTINUE`, 320, 407);
    }
  }

  // ==========================================================================
  // 7. BUSTED SCREEN (CHP OFFICER CITATION)
  // ==========================================================================

  private renderBustedScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    now: number
  ): void {
    const fineAmount = Math.round(350 * state.career.level);
    const isBankrupt = state.career.cash < fineAmount;

    // Dark roadside highway background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, 640, 448);

    // Flashing Red & Blue Cruiser Sirens
    const strobe = Math.floor(now / 120) % 2 === 0;
    const sirenGrad = ctx.createLinearGradient(0, 0, 640, 0);
    sirenGrad.addColorStop(0, strobe ? 'rgba(255, 0, 0, 0.35)' : 'rgba(0, 50, 255, 0.1)');
    sirenGrad.addColorStop(1, strobe ? 'rgba(0, 50, 255, 0.1)' : 'rgba(255, 0, 0, 0.35)');
    ctx.fillStyle = sirenGrad;
    ctx.fillRect(0, 0, 640, 448);

    // Title Banner
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED! CAUGHT BY HIGHWAY PATROL', 320, 42);

    // Citation dialogue card
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(80, 80, 480, 260);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, 480, 260);

    // Police Officer Portrait (Officer O'Leary)
    this.drawRivalPortrait(ctx, "Officer O'Leary", true, 100, 100, 80, 90);

    // Dialogue text
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText("OFFICER O'LEARY • CITATION NO. 8492", 200, 116);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'italic 11px "Courier New", monospace';
    const diag =
      '"License, registration, and hand over the keys! You clocked 140 in a 55 zone, reckless vehicular combat, and assault with a deadly blunt instrument. Pay the fine now or spend the night in the lockup!"';
    this.wrapText(ctx, diag, 200, 138, 340, 15);

    // Financial Breakdown
    const finY = 210;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(100, finY, 440, 70);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(100, finY, 440, 70);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`PREVIOUS BANKROLL:`, 120, finY + 22);
    ctx.fillText(`CHP CITATION & BAIL:`, 120, finY + 40);
    ctx.fillText(`REMAINING BANKROLL:`, 120, finY + 58);

    ctx.textAlign = 'right';
    ctx.fillText(`$${state.career.cash.toLocaleString()}`, 520, finY + 22);
    ctx.fillStyle = '#f87171';
    ctx.fillText(`-$${fineAmount.toLocaleString()}`, 520, finY + 40);

    const remaining = Math.max(0, state.career.cash - fineAmount);
    ctx.fillStyle = isBankrupt ? '#ef4444' : '#34d399';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(`$${remaining.toLocaleString()}`, 520, finY + 58);

    // Bottom Action / Bankruptcy
    if (isBankrupt) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 JAILED! CANNOT AFFORD BAIL • GAME OVER 🔒', 320, 372);

      this.activeHitboxes.push({
        id: 'busted_game_over',
        x: 220,
        y: 390,
        w: 200,
        h: 40,
        action: 'pay_fine_or_continue',
      });
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(220, 390, 200, 40);
      ctx.strokeStyle = '#f87171';
      ctx.strokeRect(220, 390, 200, 40);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('START NEW CAREER', 320, 415);
    } else {
      this.activeHitboxes.push({
        id: 'busted_pay_fine',
        x: 180,
        y: 380,
        w: 280,
        h: 44,
        action: 'pay_fine_or_continue',
      });
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(180, 380, 280, 44);
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(180, 380, 280, 44);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PAY FINE ($${fineAmount}) & POST BAIL`, 320, 407);
    }
  }

  // ==========================================================================
  // 8. PASSWORD ENTRY SCREEN
  // ==========================================================================

  private renderPasswordEntryScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    now: number
  ): void {
    // Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 640, 448);

    // Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAREER RESTORATION - PASSWORD ENTRY', 320, 36);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('ENTER YOUR 8-CHARACTER CODE OR RESTORE SAVED PROGRESSION', 320, 52);

    // 8-Slot Display Box
    const slotW = 44;
    const slotH = 50;
    const slotGap = 8;
    const totalSlotW = 8 * slotW + 7 * slotGap;
    const slotStartX = (640 - totalSlotW) / 2;
    const slotY = 72;

    const isCursorBlinking = Math.floor(now / 300) % 2 === 0;

    for (let s = 0; s < 8; s++) {
      const sx = slotStartX + s * (slotW + slotGap);
      const char = this.passwordBuffer[s] || '';
      const isCurrentSlot = s === this.passwordBuffer.length;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx, slotY, slotW, slotH);
      ctx.strokeStyle = isCurrentSlot ? '#ffd700' : '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, slotY, slotW, slotH);

      if (char) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(char, sx + slotW / 2, slotY + 36);
      } else if (isCurrentSlot && isCursorBlinking) {
        // Cursor bar
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx + 10, slotY + slotH - 10, slotW - 20, 4);
      }
    }

    // Validation Feedback Banner
    if (this.passwordFeedback) {
      const fb = this.passwordFeedback;
      ctx.fillStyle = fb.isError ? '#ef4444' : '#10b981';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fb.text, 320, 142);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK KEYBOARD BELOW OR TYPE ON YOUR PHYSICAL KEYBOARD', 320, 142);
    }

    // Virtual Keyboard Matrix (Base 32 alphabet: 4 rows of 8 chars)
    const keyW = 48;
    const keyH = 34;
    const keyGap = 6;
    const kbdStartX = (640 - (8 * keyW + 7 * keyGap)) / 2;
    const kbdStartY = 160;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c;
        const char = PASSWORD_ALPHABET[idx];
        const kx = kbdStartX + c * (keyW + keyGap);
        const ky = kbdStartY + r * (keyH + keyGap);

        this.activeHitboxes.push({
          id: `kbd_${char}`,
          x: kx,
          y: ky,
          w: keyW,
          h: keyH,
          action: 'password_key',
          data: { char },
        });

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(kx, ky, keyW, keyH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(kx, ky, keyW, keyH);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(char, kx + keyW / 2, ky + 22);
      }
    }

    // Keypad Function Keys: Backspace, Clear, Paste Current Password
    const fnY = kbdStartY + 4 * (keyH + keyGap);
    const fnButtons = [
      { text: '◄ BACKSPACE', action: 'password_backspace', w: 120 },
      { text: 'CLEAR', action: 'password_clear', w: 80 },
      { text: `PASTE CURRENT (${state.career.password})`, action: 'password_copy_current', w: 210 },
    ];

    let fnX = kbdStartX;
    for (const fn of fnButtons) {
      this.activeHitboxes.push({
        id: `kbd_fn_${fn.action}`,
        x: fnX,
        y: fnY,
        w: fn.w,
        h: keyH,
        action: fn.action,
      });

      ctx.fillStyle = '#334155';
      ctx.fillRect(fnX, fnY, fn.w, keyH);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(fnX, fnY, fn.w, keyH);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fn.text, fnX + fn.w / 2, fnY + 21);

      fnX += fn.w + keyGap;
    }

    // Submit / Restore & Cancel Buttons
    const subY = 380;
    const canSubmit = this.passwordBuffer.length === 8 && Boolean(this.passwordFeedback && !this.passwordFeedback.isError);

    this.activeHitboxes.push({
      id: 'pwd_submit',
      x: 160,
      y: subY,
      w: 150,
      h: 40,
      action: canSubmit ? 'submit_password' : 'none',
    });
    ctx.fillStyle = canSubmit ? '#059669' : '#334155';
    ctx.fillRect(160, subY, 150, 40);
    ctx.strokeStyle = canSubmit ? '#34d399' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(160, subY, 150, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RESTORE CAREER', 235, subY + 24);

    this.activeHitboxes.push({
      id: 'pwd_cancel',
      x: 330,
      y: subY,
      w: 150,
      h: 40,
      action: 'goto_track_select',
    });
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(330, subY, 150, 40);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(330, subY, 150, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CANCEL / BACK', 405, subY + 24);
  }

  // ==========================================================================
  // 9. VICTORY CONGRATULATIONS SCREEN
  // ==========================================================================

  private renderVictoryScreen(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    now: number
  ): void {
    // Midnight Sky with Fireworks
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, 0, 640, 448);

    // Confetti particles
    this.renderConfetti(ctx, now);

    // Header
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 ROAD RASH GRAND CHAMPION! 🏆', 320, 38);

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText('CONGRATULATIONS! YOU HAVE DOMINATED ALL 5 CALIFORNIA LEVELS', 320, 56);

    // Giant Shining Golden Trophy Cup (x = 80, y = 80, w = 180, h = 260)
    this.renderGoldenTrophy(ctx, 80, 80, 180, 260, now);

    // Career Stats Summary Card (x = 280, y = 80, w = 320, h = 260)
    this.renderVictoryStatsCard(ctx, state.career, 280, 80, 320, 260);

    // Return to Title Action Button
    this.activeHitboxes.push({
      id: 'victory_return',
      x: 200,
      y: 375,
      w: 240,
      h: 45,
      action: 'goto_title',
    });

    ctx.fillStyle = '#059669';
    ctx.fillRect(200, 375, 240, 45);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.strokeRect(200, 375, 240, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('START NEW CHAMPIONSHIP', 320, 402);
  }

  private renderGoldenTrophy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    now: number
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2 - 10;

    // Spotlight beam
    const spot = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
    spot.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
    spot.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = spot;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    // Trophy Base (Marble & Brass)
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(cx - 40, cy + 80, 80, 30);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 40, cy + 80, 80, 30);

    // Golden Cup Body
    const goldGrad = ctx.createLinearGradient(cx - 50, cy - 60, cx + 50, cy + 60);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.3, '#facc15');
    goldGrad.addColorStop(0.7, '#ca8a04');
    goldGrad.addColorStop(1, '#854d0e');

    // Stem
    ctx.fillStyle = goldGrad;
    ctx.fillRect(cx - 10, cy + 40, 20, 40);

    // Cup Bowl
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy - 50);
    ctx.lineTo(cx + 50, cy - 50);
    ctx.quadraticCurveTo(cx + 45, cy + 40, cx, cy + 40);
    ctx.quadraticCurveTo(cx - 45, cy + 40, cx - 50, cy - 50);
    ctx.closePath();
    ctx.fill();

    // Handles
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx - 50, cy - 10, 20, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 50, cy - 10, 20, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();

    // Sparkle Glints
    const sparkle = Math.sin(now * 0.01) * 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 20 + sparkle, cy - 30, 3, 0, Math.PI * 2);
    ctx.arc(cx + 25 - sparkle, cy - 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderVictoryStatsCard(
    ctx: CanvasRenderingContext2D,
    career: CareerProgress,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#111827';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HALL OF FAME CAREER LOG', x + w / 2, y + 26);

    const stats = [
      { label: 'TOTAL RACES WON:', val: `${career.totalRacesWon}` },
      { label: 'TOTAL KNOCKOUTS:', val: `${career.totalKnockouts}` },
      { label: 'TOTAL ARRESTS:', val: `${career.totalArrests}` },
      { label: 'TOTAL WRECKS:', val: `${career.totalWrecks}` },
      { label: 'FINAL BANKROLL:', val: `$${career.cash.toLocaleString()}` },
      { label: 'FINAL MOTORCYCLE:', val: `${BIKES_BY_ID[career.currentBikeId]?.name || 'Wild Thing 2000'}` },
    ];

    const startY = y + 54;
    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      const sy = startY + i * 24;

      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(s.label, x + 18, sy);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(s.val, x + w - 18, sy);
    }

    // Master Password Box
    const passY = y + 204;
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x + 16, passY, w - 32, 40);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 16, passY, w - 32, 40);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MASTER CAREER PASSWORD', x + w / 2, passY + 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(career.password, x + w / 2, passY + 31);
  }

  private renderConfetti(ctx: CanvasRenderingContext2D, now: number): void {
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 40; i++) {
      const x = ((i * 137 + now * 0.05) % 640);
      const y = ((i * 73 + now * 0.1) % 448);
      const color = colors[i % colors.length];

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 4, 8);
    }
  }

  // ==========================================================================
  // UTILITIES & TEXT HELPERS
  // ==========================================================================

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  private formatRaceTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  }

  private getOrdinal(n: number): string {
    const s = ['TH', 'ST', 'ND', 'RD'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
}
