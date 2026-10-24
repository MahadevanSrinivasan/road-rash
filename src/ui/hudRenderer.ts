/**
 * Road Rash (1991 Sega Genesis) - Lower Dashboard HUD & Race Overlays
 * Renders the authentic 16-bit lower dashboard (y = 336..448 on 640x448 canvas):
 * - Riveted metallic bezel
 * - Dual rear-view mirrors with approaching rivals & cops
 * - Analog & digital speedometer, tachometer bar, N2O LEDs
 * - Segmented Player & Opponent stamina bars
 * - Bike condition meter
 * - Race position & distance remaining
 * - Flashing police pursuit beacon
 * Plus top-of-screen countdown, event banners, and pause overlay.
 */

import { RacerEntity, RaceSimulationState } from '../types';

export interface HudNotification {
  id: string;
  text: string;
  type: 'combat' | 'police' | 'crash' | 'info';
  durationMs: number;
  startTime: number;
}

export interface HudOptions {
  customMirrorRenderer?: (
    ctx: CanvasRenderingContext2D,
    side: 'left' | 'right',
    x: number,
    y: number,
    w: number,
    h: number
  ) => void;
  countdownValue?: number | string | null; // 3, 2, 1, 'GO!!' or null
  isPaused?: boolean;
  pauseSelectedIndex?: number;
  audioMuted?: boolean;
}

export interface HudHitbox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  action: string;
}

export class HudRenderer {
  private notifications: HudNotification[] = [];
  private notificationCounter: number = 0;

  // Cached pause hitboxes for touch/mouse interaction
  private pauseHitboxes: HudHitbox[] = [];

  constructor() {}

  /**
   * Queue a toast banner notification at the top of the race screen.
   */
  public addNotification(
    text: string,
    type: 'combat' | 'police' | 'crash' | 'info' = 'info',
    durationMs: number = 2800
  ): void {
    const now = performance?.now ? performance.now() : Date.now();
    this.notifications.push({
      id: `notif_${++this.notificationCounter}_${now}`,
      text,
      type,
      durationMs,
      startTime: now,
    });

    // Keep max 3 active notifications
    if (this.notifications.length > 3) {
      this.notifications.shift();
    }
  }

  /**
   * Clear all active notifications.
   */
  public clearNotifications(): void {
    this.notifications = [];
  }

  /**
   * Main HUD render entry point. Renders both the lower dashboard and top overlays.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    raceState: RaceSimulationState,
    options: HudOptions = {}
  ): void {
    const now = performance?.now ? performance.now() : Date.now();

    // 1. Render Dashboard Bezel & Gauges (y = 336 to 448)
    this.renderDashboard(ctx, raceState, options, now);

    // 2. Render Top-of-Screen Overlays
    this.renderTopOverlays(ctx, raceState, options, now);

    // 3. Render Pause Overlay (if paused)
    if (options.isPaused) {
      this.renderPauseMenu(ctx, options, now);
    }
  }

  // ==========================================================================
  // LOWER DASHBOARD (y = 336 .. 448)
  // ==========================================================================

  private renderDashboard(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    options: HudOptions,
    now: number
  ): void {
    const player = state.player;
    const dy = 336;
    const dw = 640;
    const dh = 112;

    ctx.save();

    // 1. Outer Dark Riveted Metallic Dashboard Base
    const gradBase = ctx.createLinearGradient(0, dy, 0, dy + dh);
    gradBase.addColorStop(0, '#2b303c');
    gradBase.addColorStop(0.08, '#1e222a');
    gradBase.addColorStop(0.5, '#14161c');
    gradBase.addColorStop(1, '#090a0d');
    ctx.fillStyle = gradBase;
    ctx.fillRect(0, dy, dw, dh);

    // Top Chrome Lip Bevel
    ctx.fillStyle = '#6a788c';
    ctx.fillRect(0, dy, dw, 2);
    ctx.fillStyle = '#39414e';
    ctx.fillRect(0, dy + 2, dw, 1);
    ctx.fillStyle = '#101216';
    ctx.fillRect(0, dy + 3, dw, 1);

    // Rivets along the top metallic edge
    const rivetPositions = [8, 128, 256, 384, 512, 632];
    for (const rx of rivetPositions) {
      this.drawRivet(ctx, rx, dy + 6);
      this.drawRivet(ctx, rx, dy + dh - 6);
    }

    // 2. Dual Rear-View Mirrors (Left & Right)
    // Left Mirror: x = 14, y = 348, w = 110, h = 68
    this.renderMirror(ctx, state, options, 'left', 14, 348, 110, 68, now);
    // Right Mirror: x = 516, y = 348, w = 110, h = 68
    this.renderMirror(ctx, state, options, 'right', 516, 348, 110, 68, now);

    // 3. Center Instrument Cluster Panel (x = 132 to 508, y = 342 to 442)
    this.renderCenterCluster(ctx, state, player, 132, 342, 376, 100, now);

    ctx.restore();
  }

  // ==========================================================================
  // REAR-VIEW MIRRORS
  // ==========================================================================

  private renderMirror(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    options: HudOptions,
    side: 'left' | 'right',
    x: number,
    y: number,
    w: number,
    h: number,
    now: number
  ): void {
    ctx.save();

    // Outer Chrome Mirror Bezel
    const bezelGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    bezelGrad.addColorStop(0, '#8c9ba8');
    bezelGrad.addColorStop(0.2, '#ffffff');
    bezelGrad.addColorStop(0.5, '#4a5460');
    bezelGrad.addColorStop(0.85, '#22272e');
    bezelGrad.addColorStop(1, '#7a8896');

    ctx.fillStyle = bezelGrad;
    ctx.beginPath();
    ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 8);
    ctx.fill();

    // Inner Bevel Shadow
    ctx.fillStyle = '#08090b';
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 6);
    ctx.fill();

    // Clip to mirror glass interior
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.clip();

    // Check custom mirror renderer callback
    if (options.customMirrorRenderer) {
      options.customMirrorRenderer(ctx, side, x, y, w, h);
    } else {
      // Default Retro Rear-View Mirror Rendering
      this.renderDefaultMirrorView(ctx, state, side, x, y, w, h, now);
    }

    // Mirror Glass Sheen / Glare lines
    const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    sheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)');
    sheen.addColorStop(0.6, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h);

    // Label on lower corner
    ctx.fillStyle = 'rgba(200, 210, 225, 0.6)';
    ctx.font = 'bold 8px "Courier New", monospace';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.fillText(
      side === 'left' ? '◄ REAR L' : 'REAR R ►',
      side === 'left' ? x + 4 : x + w - 4,
      y + h - 4
    );

    ctx.restore();
  }

  private renderDefaultMirrorView(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    side: 'left' | 'right',
    x: number,
    y: number,
    w: number,
    h: number,
    now: number
  ): void {
    const horizonY = y + 26;

    // Rear Sky
    const skyGrad = ctx.createLinearGradient(x, y, x, horizonY);
    skyGrad.addColorStop(0, '#2d3b48');
    skyGrad.addColorStop(1, '#566878');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(x, y, w, 26);

    // Rear Ground / Asphalt Road
    const groundGrad = ctx.createLinearGradient(x, horizonY, x, y + h);
    groundGrad.addColorStop(0, '#1c221a');
    groundGrad.addColorStop(1, '#2c352a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(x, horizonY, w, h - 26);

    // Perspective Asphalt Trapezoid
    ctx.fillStyle = '#1e2025';
    ctx.beginPath();
    const topRoadW = 20;
    const botRoadW = w * 0.9;
    const roadCenterX = x + w / 2;
    ctx.moveTo(roadCenterX - topRoadW / 2, horizonY);
    ctx.lineTo(roadCenterX + topRoadW / 2, horizonY);
    ctx.lineTo(roadCenterX + botRoadW / 2, y + h);
    ctx.lineTo(roadCenterX - botRoadW / 2, y + h);
    ctx.closePath();
    ctx.fill();

    // Center Dashed Line in mirror
    ctx.strokeStyle = '#c4a632';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(roadCenterX, horizonY);
    ctx.lineTo(roadCenterX, y + h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Find Racers & Police behind player
    const player = state.player;
    const behindRacers = state.racers.filter(
      (r) => !r.isPlayer && r.z < player.z && player.z - r.z <= 2500
    );

    // Filter by side
    const filtered = behindRacers.filter((r) => {
      const relX = r.x - player.x;
      return side === 'left' ? relX <= 0.15 : relX > -0.15;
    });

    // Sort furthest to closest
    filtered.sort((a, b) => a.z - b.z);

    for (const rival of filtered) {
      const dist = Math.max(50, player.z - rival.z);
      const t = 1 - dist / 2500; // 0 = far, 1 = right behind
      const scale = 0.25 + t * 0.75;

      const lateralOffset = (rival.x - player.x) * (w * 0.35);
      const rx = roadCenterX + lateralOffset;
      const ry = horizonY + t * (h - 32);

      const bikeW = Math.max(8, 28 * scale);
      const bikeH = Math.max(8, 24 * scale);

      // Approaching Motorcycle Silhouette
      ctx.fillStyle = '#0f1013';
      ctx.fillRect(rx - bikeW / 2, ry - bikeH, bikeW, bikeH);

      // Rider Helmet & Torso
      ctx.fillStyle = rival.bike?.colorScheme?.fairing || '#c83232';
      ctx.fillRect(rx - bikeW * 0.35, ry - bikeH * 0.85, bikeW * 0.7, bikeH * 0.4);

      // Headlight glow
      ctx.fillStyle = '#ffffb0';
      ctx.beginPath();
      ctx.arc(rx, ry - bikeH * 0.3, Math.max(1.5, 3.5 * scale), 0, Math.PI * 2);
      ctx.fill();

      // Police Flashing Siren on Mirror Bike
      if (rival.copProfile) {
        const flashLeft = Math.floor(now / 120) % 2 === 0;
        ctx.fillStyle = flashLeft ? '#ff0033' : '#0066ff';
        ctx.fillRect(rx - 5 * scale, ry - bikeH - 4 * scale, 4 * scale, 3 * scale);
        ctx.fillStyle = flashLeft ? '#0066ff' : '#ff0033';
        ctx.fillRect(rx + 1 * scale, ry - bikeH - 4 * scale, 4 * scale, 3 * scale);
      }
    }
  }

  // ==========================================================================
  // CENTER INSTRUMENT CLUSTER
  // ==========================================================================

  private renderCenterCluster(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    player: RacerEntity,
    x: number,
    y: number,
    w: number,
    h: number,
    now: number
  ): void {
    // Recessed dark matte cluster housing
    ctx.fillStyle = '#0b0c10';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Housing border bevel
    ctx.strokeStyle = '#2d3340';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Siren Pursuit Beacon (Center mounted)
    this.renderPursuitBeacon(ctx, state, x + w / 2, y + 2, now);

    // Left Column: Analog + Digital Speedometer (MPH) & Tachometer
    this.renderSpeedometerAndTach(ctx, player, x + 8, y + 16, 110, 80);

    // Center Column: Stamina Bars (Player & Closest Rival) & Bike Condition
    this.renderStaminaAndCondition(ctx, state, player, x + 126, y + 14, 138, 80, now);

    // Right Column: Race Position, Distance Remaining, and Nitro LEDs
    this.renderPositionAndDistance(ctx, state, player, x + 270, y + 14, 98, 80, now);
  }

  // ==========================================================================
  // POLICE PURSUIT BEACON
  // ==========================================================================

  private renderPursuitBeacon(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    cx: number,
    cy: number,
    now: number
  ): void {
    const isCopPursuing = state.racers.some(
      (r) =>
        r.copProfile &&
        (r.copProfile.state === 'pursuing' ||
          r.copProfile.state === 'attacking' ||
          r.copProfile.sirenActive)
    );

    const beaconW = 76;
    const beaconH = 10;
    const bx = cx - beaconW / 2;
    const by = cy;

    // Siren housing
    ctx.fillStyle = '#161920';
    ctx.fillRect(bx, by, beaconW, beaconH);
    ctx.strokeStyle = '#363d4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, beaconW, beaconH);

    if (isCopPursuing) {
      // Strobing alternating red/blue beacon
      const strobe = Math.floor(now / 100) % 2 === 0;
      const redAlpha = strobe ? '0.95' : '0.2';
      const blueAlpha = strobe ? '0.2' : '0.95';

      // Left Red Strobe
      ctx.fillStyle = `rgba(255, 20, 20, ${redAlpha})`;
      ctx.fillRect(bx + 2, by + 1, beaconW / 2 - 3, beaconH - 2);

      // Right Blue Strobe
      ctx.fillStyle = `rgba(30, 120, 255, ${blueAlpha})`;
      ctx.fillRect(cx + 1, by + 1, beaconW / 2 - 3, beaconH - 2);

      // Beacon warning text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', cx, by + beaconH - 2);
    } else {
      // Idle dark lens
      ctx.fillStyle = '#220000';
      ctx.fillRect(bx + 2, by + 1, beaconW / 2 - 3, beaconH - 2);
      ctx.fillStyle = '#001133';
      ctx.fillRect(cx + 1, by + 1, beaconW / 2 - 3, beaconH - 2);
    }
  }

  // ==========================================================================
  // SPEEDOMETER & TACHOMETER
  // ==========================================================================

  private renderSpeedometerAndTach(
    ctx: CanvasRenderingContext2D,
    player: RacerEntity,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const speed = Math.max(0, Math.round(player.speedMph));
    const maxSpeed = Math.max(120, player.maxSpeedMph || 150);

    // 1. Analog Gauge Arc
    const dialCenterX = x + 38;
    const dialCenterY = y + 36;
    const dialRadius = 30;

    // Gauge Face
    ctx.fillStyle = '#08090c';
    ctx.beginPath();
    ctx.arc(dialCenterX, dialCenterY, dialRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#272c36';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Speed arc (from 135 deg to 405 deg)
    const startAngle = (3 * Math.PI) / 4;
    const endAngle = (9 * Math.PI) / 4;
    const speedFraction = Math.min(1, speed / maxSpeed);
    const needleAngle = startAngle + speedFraction * (endAngle - startAngle);

    // Color gradient ring on speedometer dial
    ctx.beginPath();
    ctx.arc(dialCenterX, dialCenterY, dialRadius - 3, startAngle, endAngle);
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Active speed arc
    ctx.beginPath();
    ctx.arc(dialCenterX, dialCenterY, dialRadius - 3, startAngle, needleAngle);
    ctx.strokeStyle = speedFraction > 0.85 ? '#ff2b2b' : speedFraction > 0.6 ? '#f5b800' : '#00e575';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Gauge Tick Marks
    ctx.strokeStyle = '#626d80';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const angle = startAngle + (i / 6) * (endAngle - startAngle);
      const tx1 = dialCenterX + Math.cos(angle) * (dialRadius - 7);
      const ty1 = dialCenterY + Math.sin(angle) * (dialRadius - 7);
      const tx2 = dialCenterX + Math.cos(angle) * (dialRadius - 3);
      const ty2 = dialCenterY + Math.sin(angle) * (dialRadius - 3);
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
    }

    // Gauge Needle
    const nx = dialCenterX + Math.cos(needleAngle) * (dialRadius - 6);
    const ny = dialCenterY + Math.sin(needleAngle) * (dialRadius - 6);
    ctx.strokeStyle = '#ff3311';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dialCenterX, dialCenterY);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Center pivot knob
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dialCenterX, dialCenterY, 3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Large Bold Digital Speed Readout
    ctx.fillStyle = '#39ff14'; // Bright Lime 16-bit arcade LCD green
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${speed}`, x + w - 2, y + 26);

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillText('MPH', x + w - 2, y + 38);

    // 3. RPM Tachometer Bar (Green -> Yellow -> Redline)
    const rpmX = x;
    const rpmY = y + h - 12;
    const rpmW = w;
    const rpmH = 8;

    ctx.fillStyle = '#11141a';
    ctx.fillRect(rpmX, rpmY, rpmW, rpmH);

    // Calculate simulated engine RPM
    const rpmFraction = Math.min(1, (speed % 35) / 35 * 0.5 + speedFraction * 0.5);
    const segments = 12;
    const activeSegments = Math.round(rpmFraction * segments);
    const segW = (rpmW - (segments - 1) * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const segX = rpmX + i * (segW + 2);
      if (i < activeSegments) {
        if (i < 7) {
          ctx.fillStyle = '#00e575'; // Green
        } else if (i < 10) {
          ctx.fillStyle = '#ffd600'; // Yellow
        } else {
          ctx.fillStyle = '#ff1744'; // Redline
        }
      } else {
        ctx.fillStyle = '#20242e';
      }
      ctx.fillRect(segX, rpmY, segW, rpmH);
    }

    ctx.fillStyle = '#7a889b';
    ctx.font = '8px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('RPM x1000', rpmX, rpmY - 2);
  }

  // ==========================================================================
  // STAMINA & BIKE CONDITION BARS
  // ==========================================================================

  private renderStaminaAndCondition(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    player: RacerEntity,
    x: number,
    y: number,
    w: number,
    _h: number,
    now: number
  ): void {
    // 1. Player Stamina Bar
    this.renderSegmentedBar(
      ctx,
      x,
      y + 2,
      w,
      14,
      'PLAYER',
      player.stamina,
      player.maxStamina || 100,
      '#00e676',
      '#ffeb3b',
      '#ff1744'
    );

    // 2. Nearest Opponent Stamina Bar
    // Dynamically identify closest competitor
    const nearest = this.getClosestOpponent(state, player);
    const opponentName = nearest ? nearest.name.toUpperCase() : '---';
    const oppStamina = nearest ? nearest.stamina : 0;
    const oppMax = nearest ? nearest.maxStamina || 100 : 100;

    const isCopOpponent = Boolean(nearest?.copProfile);
    const nameColor = isCopOpponent ? (Math.floor(now / 150) % 2 === 0 ? '#ff3344' : '#4488ff') : '#ffd700';

    this.renderSegmentedBar(
      ctx,
      x,
      y + 24,
      w,
      14,
      opponentName,
      oppStamina,
      oppMax,
      '#00e676',
      '#ffeb3b',
      '#ff1744',
      nameColor
    );

    // 3. Bike Condition Bar (Health)
    const bikeHealth = Math.max(0, Math.round(player.bikeHealth));
    const isFlashing = bikeHealth < 25 && Math.sin(now / 120) > 0;
    const bikeBarColor = isFlashing ? '#ff0033' : bikeHealth < 40 ? '#ff9100' : '#00e575';

    this.renderSegmentedBar(
      ctx,
      x,
      y + 46,
      w,
      14,
      'BIKE',
      bikeHealth,
      100,
      bikeBarColor,
      bikeBarColor,
      bikeBarColor,
      isFlashing ? '#ff2222' : '#ffffff'
    );
  }

  private renderSegmentedBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    current: number,
    max: number,
    greenColor: string,
    yellowColor: string,
    redColor: string,
    labelColor: string = '#ffd700'
  ): void {
    const fraction = Math.max(0, Math.min(1, current / (max || 1)));

    // Label
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 8);

    // Bar dimensions
    const barX = x + 56;
    const barW = w - 56;
    const barH = h - 4;
    const barY = y;

    // Segmented meter: 10 blocks
    const segments = 10;
    const activeSegments = Math.round(fraction * segments);
    const segW = (barW - (segments - 1) * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const segX = barX + i * (segW + 2);

      if (i < activeSegments) {
        if (fraction > 0.55) {
          ctx.fillStyle = greenColor;
        } else if (fraction > 0.25) {
          ctx.fillStyle = yellowColor;
        } else {
          ctx.fillStyle = redColor;
        }
      } else {
        ctx.fillStyle = '#181b22'; // Empty block
      }

      ctx.fillRect(segX, barY, segW, barH);
      ctx.strokeStyle = '#090a0d';
      ctx.lineWidth = 1;
      ctx.strokeRect(segX, barY, segW, barH);
    }
  }

  // ==========================================================================
  // POSITION, DISTANCE & NITRO
  // ==========================================================================

  private renderPositionAndDistance(
    ctx: CanvasRenderingContext2D,
    state: RaceSimulationState,
    player: RacerEntity,
    x: number,
    y: number,
    w: number,
    _h: number,
    now: number
  ): void {
    // 1. Race Position Badge (1ST .. 15TH)
    const pos = this.calculatePlayerPosition(state, player);
    const posSuffix = this.getOrdinalSuffix(pos);
    const posStr = `${pos}${posSuffix}`;

    ctx.fillStyle = pos <= 3 ? '#ffd700' : '#e0e6ed';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(posStr, x + w, y + 16);

    ctx.fillStyle = '#8392a5';
    ctx.font = '8px "Courier New", monospace';
    ctx.fillText('POS', x + w, y + 26);

    // 2. Distance Remaining (Miles)
    const trackMiles = state.track.lengthMilesByLevel[state.level] || 5.0;
    const trackLengthWorld = state.trackLengthWorld || 10000;
    const remainingFraction = Math.max(0, 1 - player.z / trackLengthWorld);
    const remainingMiles = (remainingFraction * trackMiles).toFixed(1);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${remainingMiles} MI`, x + w, y + 44);

    // 3. Nitrous (N2O) Charge LEDs
    const n2oY = y + 54;
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('N2O', x, n2oY + 8);

    const nitroRemaining = Math.max(0, player.nitroRemaining ?? player.bike.nitroCharges);
    const maxNitro = Math.max(nitroRemaining, player.bike.nitroCharges || 0);

    const ledCount = maxNitro > 0 ? maxNitro : 3;
    const ledRadius = 4;
    const startX = x + 30;

    for (let i = 0; i < ledCount; i++) {
      const lx = startX + i * 14;
      const ly = n2oY + 5;

      ctx.beginPath();
      ctx.arc(lx, ly, ledRadius, 0, Math.PI * 2);

      if (i < nitroRemaining) {
        if (player.nitroActive && Math.sin(now / 80) > 0) {
          ctx.fillStyle = '#ffffff'; // Pulsing during active boost
        } else {
          ctx.fillStyle = '#00e5ff'; // Glowing cyan
        }
      } else {
        ctx.fillStyle = '#1c2430'; // Spent LED
      }

      ctx.fill();
      ctx.strokeStyle = '#0a0d14';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ==========================================================================
  // TOP-OF-SCREEN RACE OVERLAYS
  // ==========================================================================

  private renderTopOverlays(
    ctx: CanvasRenderingContext2D,
    _state: RaceSimulationState,
    options: HudOptions,
    now: number
  ): void {
    // 1. Starting Countdown Overlay (3... 2... 1... GO!!)
    if (options.countdownValue !== undefined && options.countdownValue !== null) {
      this.renderCountdown(ctx, options.countdownValue);
    }

    // 2. Banner Notification Toasts (Top center)
    this.renderNotifications(ctx, now);
  }

  private renderCountdown(ctx: CanvasRenderingContext2D, val: number | string): void {
    const text = String(val).toUpperCase();
    const cx = 320;
    const cy = 130;

    ctx.save();

    // Checkered Flags on both sides of countdown text
    this.drawCheckeredFlag(ctx, cx - 140, cy - 30, 40, 24);
    this.drawCheckeredFlag(ctx, cx + 100, cy - 30, 40, 24);

    // 3D Extruded Drop Shadow
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx + 4, cy + 4);

    // Outline
    ctx.strokeStyle = '#220000';
    ctx.lineWidth = 6;
    ctx.strokeText(text, cx, cy);

    // Vibrant Fire/Gold Text Fill
    const grad = ctx.createLinearGradient(0, cy - 25, 0, cy + 25);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffea00');
    grad.addColorStop(0.7, '#ff3d00');
    grad.addColorStop(1, '#b71c1c');
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, cy);

    ctx.restore();
  }

  private drawCheckeredFlag(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const rows = 3;
    const cols = 5;
    const cw = w / cols;
    const ch = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x + c * cw, y + r * ch, cw, ch);
      }
    }

    // Flag pole
    ctx.fillStyle = '#888888';
    ctx.fillRect(x - 2, y, 2, h + 14);
  }

  private renderNotifications(ctx: CanvasRenderingContext2D, now: number): void {
    // Purge expired notifications
    this.notifications = this.notifications.filter(
      (n) => now - n.startTime < n.durationMs
    );

    if (this.notifications.length === 0) return;

    let bannerY = 40;
    const cx = 320;

    for (const notif of this.notifications) {
      const elapsed = now - notif.startTime;
      const alpha = elapsed > notif.durationMs - 400 ? Math.max(0, (notif.durationMs - elapsed) / 400) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      const text = notif.text.toUpperCase();
      ctx.font = 'bold 14px "Courier New", monospace';
      const textMetrics = ctx.measureText(text);
      const bannerW = Math.max(280, textMetrics.width + 40);
      const bannerH = 26;
      const bx = cx - bannerW / 2;

      // Banner background
      ctx.fillStyle = 'rgba(10, 12, 16, 0.92)';
      ctx.fillRect(bx, bannerY, bannerW, bannerH);

      // Border and hazard accents based on type
      let borderColor = '#ffd700'; // Default gold
      if (notif.type === 'combat') borderColor = '#ff3344';
      if (notif.type === 'police') borderColor = '#00a2ff';
      if (notif.type === 'crash') borderColor = '#ff6600';

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, bannerY, bannerW, bannerH);

      // Hazard diagonal hashes on banner edges
      ctx.fillStyle = borderColor;
      ctx.fillRect(bx + 4, bannerY + 4, 6, bannerH - 8);
      ctx.fillRect(bx + bannerW - 10, bannerY + 4, 6, bannerH - 8);

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, bannerY + bannerH / 2);

      ctx.restore();
      bannerY += bannerH + 6;
    }
  }

  // ==========================================================================
  // PAUSE MENU OVERLAY
  // ==========================================================================

  private renderPauseMenu(
    ctx: CanvasRenderingContext2D,
    options: HudOptions,
    now: number
  ): void {
    ctx.save();

    // 1. Translucent dark scanline backdrop across the entire 640x448 canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, 640, 448);

    // Scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let sy = 0; sy < 448; sy += 4) {
      ctx.fillRect(0, sy, 640, 2);
    }

    // 2. Pause Window Box
    const px = 180;
    const py = 100;
    const pw = 280;
    const ph = 210;

    // Outer Chrome Border
    ctx.fillStyle = '#1a1d24';
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);

    // Inner bevel
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 4, py + 4, pw - 8, ph - 8);

    // Corner rivets
    this.drawRivet(ctx, px + 8, py + 8);
    this.drawRivet(ctx, px + pw - 8, py + 8);
    this.drawRivet(ctx, px + 8, py + ph - 8);
    this.drawRivet(ctx, px + pw - 8, py + ph - 8);

    // Flashing Header
    const isFlashing = Math.floor(now / 250) % 2 === 0;
    ctx.fillStyle = isFlashing ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('** PAUSED **', px + pw / 2, py + 38);

    // Pause Menu Options
    const audioLabel = options.audioMuted ? 'MUTE AUDIO: [ON]' : 'MUTE AUDIO: [OFF]';
    const menuItems = ['RESUME', 'RESTART RACE', 'QUIT TO MENU', audioLabel];
    const selectedIdx = options.pauseSelectedIndex ?? 0;

    this.pauseHitboxes = [];
    const itemStartY = py + 72;
    const itemHeight = 32;

    for (let i = 0; i < menuItems.length; i++) {
      const iy = itemStartY + i * itemHeight;
      const isSelected = i === selectedIdx;

      // Cache hitbox for clicks
      this.pauseHitboxes.push({
        id: `pause_item_${i}`,
        x: px + 20,
        y: iy - 14,
        w: pw - 40,
        h: itemHeight,
        action: ['resume', 'restart', 'quit', 'toggle_audio'][i],
      });

      if (isSelected) {
        // Selection highlight box
        ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
        ctx.fillRect(px + 20, iy - 14, pw - 40, itemHeight);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 20, iy - 14, pw - 40, itemHeight);

        // Selector arrow
        ctx.fillStyle = '#ff3d00';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('►', px + 40, iy + 6);
      }

      ctx.fillStyle = isSelected ? '#ffffff' : '#a0aec0';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(menuItems[i], px + 50, iy + 6);
    }

    ctx.restore();
  }

  /**
   * Return hitboxes for the active pause menu overlay (if paused).
   */
  public getPauseHitboxes(): HudHitbox[] {
    return this.pauseHitboxes;
  }

  // ==========================================================================
  // UTILITIES & HELPERS
  // ==========================================================================

  private drawRivet(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
    ctx.fillStyle = '#4c5666';
    ctx.beginPath();
    ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a6b4c9';
    ctx.beginPath();
    ctx.arc(rx - 0.7, ry - 0.7, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  private calculatePlayerPosition(
    state: RaceSimulationState,
    player: RacerEntity
  ): number {
    let aheadCount = 0;
    for (const r of state.racers) {
      if (!r.isPlayer && r.z > player.z) {
        aheadCount++;
      }
    }
    return aheadCount + 1;
  }

  private getOrdinalSuffix(n: number): string {
    const s = ['TH', 'ST', 'ND', 'RD'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  private getClosestOpponent(
    state: RaceSimulationState,
    player: RacerEntity
  ): RacerEntity | null {
    let closest: RacerEntity | null = null;
    let minDiff = Infinity;

    for (const r of state.racers) {
      if (r.isPlayer) continue;
      const diff = Math.abs(r.z - player.z);
      if (diff < minDiff) {
        minDiff = diff;
        closest = r;
      }
    }

    return closest;
  }
}
