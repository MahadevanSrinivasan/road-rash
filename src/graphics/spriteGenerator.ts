/**
 * Road Rash (1991 Sega Genesis) - Procedural 16-Bit Sprite Generator & Cache
 * Authentic pixel-art generation for racers, bikes, traffic vehicles,
 * roadside scenery obstacles, character portraits, and particle effects.
 */

import {
  BikeColorScheme,
  RivalName,
  RoadsideSpriteType,
  TrafficDirection,
  TrafficType,
} from '../types';

// ============================================================================
// 1. HEADLESS / VITEST COMPATIBLE OFFSCREEN CANVAS FACTORY
// ============================================================================

export interface MockCanvasContext {
  canvas: MockCanvas;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
  globalAlpha: number;
  globalCompositeOperation: GlobalCompositeOperation;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  imageSmoothingEnabled: boolean;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  fill(fillRule?: CanvasFillRule): void;
  stroke(): void;
  save(): void;
  restore(): void;
  scale(x: number, y: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  roundRect?(x: number, y: number, w: number, h: number, radii?: number | number[]): void;
  clip(fillRule?: CanvasFillRule): void;
  drawImage(...args: any[]): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
  createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): TextMetrics;
  setLineDash?(segments: number[]): void;
  getLineDash?(): number[];
  setTransform(...args: any[]): void;
  resetTransform(): void;
}

export interface MockCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
}

function createMockGradient(): CanvasGradient {
  return {
    addColorStop: () => {},
  } as unknown as CanvasGradient;
}

export function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const ctx: MockCanvasContext = {
    canvas: null as unknown as MockCanvas,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    shadowColor: 'rgba(0,0,0,0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    imageSmoothingEnabled: false,
    font: '10px monospace',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    ellipse: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    rect: () => {},
    roundRect: () => {},
    clip: () => {},
    drawImage: () => {},
    createLinearGradient: () => createMockGradient(),
    createRadialGradient: () => createMockGradient(),
    createPattern: () => null,
    fillText: () => {},
    strokeText: () => {},
    measureText: (text: string) => ({
      width: text.length * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 8,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
      alphabeticBaseline: 0,
      emHeightAscent: 8,
      emHeightDescent: 2,
      hangingBaseline: 6,
      ideographicBaseline: -2,
    } as unknown as TextMetrics),
    setLineDash: () => {},
    getLineDash: () => [],
    setTransform: () => {},
    resetTransform: () => {},
  };

  const canvas: MockCanvas = {
    width,
    height,
    getContext: (id: string) => (id === '2d' ? (ctx as unknown as CanvasRenderingContext2D) : null),
  };
  ctx.canvas = canvas;
  return canvas as unknown as HTMLCanvasElement;
}

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        return c;
      }
    } catch {
      // Fall through to mock
    }
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const oc = new OffscreenCanvas(width, height);
      const ctx = oc.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        return oc as unknown as HTMLCanvasElement;
      }
    } catch {
      // Fall through to mock
    }
  }

  return createMockCanvas(width, height);
}

// ============================================================================
// 2. PALETTES FOR PLAYER, RIVALS & COPS
// ============================================================================

export interface RiderPalette {
  helmetPrimary: string;
  helmetAccent: string;
  visor: string;
  jacketPrimary: string;
  jacketSecondary: string;
  pants: string;
  boots: string;
  gloves: string;
  skin: string;
}

export const PLAYER_PALETTE: RiderPalette = {
  helmetPrimary: '#c82020',
  helmetAccent: '#ffffff',
  visor: '#202030',
  jacketPrimary: '#c82020',
  jacketSecondary: '#ffffff', // Signature white racing stripe across back
  pants: '#181818',
  boots: '#111111',
  gloves: '#c82020',
  skin: '#e8b888',
};

export const COP_PALETTE: RiderPalette = {
  helmetPrimary: '#f8f8f8', // Crisp white CHP helmet
  helmetAccent: '#182848',
  visor: '#182030',
  jacketPrimary: '#142240', // CHP Navy uniform
  jacketSecondary: '#d8aa28', // Gold CHP star & shoulder badges
  pants: '#142240',
  boots: '#0c0c10',
  gloves: '#142240',
  skin: '#e0a878',
};

export const RIVAL_PALETTES: Record<RivalName, RiderPalette> = {
  Biff: {
    helmetPrimary: '#d8b020',
    helmetAccent: '#222222',
    visor: '#111111',
    jacketPrimary: '#244888', // Denim biker vest
    jacketSecondary: '#141414',
    pants: '#181818',
    boots: '#111111',
    gloves: '#111111',
    skin: '#e0a878',
  },
  Natasha: {
    helmetPrimary: '#b81868',
    helmetAccent: '#202020',
    visor: '#781858',
    jacketPrimary: '#d82888', // Magenta leathers
    jacketSecondary: '#202020',
    pants: '#202020',
    boots: '#b81868',
    gloves: '#202020',
    skin: '#f0c090',
  },
  Slater: {
    helmetPrimary: '#ffffff',
    helmetAccent: '#008888',
    visor: '#004444',
    jacketPrimary: '#00a8a8', // Teal California surf jacket
    jacketSecondary: '#1a1a1a',
    pants: '#222222',
    boots: '#111111',
    gloves: '#008888',
    skin: '#e8b888',
  },
  Ikira: {
    helmetPrimary: '#1a1a1a',
    helmetAccent: '#c01818',
    visor: '#d8aa28',
    jacketPrimary: '#c81818', // Crimson ninja jacket
    jacketSecondary: '#181818',
    pants: '#181818',
    boots: '#181818',
    gloves: '#181818',
    skin: '#e0b080',
  },
  'P.E. No. 1': {
    helmetPrimary: '#445533',
    helmetAccent: '#223318',
    visor: '#182010',
    jacketPrimary: '#3a4a2a', // Camo military olive
    jacketSecondary: '#222818',
    pants: '#2a3520',
    boots: '#181810',
    gloves: '#222818',
    skin: '#d89868',
  },
  Viper: {
    helmetPrimary: '#222822',
    helmetAccent: '#44c822',
    visor: '#112211',
    jacketPrimary: '#38a820', // Acid snake venom green
    jacketSecondary: '#181818',
    pants: '#181818',
    boots: '#181818',
    gloves: '#38a820',
    skin: '#d0a070',
  },
  Helga: {
    helmetPrimary: '#8898a8',
    helmetAccent: '#d8b030',
    visor: '#446688',
    jacketPrimary: '#667788', // Studded steel Valkyrie grey
    jacketSecondary: '#333b44',
    pants: '#333b44',
    boots: '#222830',
    gloves: '#667788',
    skin: '#f8d0b0',
  },
  'Rude Boy': {
    helmetPrimary: '#d89818',
    helmetAccent: '#188828',
    visor: '#222222',
    jacketPrimary: '#d8aa18', // Gold & reggae green leathers
    jacketSecondary: '#188828',
    pants: '#c02020',
    boots: '#181818',
    gloves: '#188828',
    skin: '#8c5028',
  },
  Gino: {
    helmetPrimary: '#c81818',
    helmetAccent: '#ffffff',
    visor: '#183868',
    jacketPrimary: '#1858a8', // Azzurri royal blue Italian leathers
    jacketSecondary: '#ffffff',
    pants: '#1858a8',
    boots: '#ffffff',
    gloves: '#c81818',
    skin: '#e8b080',
  },
  Butch: {
    helmetPrimary: '#282828',
    helmetAccent: '#d85818',
    visor: '#111111',
    jacketPrimary: '#d85818', // Heavy orange / rust jacket
    jacketSecondary: '#282828',
    pants: '#182848',
    boots: '#3a2010',
    gloves: '#282828',
    skin: '#e0a070',
  },
  Sven: {
    helmetPrimary: '#f0f0f0',
    helmetAccent: '#2888d8',
    visor: '#184878',
    jacketPrimary: '#2888d8', // Electric ice blue
    jacketSecondary: '#f0f0f0',
    pants: '#2068a8',
    boots: '#181828',
    gloves: '#2888d8',
    skin: '#fad8c0',
  },
  Tanya: {
    helmetPrimary: '#381848',
    helmetAccent: '#c82898',
    visor: '#180828',
    jacketPrimary: '#682088', // Deep violet & hot pink
    jacketSecondary: '#c82898',
    pants: '#281038',
    boots: '#682088',
    gloves: '#c82898',
    skin: '#f0b888',
  },
  Spike: {
    helmetPrimary: '#181818',
    helmetAccent: '#d82020', // Red spiked mohawk
    visor: '#111111',
    jacketPrimary: '#181818', // Heavy spiked punk black
    jacketSecondary: '#999999',
    pants: '#181818',
    boots: '#111111',
    gloves: '#181818',
    skin: '#e0a878',
  },
  Diablo: {
    helmetPrimary: '#881010',
    helmetAccent: '#d84818', // Crimson devil horns
    visor: '#180808',
    jacketPrimary: '#781010', // Fiery blood red
    jacketSecondary: '#181818',
    pants: '#181818',
    boots: '#181818',
    gloves: '#781010',
    skin: '#d08858',
  },
};

export function getRiderPalette(riderName?: string, isPlayer?: boolean, isCop?: boolean): RiderPalette {
  if (isCop) return COP_PALETTE;
  if (isPlayer) return PLAYER_PALETTE;
  if (riderName && riderName in RIVAL_PALETTES) {
    return RIVAL_PALETTES[riderName as RivalName];
  }
  return PLAYER_PALETTE;
}

// ============================================================================
// 3. RACER & BIKE SPRITE GENERATOR
// ============================================================================

export type RacerPose =
  | 'straight'
  | 'lean_left'
  | 'lean_left_hard'
  | 'lean_right'
  | 'lean_right_hard'
  | 'wheelie'
  | 'punch_left'
  | 'punch_right'
  | 'kick_left'
  | 'kick_right'
  | 'club_left'
  | 'club_right'
  | 'chain_left'
  | 'chain_right'
  | 'crowbar_left'
  | 'crowbar_right'
  | 'flying'
  | 'tumbling_0'
  | 'tumbling_1'
  | 'tumbling_2'
  | 'tumbling_3'
  | 'getting_up'
  | 'running_0'
  | 'running_1'
  | 'running_2'
  | 'running_3'
  | 'downed_bike';

export interface RacerSpriteOptions {
  colorScheme: BikeColorScheme;
  riderName?: string;
  isPlayer?: boolean;
  isCop?: boolean;
  pose: RacerPose;
  beaconPhase?: number; // 0 or 1 for police beacon alternate
  customRiderPalette?: RiderPalette;
}

function shadeColor(color: string, percent: number): string {
  // Simple hex tint/shade helper
  if (!color.startsWith('#') || color.length < 7) return color;
  const num = parseInt(color.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function renderRacerSpriteCanvas(options: RacerSpriteOptions): HTMLCanvasElement {
  const { colorScheme, riderName, isPlayer, isCop, pose, beaconPhase = 0 } = options;
  const rider = options.customRiderPalette || getRiderPalette(riderName, isPlayer, isCop);

  // Resolution: 72x72 gives crisp 16-bit Sega Genesis detail
  const width = 72;
  const height = 72;
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Handle crash & run-back states first (no attached bike or unique body geometry)
  if (pose.startsWith('tumbling_') || pose.startsWith('running_') || pose === 'flying' || pose === 'getting_up') {
    renderCrashRider(ctx, rider, pose);
    return canvas;
  }

  if (pose === 'downed_bike') {
    renderDownedBike(ctx, colorScheme, isCop);
    return canvas;
  }

  // --- Normal / Banking / Combat / Wheelie Riding Poses ---
  ctx.save();

  // Angular transformations for banking and wheelies
  let rollAngle = 0;
  let lateralShift = 0;
  let verticalShift = 0;

  if (pose === 'lean_left') {
    rollAngle = -0.16; // ~9 degrees
    lateralShift = -4;
  } else if (pose === 'lean_left_hard') {
    rollAngle = -0.32; // ~18 degrees
    lateralShift = -8;
    verticalShift = 2;
  } else if (pose === 'lean_right') {
    rollAngle = 0.16;
    lateralShift = 4;
  } else if (pose === 'lean_right_hard') {
    rollAngle = 0.32;
    lateralShift = 8;
    verticalShift = 2;
  } else if (pose === 'wheelie') {
    verticalShift = -6;
  }

  // Anchor pivot near rear wheel contact point (36, 64)
  ctx.translate(36 + lateralShift, 62 + verticalShift);
  ctx.rotate(rollAngle);
  ctx.translate(-36, -62);

  // 1. REAR TIRE & SWINGARM
  ctx.fillStyle = '#0d0d0f';
  // Rear tire outline
  ctx.fillRect(30, 48, 12, 18);
  // Inner rim / tread highlight
  ctx.fillStyle = colorScheme.wheels || '#202024';
  ctx.fillRect(32, 50, 8, 14);
  // Center rim cap
  ctx.fillStyle = '#666870';
  ctx.fillRect(34, 55, 4, 4);

  // 2. TWIN EXHAUST PIPES
  ctx.fillStyle = colorScheme.exhaust || '#a0a0a8';
  // Left pipe
  ctx.fillRect(24, 52, 5, 10);
  ctx.fillStyle = '#222226';
  ctx.fillRect(25, 60, 3, 2);
  // Right pipe
  ctx.fillStyle = colorScheme.exhaust || '#a0a0a8';
  ctx.fillRect(43, 52, 5, 10);
  ctx.fillStyle = '#222226';
  ctx.fillRect(44, 60, 3, 2);

  // 3. ENGINE CASING & SPROCKET
  ctx.fillStyle = colorScheme.engine || '#38383e';
  ctx.fillRect(26, 42, 20, 10);
  ctx.fillStyle = '#1c1c20';
  ctx.fillRect(29, 45, 14, 5);

  // 4. POLICE SADDLEBAGS & BEACONS
  if (isCop) {
    // White hard saddlebags on left and right
    ctx.fillStyle = '#e8ecf0';
    ctx.fillRect(16, 42, 10, 14);
    ctx.fillRect(46, 42, 10, 14);
    // Dark trim / latches
    ctx.fillStyle = '#142240';
    ctx.fillRect(16, 46, 10, 2);
    ctx.fillRect(46, 46, 10, 2);
    ctx.fillStyle = '#c89e24'; // Gold star badge on bags
    ctx.fillRect(20, 50, 3, 3);
    ctx.fillRect(49, 50, 3, 3);

    // Flashing Pursuit Beacons (poles mounted above saddlebags)
    ctx.fillStyle = '#555560';
    ctx.fillRect(19, 32, 3, 10);
    ctx.fillRect(50, 32, 3, 10);

    const leftBeaconRed = beaconPhase === 0;
    // Left Beacon Lamp
    ctx.fillStyle = leftBeaconRed ? '#ff1818' : '#1844cc';
    ctx.fillRect(17, 28, 7, 5);
    // Right Beacon Lamp
    ctx.fillStyle = leftBeaconRed ? '#1844cc' : '#ff1818';
    ctx.fillRect(48, 28, 7, 5);

    // Strobe glow highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(19, 29, 3, 2);
    ctx.fillRect(50, 29, 3, 2);
  }

  // 5. REAR FENDER & BODY FAIRING
  ctx.fillStyle = colorScheme.fairing || '#c82828';
  ctx.fillRect(23, 35, 26, 10);
  // Seat cushion
  ctx.fillStyle = '#18181c';
  ctx.fillRect(26, 32, 20, 5);

  // Fairing tank stripe / accent
  ctx.fillStyle = colorScheme.tank || '#ffffff';
  ctx.fillRect(25, 37, 22, 3);

  // Bright Tail-light
  ctx.fillStyle = '#ff1c1c';
  ctx.fillRect(31, 39, 10, 4);
  ctx.fillStyle = '#ffa0a0';
  ctx.fillRect(34, 40, 4, 2);

  // License Plate
  ctx.fillStyle = '#f0f0ea';
  ctx.fillRect(32, 44, 8, 4);

  // 6. RIDER LOWER BODY (Legs tucked around bike)
  ctx.fillStyle = rider.pants;
  // Left knee
  const leftKneeOffset = (pose === 'lean_left_hard') ? -4 : 0;
  const rightKneeOffset = (pose === 'lean_right_hard') ? 4 : 0;

  if (pose !== 'kick_left') {
    ctx.fillRect(19 + leftKneeOffset, 36, 7, 13);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(18 + leftKneeOffset, 48, 7, 6);
  }

  ctx.fillStyle = rider.pants;
  if (pose !== 'kick_right') {
    ctx.fillRect(46 + rightKneeOffset, 36, 7, 13);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(47 + rightKneeOffset, 48, 7, 6);
  }

  // 7. RIDER TORSO & JACKET
  ctx.fillStyle = rider.jacketPrimary;
  ctx.fillRect(24, 18, 24, 16);

  // Jacket secondary / racing stripe or badge
  ctx.fillStyle = rider.jacketSecondary;
  if (isPlayer) {
    // Road Rash Player signature white diagonal / center stripe across back
    ctx.fillRect(34, 18, 4, 16);
    ctx.fillRect(24, 25, 24, 3);
  } else if (isCop) {
    // Gold CHP star on back
    ctx.fillStyle = '#d8aa28';
    ctx.fillRect(34, 22, 4, 4);
    ctx.fillRect(32, 23, 8, 2);
  } else {
    // Rival jacket patterns
    ctx.fillRect(24, 28, 24, 3);
    ctx.fillRect(30, 20, 12, 4);
  }

  // 8. RIDER HELMET & VISOR
  ctx.fillStyle = rider.helmetPrimary;
  // Helmet dome
  ctx.fillRect(27, 6, 18, 13);
  // Visor reflection strip
  ctx.fillStyle = rider.visor;
  ctx.fillRect(29, 12, 14, 4);
  // Helmet accent / stripe
  ctx.fillStyle = rider.helmetAccent;
  ctx.fillRect(34, 6, 4, 7);

  // Special Spike Mohawk
  if (riderName === 'Spike') {
    ctx.fillStyle = '#d82020';
    ctx.fillRect(34, 1, 4, 6);
    ctx.fillRect(35, 0, 2, 2);
  }

  // 9. ARMS & HANDS / HANDLEBARS
  ctx.fillStyle = rider.jacketPrimary;

  // Handlebars base
  ctx.fillStyle = '#303038';
  ctx.fillRect(16, 26, 40, 3);

  // Left Arm & Combat actions
  if (pose === 'punch_left') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(4, 20, 21, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(0, 18, 7, 8); // Clenched fist
  } else if (pose === 'club_left') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(8, 14, 18, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(5, 12, 6, 6);
    // Wooden Billy Club
    ctx.fillStyle = '#9e6229';
    ctx.fillRect(0, 4, 7, 18);
    ctx.fillStyle = '#603c18';
    ctx.fillRect(2, 4, 3, 18);
  } else if (pose === 'chain_left') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(8, 16, 17, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(5, 14, 6, 6);
    // Steel Chain links looping left
    ctx.fillStyle = '#d0d8e0';
    ctx.fillRect(0, 10, 6, 4);
    ctx.fillRect(2, 6, 8, 4);
    ctx.fillRect(8, 2, 6, 4);
    ctx.fillRect(12, 0, 8, 4);
    ctx.fillStyle = '#788290';
    ctx.fillRect(1, 11, 4, 2);
  } else if (pose === 'crowbar_left') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(8, 15, 17, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(5, 13, 6, 6);
    // Metallic Crowbar
    ctx.fillStyle = '#6e7a8a';
    ctx.fillRect(0, 8, 6, 20);
    ctx.fillRect(0, 6, 10, 4); // Curved hook
  } else {
    // Normal left arm gripping bar
    ctx.fillRect(17, 21, 9, 7);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(15, 25, 5, 5);
  }

  // Right Arm & Combat actions
  if (pose === 'punch_right') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(47, 20, 21, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(65, 18, 7, 8); // Clenched fist
  } else if (pose === 'club_right') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(46, 14, 18, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(61, 12, 6, 6);
    // Wooden Billy Club
    ctx.fillStyle = '#9e6229';
    ctx.fillRect(65, 4, 7, 18);
    ctx.fillStyle = '#603c18';
    ctx.fillRect(67, 4, 3, 18);
  } else if (pose === 'chain_right') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(47, 16, 17, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(61, 14, 6, 6);
    // Steel Chain links looping right
    ctx.fillStyle = '#d0d8e0';
    ctx.fillRect(66, 10, 6, 4);
    ctx.fillRect(62, 6, 8, 4);
    ctx.fillRect(58, 2, 6, 4);
    ctx.fillRect(52, 0, 8, 4);
    ctx.fillStyle = '#788290';
    ctx.fillRect(67, 11, 4, 2);
  } else if (pose === 'crowbar_right') {
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(47, 15, 17, 6);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(61, 13, 6, 6);
    // Metallic Crowbar
    ctx.fillStyle = '#6e7a8a';
    ctx.fillRect(66, 8, 6, 20);
    ctx.fillRect(62, 6, 10, 4); // Curved hook
  } else {
    // Normal right arm gripping bar
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(46, 21, 9, 7);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(52, 25, 5, 5);
  }

  // 10. LEGS IN KICKING COMBAT POSES
  if (pose === 'kick_left') {
    ctx.fillStyle = rider.pants;
    ctx.fillRect(2, 38, 22, 8);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(0, 36, 7, 12); // Extended left boot heel
  }
  if (pose === 'kick_right') {
    ctx.fillStyle = rider.pants;
    ctx.fillRect(48, 38, 22, 8);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(65, 36, 7, 12); // Extended right boot heel
  }

  // 11. WHEELIE PARTICLES & SPITTING SPARKS
  if (pose === 'wheelie') {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(32, 67, 3, 3);
    ctx.fillRect(37, 68, 4, 3);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(30, 69, 3, 2);
    ctx.fillRect(41, 69, 2, 2);
  }

  ctx.restore();
  return canvas;
}

// ----------------------------------------------------------------------------
// Crash & Run-back Renderer (Ejected Rider / Tumbling / Getting up / Running)
// ----------------------------------------------------------------------------

function renderCrashRider(ctx: CanvasRenderingContext2D, rider: RiderPalette, pose: RacerPose): void {
  ctx.save();
  ctx.translate(36, 36);

  if (pose === 'flying') {
    // Airborne rider flailing horizontally / inverted
    ctx.rotate(-0.8);
    // Torso
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-12, -8, 24, 14);
    ctx.fillStyle = rider.jacketSecondary;
    ctx.fillRect(-2, -8, 4, 14);
    // Helmet
    ctx.fillStyle = rider.helmetPrimary;
    ctx.fillRect(12, -7, 12, 12);
    ctx.fillStyle = rider.visor;
    ctx.fillRect(18, -4, 5, 4);
    // Arms flailing out
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-6, -18, 6, 12);
    ctx.fillRect(0, 6, 6, 12);
    // Legs kicking
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-22, -12, 12, 6);
    ctx.fillRect(-24, 2, 14, 6);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-28, -14, 6, 7);
    ctx.fillRect(-30, 1, 7, 7);
  } else if (pose === 'tumbling_0') {
    // Tuck roll frame 0 (curled forward ball)
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = rider.helmetPrimary;
    ctx.fillRect(-8, -18, 14, 12);
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-16, -2, 12, 14);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-18, 8, 8, 8);
  } else if (pose === 'tumbling_1') {
    // Tumbling frame 1 (upside down tuck)
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-11, -9, 22, 18);
    ctx.fillStyle = rider.helmetPrimary;
    ctx.fillRect(-8, 9, 14, 12);
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-15, -14, 14, 10);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-18, -18, 8, 8);
  } else if (pose === 'tumbling_2') {
    // Tumbling frame 2 (horizontal skid on back)
    ctx.rotate(Math.PI);
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-14, -6, 28, 13);
    ctx.fillStyle = rider.helmetPrimary;
    ctx.fillRect(-22, -7, 12, 12);
    ctx.fillStyle = rider.pants;
    ctx.fillRect(14, -6, 12, 10);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(24, -5, 8, 8);
  } else if (pose === 'tumbling_3') {
    // Tumbling frame 3 (sliding face down on asphalt with friction sparks)
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-12, -8, 24, 16);
    ctx.fillStyle = rider.helmetPrimary;
    ctx.fillRect(8, -7, 12, 12);
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-22, -6, 12, 12);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-26, -4, 8, 8);
    // Friction sparks
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(-18, 12, 4, 4);
    ctx.fillRect(4, 13, 3, 3);
  } else if (pose === 'getting_up') {
    // Rider on hands and knees pushing up
    ctx.translate(0, 10);
    // Torso
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-10, -14, 20, 12);
    // Helmet
    ctx.fillStyle = rider.helmetPrimary;
    ctx.fillRect(8, -18, 12, 12);
    ctx.fillStyle = rider.visor;
    ctx.fillRect(14, -15, 5, 4);
    // Arms supporting on ground
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(6, -2, 5, 12);
    ctx.fillRect(-8, -2, 5, 12);
    ctx.fillStyle = rider.gloves;
    ctx.fillRect(5, 8, 7, 4);
    ctx.fillRect(-9, 8, 7, 4);
    // Legs bent under
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-20, -10, 12, 14);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-22, 2, 8, 8);
  } else if (pose.startsWith('running_')) {
    // 4-frame on-foot sprint cycle back to bike
    const frame = parseInt(pose.split('_')[1], 10) || 0;
    renderRunnerFrame(ctx, rider, frame);
  }

  ctx.restore();
}

function renderRunnerFrame(ctx: CanvasRenderingContext2D, rider: RiderPalette, frame: number): void {
  // Head / Helmet
  ctx.fillStyle = rider.helmetPrimary;
  ctx.fillRect(-6, -28, 12, 12);
  ctx.fillStyle = rider.visor;
  ctx.fillRect(-1, -25, 6, 4);

  // Torso / Jacket
  ctx.fillStyle = rider.jacketPrimary;
  ctx.fillRect(-7, -16, 14, 16);
  ctx.fillStyle = rider.jacketSecondary;
  ctx.fillRect(-2, -16, 4, 16);

  // Leg & Arm stride positions based on running frame (0, 1, 2, 3)
  ctx.fillStyle = rider.pants;
  ctx.fillStyle = rider.boots;

  if (frame === 0) {
    // Left leg forward, right leg back
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-14, 0, 10, 12);
    ctx.fillRect(4, 0, 10, 10);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-17, 10, 9, 6);
    ctx.fillRect(9, 7, 8, 6);

    // Left arm back, right arm forward
    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(7, -14, 10, 5);
    ctx.fillRect(-14, -12, 9, 5);
  } else if (frame === 1) {
    // Midpoint pass
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-6, 0, 6, 14);
    ctx.fillRect(1, 0, 6, 12);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-8, 12, 8, 6);
    ctx.fillRect(0, 10, 8, 6);

    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-6, -14, 4, 11);
    ctx.fillRect(3, -14, 4, 11);
  } else if (frame === 2) {
    // Right leg forward, left leg back
    ctx.fillStyle = rider.pants;
    ctx.fillRect(3, 0, 11, 12);
    ctx.fillRect(-13, 0, 10, 10);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(8, 10, 9, 6);
    ctx.fillRect(-17, 7, 8, 6);

    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-14, -14, 10, 5);
    ctx.fillRect(6, -12, 9, 5);
  } else {
    // Frame 3: Extended push-off
    ctx.fillStyle = rider.pants;
    ctx.fillRect(-3, 0, 6, 14);
    ctx.fillRect(4, -4, 9, 10);
    ctx.fillStyle = rider.boots;
    ctx.fillRect(-4, 13, 8, 5);
    ctx.fillRect(10, 2, 7, 6);

    ctx.fillStyle = rider.jacketPrimary;
    ctx.fillRect(-9, -15, 6, 8);
    ctx.fillRect(5, -13, 6, 8);
  }
}

function renderDownedBike(ctx: CanvasRenderingContext2D, colorScheme: BikeColorScheme, isCop?: boolean): void {
  // Motorcycle lying on asphalt on its side
  ctx.save();
  ctx.translate(36, 44);
  ctx.rotate(-0.35); // Angled flat on road

  // Wheels sideways
  ctx.fillStyle = '#0f0f12';
  ctx.fillRect(-28, 4, 18, 10);
  ctx.fillRect(14, 4, 18, 10);
  ctx.fillStyle = colorScheme.wheels || '#303038';
  ctx.fillRect(-25, 6, 12, 6);
  ctx.fillRect(17, 6, 12, 6);

  // Main chassis & engine
  ctx.fillStyle = colorScheme.engine || '#38383e';
  ctx.fillRect(-14, 2, 28, 12);

  // Fairing & Tank
  ctx.fillStyle = colorScheme.fairing || '#c82828';
  ctx.fillRect(-18, -8, 36, 12);
  ctx.fillStyle = colorScheme.tank || '#ffffff';
  ctx.fillRect(-12, -6, 24, 4);

  // Handlebars twisted on road
  ctx.fillStyle = '#222226';
  ctx.fillRect(16, -14, 4, 10);
  ctx.fillRect(12, -14, 12, 3);

  // Exhaust pipe scratched
  ctx.fillStyle = colorScheme.exhaust || '#a0a0a8';
  ctx.fillRect(-24, 12, 32, 5);

  if (isCop) {
    // Crushed saddlebag & flashing lens
    ctx.fillStyle = '#e8ecf0';
    ctx.fillRect(-18, -2, 12, 9);
    ctx.fillStyle = '#ff1818';
    ctx.fillRect(-20, -4, 5, 4);
  }

  // Asphalt scratch sparks / dust puff
  ctx.fillStyle = '#808088';
  ctx.fillRect(-32, 14, 8, 4);
  ctx.fillRect(-34, 10, 6, 4);

  ctx.restore();
}

// ============================================================================
// 4. FRONT-VIEW BIKE SPRITE (FOR REAR-VIEW MIRROR)
// ============================================================================

export function renderFrontBikeSpriteCanvas(options: RacerSpriteOptions): HTMLCanvasElement {
  const { colorScheme, riderName, isPlayer, isCop, beaconPhase = 0 } = options;
  const rider = options.customRiderPalette || getRiderPalette(riderName, isPlayer, isCop);

  const width = 48;
  const height = 48;
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(24, 24);

  // Front wheel
  ctx.fillStyle = '#101014';
  ctx.fillRect(-4, 8, 8, 14);
  ctx.fillStyle = colorScheme.wheels || '#303038';
  ctx.fillRect(-2, 10, 4, 10);

  // Forks & brake discs
  ctx.fillStyle = '#a0a0a8';
  ctx.fillRect(-6, 6, 3, 14);
  ctx.fillRect(3, 6, 3, 14);

  // Front Fairing & Windshield
  ctx.fillStyle = colorScheme.fairing || '#c82828';
  ctx.fillRect(-14, -2, 28, 12);
  ctx.fillStyle = colorScheme.windshield || '#72a0c4';
  ctx.fillRect(-9, -8, 18, 8);

  // Bright Center Headlight
  ctx.fillStyle = '#ffffb0';
  ctx.fillRect(-6, -1, 12, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, 1, 6, 3);

  // Handlebars & Mirrors
  ctx.fillStyle = '#222226';
  ctx.fillRect(-18, -6, 36, 3);
  ctx.fillRect(-19, -10, 4, 5);
  ctx.fillRect(15, -10, 4, 5);

  // Rider Chest & Helmet
  ctx.fillStyle = rider.jacketPrimary;
  ctx.fillRect(-10, -14, 20, 8);

  ctx.fillStyle = rider.helmetPrimary;
  ctx.fillRect(-7, -22, 14, 10);
  ctx.fillStyle = rider.visor;
  ctx.fillRect(-5, -18, 10, 4);

  // Cop Pursuit Flashers (Front)
  if (isCop) {
    const leftRed = beaconPhase === 0;
    ctx.fillStyle = leftRed ? '#ff1818' : '#1844cc';
    ctx.fillRect(-16, -2, 6, 6);
    ctx.fillStyle = leftRed ? '#1844cc' : '#ff1818';
    ctx.fillRect(10, -2, 6, 6);
  }

  ctx.restore();
  return canvas;
}

// ============================================================================
// 5. TRAFFIC VEHICLES SPRITE GENERATOR
// ============================================================================

export function renderTrafficSpriteCanvas(
  type: TrafficType,
  direction: TrafficDirection,
  customColor?: string
): HTMLCanvasElement {
  const width = 96;
  const height = 64;
  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const bodyColor = customColor || getDefaultTrafficColor(type);
  const darkShade = shadeColor(bodyColor, -25);
  const lightShade = shadeColor(bodyColor, 20);

  ctx.save();

  if (direction === 'same') {
    // ---------------- REAR VIEW (Red taillights, license plate, rear window) ----------------
    // Wheels on asphalt
    ctx.fillStyle = '#111115';
    ctx.fillRect(12, 46, 14, 16);
    ctx.fillRect(70, 46, 14, 16);
    ctx.fillStyle = '#303038';
    ctx.fillRect(15, 48, 8, 12);
    ctx.fillRect(73, 48, 8, 12);

    if (type === 'semi_truck') {
      // Massive tall commercial 18-wheeler trailer / cab
      ctx.fillStyle = '#808890';
      ctx.fillRect(10, 4, 76, 52);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(14, 8, 68, 44);
      // Vertical door seams
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(47, 8, 2, 44);
      // Lock bars
      ctx.fillStyle = '#d0d8e0';
      ctx.fillRect(36, 10, 3, 40);
      ctx.fillRect(57, 10, 3, 40);
      // Rear bumper & mudflaps
      ctx.fillStyle = '#222226';
      ctx.fillRect(8, 48, 80, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 52, 10, 4);
      ctx.fillRect(72, 52, 10, 4);
      // Triple tail lights
      ctx.fillStyle = '#ff1818';
      ctx.fillRect(12, 46, 12, 4);
      ctx.fillRect(72, 46, 12, 4);
    } else if (type === 'pickup') {
      // American pickup truck rear
      ctx.fillStyle = bodyColor;
      ctx.fillRect(12, 26, 72, 26);
      // Tailgate recessed panel
      ctx.fillStyle = darkShade;
      ctx.fillRect(20, 30, 56, 16);
      // Cab and rear window
      ctx.fillStyle = lightShade;
      ctx.fillRect(20, 14, 56, 14);
      ctx.fillStyle = '#1a2838'; // Dark tinted rear glass
      ctx.fillRect(24, 16, 48, 10);
      // Tail lights
      ctx.fillStyle = '#ff1c1c';
      ctx.fillRect(13, 28, 6, 14);
      ctx.fillRect(77, 28, 6, 14);
      // Chrome bumper
      ctx.fillStyle = '#c0c4cc';
      ctx.fillRect(10, 50, 76, 6);
    } else if (type === 'station_wagon') {
      // Wood-paneled classic station wagon
      ctx.fillStyle = bodyColor;
      ctx.fillRect(14, 24, 68, 26);
      // Woodgrain panel decal
      ctx.fillStyle = '#8c5024';
      ctx.fillRect(16, 30, 64, 12);
      ctx.fillStyle = '#5c3214';
      ctx.fillRect(18, 32, 60, 2);
      // High roof & big wagon rear glass
      ctx.fillStyle = darkShade;
      ctx.fillRect(20, 10, 56, 16);
      ctx.fillStyle = '#22384a';
      ctx.fillRect(24, 12, 48, 12);
      // Luggage rack
      ctx.fillStyle = '#b0b4bc';
      ctx.fillRect(22, 8, 52, 3);
      // Taillights
      ctx.fillStyle = '#ff1818';
      ctx.fillRect(15, 26, 6, 16);
      ctx.fillRect(75, 26, 6, 16);
      // Bumper
      ctx.fillStyle = '#9aa0a8';
      ctx.fillRect(12, 48, 72, 6);
    } else if (type === 'convertible') {
      // Low sleek sports convertible
      ctx.fillStyle = bodyColor;
      ctx.fillRect(12, 30, 72, 22);
      ctx.fillStyle = lightShade;
      ctx.fillRect(16, 26, 64, 6);
      // Open cockpit interior & headrests
      ctx.fillStyle = '#1c1c20';
      ctx.fillRect(22, 22, 52, 10);
      // Driver head silhouette
      ctx.fillStyle = '#e8b888';
      ctx.fillRect(32, 16, 8, 8);
      ctx.fillStyle = '#3a2010'; // Hair
      ctx.fillRect(31, 14, 10, 5);
      // Windshield frame top
      ctx.fillStyle = '#b0b8c0';
      ctx.fillRect(20, 18, 56, 3);
      // Taillights bar
      ctx.fillStyle = '#ff1818';
      ctx.fillRect(14, 34, 12, 6);
      ctx.fillRect(70, 34, 12, 6);
      // Bumper
      ctx.fillStyle = '#222228';
      ctx.fillRect(10, 50, 76, 5);
    } else if (type === 'sports_car') {
      // 90s wedge supercar (wide, low, full-width spoiler & red light bar)
      ctx.fillStyle = bodyColor;
      ctx.fillRect(8, 30, 80, 22);
      ctx.fillStyle = lightShade;
      ctx.fillRect(14, 24, 68, 8);
      // Rear spoiler
      ctx.fillStyle = bodyColor;
      ctx.fillRect(6, 18, 84, 4);
      ctx.fillRect(10, 22, 4, 8);
      ctx.fillRect(82, 22, 4, 8);
      // Rear engine louver window
      ctx.fillStyle = '#111822';
      ctx.fillRect(22, 22, 52, 8);
      // Full-width lightbar
      ctx.fillStyle = '#ff1111';
      ctx.fillRect(10, 33, 76, 5);
      ctx.fillStyle = '#ffa0a0';
      ctx.fillRect(14, 34, 20, 2);
      ctx.fillRect(62, 34, 20, 2);
      // Quad exhausts
      ctx.fillStyle = '#d0d0d8';
      ctx.fillRect(18, 48, 8, 4);
      ctx.fillRect(70, 48, 8, 4);
    } else {
      // Standard 80s 4-door family Sedan
      ctx.fillStyle = bodyColor;
      ctx.fillRect(12, 26, 72, 25);
      ctx.fillStyle = lightShade;
      ctx.fillRect(16, 22, 64, 6);
      // Roof & Rear windshield
      ctx.fillStyle = darkShade;
      ctx.fillRect(22, 12, 52, 12);
      ctx.fillStyle = '#1c2838';
      ctx.fillRect(26, 14, 44, 10);
      // Taillights
      ctx.fillStyle = '#ff1a1a';
      ctx.fillRect(14, 30, 10, 8);
      ctx.fillRect(72, 30, 10, 8);
      ctx.fillStyle = '#ff8800'; // Amber indicators
      ctx.fillRect(14, 38, 10, 4);
      ctx.fillRect(72, 38, 10, 4);
      // Bumper
      ctx.fillStyle = '#2d2d35';
      ctx.fillRect(10, 49, 76, 6);
    }

    // License plate (centered on rear bumper)
    ctx.fillStyle = '#f6f6ee';
    ctx.fillRect(40, 42, 16, 8);
    ctx.fillStyle = '#103080';
    ctx.fillRect(43, 44, 10, 4);

  } else {
    // ---------------- ONCOMING VIEW (Bright headlights, grille, windshield) ----------------
    // Front tires
    ctx.fillStyle = '#111115';
    ctx.fillRect(12, 46, 14, 16);
    ctx.fillRect(70, 46, 14, 16);
    ctx.fillStyle = '#303038';
    ctx.fillRect(15, 48, 8, 12);
    ctx.fillRect(73, 48, 8, 12);

    if (type === 'semi_truck') {
      // Massive chrome front grill & tall cab
      ctx.fillStyle = '#9098a0';
      ctx.fillRect(12, 6, 72, 48);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(16, 10, 64, 42);
      // Front Windshield
      ctx.fillStyle = '#1a2434';
      ctx.fillRect(22, 12, 52, 14);
      // Chrome Grille with vertical slats
      ctx.fillStyle = '#dce2e8';
      ctx.fillRect(26, 28, 44, 22);
      ctx.fillStyle = '#40444c';
      for (let x = 28; x <= 66; x += 4) {
        ctx.fillRect(x, 29, 2, 20);
      }
      // Rooftop Amber clearance lights
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(24, 7, 5, 3);
      ctx.fillRect(36, 7, 5, 3);
      ctx.fillRect(46, 7, 5, 3);
      ctx.fillRect(56, 7, 5, 3);
      ctx.fillRect(68, 7, 5, 3);
      // Chrome Bumper
      ctx.fillStyle = '#e4e8ee';
      ctx.fillRect(8, 48, 80, 8);
      // Headlights
      ctx.fillStyle = '#ffffd0';
      ctx.fillRect(13, 40, 10, 8);
      ctx.fillRect(73, 40, 10, 8);
    } else if (type === 'pickup') {
      ctx.fillStyle = bodyColor;
      ctx.fillRect(12, 24, 72, 28);
      // Cab & Front windshield
      ctx.fillStyle = lightShade;
      ctx.fillRect(20, 12, 56, 14);
      ctx.fillStyle = '#203248';
      ctx.fillRect(24, 14, 48, 11);
      // Big Front Chrome Grille
      ctx.fillStyle = '#d0d4dc';
      ctx.fillRect(26, 28, 44, 18);
      ctx.fillStyle = '#222228';
      ctx.fillRect(28, 30, 40, 14);
      // Bumper
      ctx.fillStyle = '#c0c6ce';
      ctx.fillRect(10, 48, 76, 7);
      // Headlights
      ctx.fillStyle = '#ffffe0';
      ctx.fillRect(14, 30, 10, 10);
      ctx.fillRect(72, 30, 10, 10);
    } else if (type === 'sports_car') {
      ctx.fillStyle = bodyColor;
      ctx.fillRect(8, 32, 80, 20);
      ctx.fillStyle = lightShade;
      ctx.fillRect(14, 24, 68, 10);
      // Low windshield
      ctx.fillStyle = '#1c2838';
      ctx.fillRect(22, 18, 52, 10);
      // Popup headlight recesses
      ctx.fillStyle = darkShade;
      ctx.fillRect(18, 28, 14, 6);
      ctx.fillRect(64, 28, 14, 6);
      // Headlight glow
      ctx.fillStyle = '#ffffc8';
      ctx.fillRect(19, 30, 12, 4);
      ctx.fillRect(65, 30, 12, 4);
      // Low front splitter
      ctx.fillStyle = '#141418';
      ctx.fillRect(6, 49, 84, 5);
    } else {
      // Sedan / Wagon / Convertible Front
      ctx.fillStyle = bodyColor;
      ctx.fillRect(12, 26, 72, 25);
      ctx.fillStyle = lightShade;
      ctx.fillRect(16, 22, 64, 6);
      // Windshield
      ctx.fillStyle = darkShade;
      ctx.fillRect(22, 12, 52, 12);
      ctx.fillStyle = '#22344a';
      ctx.fillRect(26, 14, 44, 10);
      // Radiator Grille
      ctx.fillStyle = '#2d2d35';
      ctx.fillRect(30, 32, 36, 12);
      ctx.fillStyle = '#777785';
      ctx.fillRect(32, 34, 32, 8);
      // Front Bumper
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(10, 48, 76, 7);
      // Glowing Headlights
      ctx.fillStyle = '#ffffe4';
      ctx.fillRect(14, 30, 12, 10);
      ctx.fillRect(70, 30, 12, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 33, 6, 4);
      ctx.fillRect(73, 33, 6, 4);
    }
  }

  ctx.restore();
  return canvas;
}

function getDefaultTrafficColor(type: TrafficType): string {
  switch (type) {
    case 'sedan':
      return '#3b668f'; // Navy blue family sedan
    case 'station_wagon':
      return '#8a623f'; // Earthy tan/wood wagon
    case 'pickup':
      return '#8f2e2e'; // Dark red pickup
    case 'convertible':
      return '#d8aa18'; // Sunny gold convertible
    case 'semi_truck':
      return '#285888'; // Deep blue cab
    case 'sports_car':
      return '#d82222'; // Cherry red supercar
    default:
      return '#555566';
  }
}

// ============================================================================
// 6. ROADSIDE SCENERY SPRITE GENERATOR
// ============================================================================

export function renderRoadsideSpriteCanvas(type: RoadsideSpriteType): HTMLCanvasElement {
  let width = 64;
  let height = 80;

  // Custom sizing per scenery element
  if (type === 'tree_pine') {
    width = 64;
    height = 120;
  } else if (type === 'tree_redwood') {
    width = 80;
    height = 160;
  } else if (type === 'tree_palm') {
    width = 64;
    height = 110;
  } else if (type === 'telephone_pole') {
    width = 44;
    height = 130;
  } else if (type === 'billboard') {
    width = 84;
    height = 72;
  } else if (type === 'rock_boulder') {
    width = 64;
    height = 48;
  } else if (type === 'cow') {
    width = 64;
    height = 46;
  } else if (type === 'guardrail') {
    width = 60;
    height = 32;
  } else if (type === 'cactus_saguaro') {
    width = 48;
    height = 90;
  } else if (type.startsWith('road_sign_')) {
    width = 40;
    height = 54;
  } else if (type === 'dirt_mound') {
    width = 64;
    height = 30;
  } else if (type === 'oil_slick') {
    width = 64;
    height = 24;
  } else if (type === 'spectator') {
    width = 34;
    height = 60;
  }

  const canvas = createOffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();

  switch (type) {
    case 'tree_pine': {
      // Evergreen Sierra Nevada pine tree
      // Trunk
      ctx.fillStyle = '#4a2c16';
      ctx.fillRect(28, 80, 8, 40);
      ctx.fillStyle = '#321c0c';
      ctx.fillRect(32, 80, 4, 40);

      // Layered conical branches (bottom to top)
      const tiers = [
        { y: 70, w: 56, h: 26, col: '#1c4224', hcol: '#2c6238' },
        { y: 50, w: 48, h: 24, col: '#1f4828', hcol: '#326c3e' },
        { y: 32, w: 38, h: 22, col: '#22502c', hcol: '#387846' },
        { y: 14, w: 26, h: 20, col: '#265a32', hcol: '#40884e' },
        { y: 0, w: 14, h: 18, col: '#2a6438', hcol: '#489858' },
      ];

      for (const t of tiers) {
        ctx.fillStyle = t.col;
        ctx.beginPath();
        ctx.moveTo(32 - t.w / 2, t.y + t.h);
        ctx.lineTo(32, t.y);
        ctx.lineTo(32 + t.w / 2, t.y + t.h);
        ctx.closePath();
        ctx.fill();

        // Left highlight
        ctx.fillStyle = t.hcol;
        ctx.beginPath();
        ctx.moveTo(32 - t.w / 2, t.y + t.h);
        ctx.lineTo(32, t.y);
        ctx.lineTo(32, t.y + t.h);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'tree_redwood': {
      // Massive ancient coastal redwood
      // Gigantic trunk
      ctx.fillStyle = '#5c2a1c';
      ctx.fillRect(26, 30, 28, 130);
      // Vertical bark fissures
      ctx.fillStyle = '#3e1b12';
      ctx.fillRect(32, 30, 4, 130);
      ctx.fillRect(44, 30, 3, 130);
      ctx.fillStyle = '#783826';
      ctx.fillRect(26, 30, 4, 130);

      // Massive canopy foliage near top
      ctx.fillStyle = '#1c3e24';
      ctx.fillRect(8, 0, 64, 45);
      ctx.fillRect(4, 10, 72, 30);
      ctx.fillStyle = '#265432';
      ctx.fillRect(14, 4, 52, 28);
      ctx.fillStyle = '#326e42';
      ctx.fillRect(20, 8, 40, 16);
      break;
    }

    case 'tree_palm': {
      // California coastal palm tree
      // Segmented curved trunk
      ctx.fillStyle = '#6e563a';
      let tx = 32;
      for (let y = 100; y >= 30; y -= 7) {
        ctx.fillRect(tx - 3, y, 7, 6);
        ctx.fillStyle = '#4c3a26';
        ctx.fillRect(tx - 3, y + 5, 7, 2);
        ctx.fillStyle = '#826848';
        ctx.fillRect(tx - 3, y, 2, 6);
        ctx.fillStyle = '#6e563a';
        tx += 0.4;
      }

      // Drooping fan fronds
      ctx.fillStyle = '#286828';
      // Left arching fronds
      ctx.beginPath();
      ctx.moveTo(tx, 30);
      ctx.quadraticCurveTo(tx - 24, 18, 4, 42);
      ctx.lineTo(tx, 30);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tx, 30);
      ctx.quadraticCurveTo(tx - 20, 6, 8, 22);
      ctx.lineTo(tx, 30);
      ctx.fill();

      // Right arching fronds
      ctx.fillStyle = '#348434';
      ctx.beginPath();
      ctx.moveTo(tx, 30);
      ctx.quadraticCurveTo(tx + 24, 18, 60, 42);
      ctx.lineTo(tx, 30);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(tx, 30);
      ctx.quadraticCurveTo(tx + 20, 6, 56, 22);
      ctx.lineTo(tx, 30);
      ctx.fill();
      break;
    }

    case 'cactus_saguaro': {
      // Ribbed desert saguaro cactus
      ctx.fillStyle = '#2d6a36';
      // Main trunk
      ctx.fillRect(20, 10, 10, 80);
      // Left arm
      ctx.fillRect(6, 32, 16, 8);
      ctx.fillRect(6, 18, 8, 20);
      // Right arm
      ctx.fillRect(28, 42, 16, 8);
      ctx.fillRect(36, 24, 8, 24);

      // Rib highlights & needles
      ctx.fillStyle = '#40884c';
      ctx.fillRect(22, 10, 2, 80);
      ctx.fillRect(7, 18, 2, 20);
      ctx.fillRect(37, 24, 2, 24);
      break;
    }

    case 'telephone_pole': {
      // Wooden utility pole
      ctx.fillStyle = '#5c4832';
      ctx.fillRect(19, 14, 6, 116);
      // Crossbeam
      ctx.fillStyle = '#483824';
      ctx.fillRect(6, 20, 32, 5);
      // Ceramic insulators
      ctx.fillStyle = '#b0c8d8';
      ctx.fillRect(8, 16, 4, 4);
      ctx.fillRect(18, 16, 4, 4);
      ctx.fillRect(28, 16, 4, 4);
      // Transformer cylinder
      ctx.fillStyle = '#6a7078';
      ctx.fillRect(25, 30, 8, 14);
      break;
    }

    case 'rock_boulder': {
      // Weathered granite mountain rock
      ctx.fillStyle = '#4e545c';
      ctx.beginPath();
      ctx.moveTo(12, 44);
      ctx.lineTo(6, 32);
      ctx.lineTo(18, 12);
      ctx.lineTo(44, 8);
      ctx.lineTo(58, 24);
      ctx.lineTo(54, 44);
      ctx.closePath();
      ctx.fill();

      // Highlight facets
      ctx.fillStyle = '#7a828e';
      ctx.beginPath();
      ctx.moveTo(18, 12);
      ctx.lineTo(44, 8);
      ctx.lineTo(36, 26);
      ctx.lineTo(16, 28);
      ctx.closePath();
      ctx.fill();

      // Shadow crevices
      ctx.fillStyle = '#282b30';
      ctx.fillRect(28, 26, 4, 18);
      ctx.fillRect(40, 32, 8, 10);
      break;
    }

    case 'cow': {
      // Roadside Holstein dairy cow
      // Legs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 30, 4, 16);
      ctx.fillRect(24, 30, 4, 16);
      ctx.fillRect(40, 30, 4, 16);
      ctx.fillRect(48, 30, 4, 16);
      ctx.fillStyle = '#111115';
      ctx.fillRect(14, 42, 4, 4);
      ctx.fillRect(24, 42, 4, 4);
      ctx.fillRect(40, 42, 4, 4);
      ctx.fillRect(48, 42, 4, 4);

      // Body
      ctx.fillStyle = '#f6f6f6';
      ctx.fillRect(10, 16, 44, 18);

      // Black cow spots
      ctx.fillStyle = '#1c1c20';
      ctx.fillRect(18, 18, 10, 10);
      ctx.fillRect(36, 20, 12, 12);
      ctx.fillRect(12, 26, 6, 6);

      // Head & Ears
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(48, 12, 14, 14);
      ctx.fillStyle = '#1c1c20';
      ctx.fillRect(52, 12, 6, 6);
      // Pink muzzle
      ctx.fillStyle = '#e8a0a8';
      ctx.fillRect(56, 18, 7, 7);
      break;
    }

    case 'billboard': {
      // Highway billboard with retro advertisement
      // Wooden support stilts
      ctx.fillStyle = '#4c3620';
      ctx.fillRect(18, 38, 6, 34);
      ctx.fillRect(60, 38, 6, 34);

      // Billboard sign frame
      ctx.fillStyle = '#1a1a20';
      ctx.fillRect(4, 4, 76, 38);
      ctx.fillStyle = '#d8aa18'; // Gold trim
      ctx.fillRect(6, 6, 72, 34);

      // Inner poster
      ctx.fillStyle = '#0f1828';
      ctx.fillRect(8, 8, 68, 30);

      // Text graphic
      ctx.fillStyle = '#ff2020';
      ctx.fillRect(14, 14, 56, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 24, 48, 4);
      break;
    }

    case 'guardrail': {
      // Highway crash barrier
      // Wooden posts
      ctx.fillStyle = '#4c3620';
      ctx.fillRect(10, 12, 6, 20);
      ctx.fillRect(44, 12, 6, 20);

      // Corrugated steel rail
      ctx.fillStyle = '#b0b8c4';
      ctx.fillRect(0, 8, 60, 12);
      ctx.fillStyle = '#7a8494';
      ctx.fillRect(0, 12, 60, 3);
      ctx.fillStyle = '#e4ecf4';
      ctx.fillRect(0, 8, 60, 2);

      // Red reflector
      ctx.fillStyle = '#ff2020';
      ctx.fillRect(12, 11, 3, 5);
      ctx.fillRect(46, 11, 3, 5);
      break;
    }

    case 'road_sign_curve_left':
    case 'road_sign_curve_right':
    case 'road_sign_steep': {
      // Yellow diamond warning signs
      // Wooden post
      ctx.fillStyle = '#5c4428';
      ctx.fillRect(18, 28, 4, 26);

      // Yellow diamond
      ctx.save();
      ctx.translate(20, 18);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#141418';
      ctx.fillRect(-14, -14, 28, 28);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(-12, -12, 24, 24);
      ctx.restore();

      // Sign symbol
      ctx.fillStyle = '#141418';
      if (type === 'road_sign_curve_left') {
        // Left sharp arrow
        ctx.fillRect(14, 14, 12, 4);
        ctx.fillRect(14, 14, 4, 10);
        ctx.fillRect(12, 16, 4, 4);
      } else if (type === 'road_sign_curve_right') {
        // Right sharp arrow
        ctx.fillRect(14, 14, 12, 4);
        ctx.fillRect(22, 14, 4, 10);
        ctx.fillRect(24, 16, 4, 4);
      } else {
        // Steep hill truck icon
        ctx.fillRect(13, 20, 14, 3);
        ctx.fillRect(16, 15, 8, 6);
      }
      break;
    }

    case 'dirt_mound': {
      // Dirt ramp on road shoulder
      ctx.fillStyle = '#6a4a28';
      ctx.beginPath();
      ctx.moveTo(4, 28);
      ctx.quadraticCurveTo(24, 8, 40, 8);
      ctx.lineTo(60, 28);
      ctx.closePath();
      ctx.fill();

      // Gravel highlights
      ctx.fillStyle = '#9c7040';
      ctx.fillRect(18, 14, 4, 3);
      ctx.fillRect(32, 11, 6, 3);
      ctx.fillRect(46, 18, 4, 3);
      break;
    }

    case 'oil_slick': {
      // Glossy rainbow oil puddle on asphalt
      ctx.fillStyle = '#181820';
      ctx.beginPath();
      ctx.ellipse(32, 12, 28, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iridescent purple/blue swirl
      ctx.fillStyle = '#4c2878';
      ctx.beginPath();
      ctx.ellipse(30, 11, 18, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#206888';
      ctx.beginPath();
      ctx.ellipse(34, 13, 10, 3, -0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'spectator': {
      // Cheering 90s roadside fan
      // Jeans
      ctx.fillStyle = '#284878';
      ctx.fillRect(12, 34, 5, 20);
      ctx.fillRect(19, 34, 5, 20);
      ctx.fillStyle = '#181818';
      ctx.fillRect(11, 52, 6, 6);
      ctx.fillRect(19, 52, 6, 6);

      // T-shirt & Torso
      ctx.fillStyle = '#d82828';
      ctx.fillRect(11, 18, 14, 18);

      // Head & Cap
      ctx.fillStyle = '#e8b888';
      ctx.fillRect(13, 8, 10, 10);
      ctx.fillStyle = '#181818';
      ctx.fillRect(12, 6, 12, 4);
      ctx.fillRect(14, 8, 12, 2); // Cap visor

      // Raised waving arm
      ctx.fillStyle = '#d82828';
      ctx.fillRect(6, 14, 5, 12);
      ctx.fillRect(23, 6, 5, 14);
      ctx.fillStyle = '#e8b888';
      ctx.fillRect(23, 2, 6, 5); // Waving hand
      break;
    }
  }

  ctx.restore();
  return canvas;
}

// ============================================================================
// 7. CHARACTER PORTRAITS (64x64 Authentic Sega Genesis Pixel Art)
// ============================================================================

export type CharacterPortraitName =
  | RivalName
  | 'cop'
  | 'mechanic'
  | 'shop_dealer'
  | 'trophy_girl';

export function renderPortraitSpriteCanvas(character: CharacterPortraitName): HTMLCanvasElement {
  const size = 64;
  const canvas = createOffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();

  // Background portrait gradient
  ctx.fillStyle = '#181822';
  ctx.fillRect(0, 0, size, size);

  // Outer Sega Genesis beveled metallic frame
  ctx.strokeStyle = '#c89e24'; // Gold rim
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);
  ctx.strokeStyle = '#383848';
  ctx.lineWidth = 1;
  ctx.strokeRect(3, 3, 58, 58);

  // Character facial rendering
  switch (character) {
    case 'Biff': {
      // Shaved head, blonde stubble, heavy furrowed brow, crooked sneer, denim vest
      renderFaceBase(ctx, '#e0a878', '#244888');
      // Shaved buzz/stubble
      ctx.fillStyle = '#c49a38';
      ctx.fillRect(22, 10, 20, 8);
      // Heavy brow & small aggressive eyes
      ctx.fillStyle = '#222222';
      ctx.fillRect(24, 25, 6, 3);
      ctx.fillRect(34, 25, 6, 3);
      // Band-aid on cheek
      ctx.fillStyle = '#f0c898';
      ctx.fillRect(38, 33, 6, 4);
      // Crooked sneer
      ctx.fillStyle = '#401818';
      ctx.fillRect(27, 40, 11, 3);
      break;
    }

    case 'Natasha': {
      // Spiky raven black hair, magenta headband, cold glare, dark lipstick
      renderFaceBase(ctx, '#f0c090', '#d82888');
      // Raven spiky hair
      ctx.fillStyle = '#141418';
      ctx.fillRect(18, 8, 28, 16);
      ctx.fillRect(14, 12, 6, 18);
      ctx.fillRect(44, 12, 6, 18);
      // Magenta headband
      ctx.fillStyle = '#d82888';
      ctx.fillRect(18, 18, 28, 4);
      // Fierce cat-eyes
      ctx.fillStyle = '#141418';
      ctx.fillRect(23, 27, 6, 3);
      ctx.fillRect(35, 27, 6, 3);
      // Dark magenta lipstick
      ctx.fillStyle = '#9c1858';
      ctx.fillRect(28, 41, 8, 3);
      break;
    }

    case 'Slater': {
      // Blonde surfer racer hair, turquoise jacket, cocky smirk
      renderFaceBase(ctx, '#e8b888', '#00a8a8');
      // Flowing blonde hair
      ctx.fillStyle = '#e5b838';
      ctx.fillRect(18, 8, 28, 15);
      ctx.fillRect(16, 16, 6, 20);
      ctx.fillRect(42, 16, 6, 20);
      // Cool eyes
      ctx.fillStyle = '#224858';
      ctx.fillRect(24, 27, 5, 3);
      ctx.fillRect(35, 27, 5, 3);
      // Smirk
      ctx.fillStyle = '#602020';
      ctx.fillRect(28, 40, 9, 3);
      ctx.fillRect(36, 39, 2, 2);
      break;
    }

    case 'Ikira': {
      // Ninja cowl/balaclava, intense focused eyes, forehead scar
      renderFaceBase(ctx, '#e0b080', '#c81818');
      // Black balaclava covering head and lower face
      ctx.fillStyle = '#18181c';
      ctx.fillRect(18, 8, 28, 16);
      ctx.fillRect(18, 34, 28, 18);
      // Crimson headband
      ctx.fillStyle = '#c81818';
      ctx.fillRect(18, 18, 28, 4);
      // Intense dark eyes
      ctx.fillStyle = '#111115';
      ctx.fillRect(23, 26, 6, 3);
      ctx.fillRect(35, 26, 6, 3);
      // Gold visor reflection line
      ctx.fillStyle = '#d8aa28';
      ctx.fillRect(24, 27, 2, 1);
      ctx.fillRect(36, 27, 2, 1);
      break;
    }

    case 'P.E. No. 1': {
      // Military buzzcut, camouflage bandana, dog tags, square jaw
      renderFaceBase(ctx, '#d89868', '#3a4a2a');
      // Buzzcut
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(21, 10, 22, 9);
      // Camo bandana
      ctx.fillStyle = '#3a4a2a';
      ctx.fillRect(18, 17, 28, 5);
      ctx.fillStyle = '#1c2414';
      ctx.fillRect(24, 18, 6, 3);
      // Square jaw & scowl
      ctx.fillStyle = '#301818';
      ctx.fillRect(26, 41, 12, 3);
      // Dog tags
      ctx.fillStyle = '#c0c8d0';
      ctx.fillRect(31, 52, 3, 5);
      break;
    }

    case 'Viper': {
      // Pale face, acid green spiky hair, venomous grin, snake neck tattoo
      renderFaceBase(ctx, '#d0a070', '#38a820');
      // Acid venom green spiky hair
      ctx.fillStyle = '#38a820';
      ctx.fillRect(18, 6, 28, 14);
      ctx.fillRect(16, 4, 6, 6);
      ctx.fillRect(42, 4, 6, 6);
      // Piercing eyes
      ctx.fillStyle = '#225511';
      ctx.fillRect(24, 26, 5, 3);
      ctx.fillRect(35, 26, 5, 3);
      // Wide villainous grin
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(26, 39, 12, 4);
      ctx.fillStyle = '#111111';
      ctx.fillRect(25, 41, 14, 1);
      break;
    }

    case 'Helga': {
      // Valkyrie blonde braids, steel collar, battle glare
      renderFaceBase(ctx, '#f8d0b0', '#667788');
      // Blonde braids
      ctx.fillStyle = '#f0c848';
      ctx.fillRect(18, 8, 28, 14);
      ctx.fillRect(14, 18, 6, 26);
      ctx.fillRect(44, 18, 6, 26);
      // Cold blue eyes
      ctx.fillStyle = '#2468a8';
      ctx.fillRect(24, 27, 5, 3);
      ctx.fillRect(35, 27, 5, 3);
      // Stern mouth
      ctx.fillStyle = '#7a2828';
      ctx.fillRect(27, 40, 10, 3);
      break;
    }

    case 'Rude Boy': {
      // Red/gold/green knit beanie, dreadlocks, cool sunglasses, wide grin
      renderFaceBase(ctx, '#8c5028', '#d8aa18');
      // Beanie stripes
      ctx.fillStyle = '#c02020';
      ctx.fillRect(18, 6, 28, 6);
      ctx.fillStyle = '#d8aa18';
      ctx.fillRect(18, 12, 28, 6);
      ctx.fillStyle = '#188828';
      ctx.fillRect(18, 18, 28, 5);
      // Dark sunglasses
      ctx.fillStyle = '#111114';
      ctx.fillRect(21, 25, 22, 6);
      // Big friendly white smile
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(26, 39, 12, 4);
      break;
    }

    case 'Gino': {
      // Neatly styled dark hair, thin mustache, confident cocky smile, blue jacket
      renderFaceBase(ctx, '#e8b080', '#1858a8');
      // Dark slick hair
      ctx.fillStyle = '#1c1c22';
      ctx.fillRect(18, 8, 28, 14);
      // Espresso eyes
      ctx.fillStyle = '#241810';
      ctx.fillRect(24, 26, 5, 3);
      ctx.fillRect(35, 26, 5, 3);
      // Thin Italian pencil mustache
      ctx.fillStyle = '#1c1c22';
      ctx.fillRect(26, 36, 12, 2);
      // Confident smile
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(27, 39, 10, 3);
      break;
    }

    case 'Butch': {
      // Heavy brown beard, scowl, burly orange jacket
      renderFaceBase(ctx, '#e0a070', '#d85818');
      // Brown hair
      ctx.fillStyle = '#3e2414';
      ctx.fillRect(18, 9, 28, 13);
      // Bushy beard covering jaw
      ctx.fillStyle = '#3e2414';
      ctx.fillRect(18, 34, 28, 16);
      ctx.fillRect(22, 48, 20, 4);
      // Fierce eyes under brow
      ctx.fillStyle = '#18100c';
      ctx.fillRect(24, 26, 5, 3);
      ctx.fillRect(35, 26, 5, 3);
      break;
    }

    case 'Sven': {
      // Slicked blonde hair, ice blue eyes, cold focused expression
      renderFaceBase(ctx, '#fad8c0', '#2888d8');
      // Slick blonde hair
      ctx.fillStyle = '#f2d468';
      ctx.fillRect(19, 8, 26, 13);
      // Ice blue eyes
      ctx.fillStyle = '#1888d8';
      ctx.fillRect(24, 26, 5, 3);
      ctx.fillRect(35, 26, 5, 3);
      // Firm thin line mouth
      ctx.fillStyle = '#8a4040';
      ctx.fillRect(28, 40, 8, 2);
      break;
    }

    case 'Tanya': {
      // Purple asymmetrical hair, hoop earring, smirking femme fatale
      renderFaceBase(ctx, '#f0b888', '#682088');
      // Purple asymmetrical hair
      ctx.fillStyle = '#682088';
      ctx.fillRect(16, 7, 30, 16);
      ctx.fillRect(14, 14, 8, 24);
      // Silver hoop earring
      ctx.fillStyle = '#d0d8e0';
      ctx.fillRect(44, 32, 3, 5);
      // Seductive eyes
      ctx.fillStyle = '#220830';
      ctx.fillRect(25, 27, 5, 3);
      ctx.fillRect(35, 27, 5, 3);
      // Hot pink lips
      ctx.fillStyle = '#c82898';
      ctx.fillRect(28, 40, 9, 3);
      break;
    }

    case 'Spike': {
      // Red mohawk, pierced eyebrow, studded punk collar, maniacal grin
      renderFaceBase(ctx, '#e0a878', '#181818');
      // Shaved sides
      ctx.fillStyle = '#222222';
      ctx.fillRect(16, 14, 8, 12);
      ctx.fillRect(40, 14, 8, 12);
      // Tall red spiked mohawk
      ctx.fillStyle = '#d82020';
      ctx.fillRect(28, 2, 8, 18);
      ctx.fillRect(29, 0, 6, 4);
      // Wild eyes
      ctx.fillStyle = '#111115';
      ctx.fillRect(23, 26, 6, 4);
      ctx.fillRect(35, 26, 6, 4);
      // Spiked choker collar
      ctx.fillStyle = '#999999';
      ctx.fillRect(24, 48, 3, 3);
      ctx.fillRect(30, 48, 3, 3);
      ctx.fillRect(36, 48, 3, 3);
      break;
    }

    case 'Diablo': {
      // Fiery bandana, demonic scar, dark goatee, blood red collar
      renderFaceBase(ctx, '#d08858', '#781010');
      // Crimson bandana
      ctx.fillStyle = '#9c1414';
      ctx.fillRect(18, 10, 28, 9);
      // Scar across right eye
      ctx.fillStyle = '#681818';
      ctx.fillRect(36, 20, 2, 14);
      // Dark goatee
      ctx.fillStyle = '#181010';
      ctx.fillRect(28, 42, 8, 7);
      break;
    }

    case 'cop': {
      // Stern California Highway Patrol officer, peaked 8-point cap, gold star, aviators
      renderFaceBase(ctx, '#e0a878', '#142240');
      // CHP Navy Blue 8-point peaked cap
      ctx.fillStyle = '#142240';
      ctx.fillRect(16, 6, 32, 12);
      // Cap visor
      ctx.fillStyle = '#08080c';
      ctx.fillRect(14, 16, 36, 4);
      // Gold CHP star badge on cap
      ctx.fillStyle = '#d8aa28';
      ctx.fillRect(29, 10, 6, 6);
      // Aviator sunglasses
      ctx.fillStyle = '#18181c';
      ctx.fillRect(20, 22, 10, 7);
      ctx.fillRect(34, 22, 10, 7);
      ctx.fillStyle = '#6a7888'; // Highway reflection highlight in lens
      ctx.fillRect(22, 24, 6, 2);
      ctx.fillRect(36, 24, 6, 2);
      // Stern square jaw scowl
      ctx.fillStyle = '#401818';
      ctx.fillRect(26, 39, 12, 3);
      break;
    }

    case 'mechanic': {
      // Grease monkey with flat cap, mustache, grease smudges on cheeks
      renderFaceBase(ctx, '#e8b888', '#404c54');
      // Grease cap
      ctx.fillStyle = '#303840';
      ctx.fillRect(18, 8, 28, 12);
      ctx.fillRect(16, 18, 32, 3);
      // Black grease smudge on cheek
      ctx.fillStyle = '#222222';
      ctx.fillRect(21, 32, 6, 4);
      // Thick gray mechanic mustache
      ctx.fillStyle = '#7a7a82';
      ctx.fillRect(24, 36, 16, 4);
      // Friendly smile
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(27, 40, 10, 3);
      break;
    }

    case 'shop_dealer': {
      // Slicked salesman with dark sunglasses, gold chain, purple blazer
      renderFaceBase(ctx, '#f0c898', '#441858');
      // Slicked black hair
      ctx.fillStyle = '#111114';
      ctx.fillRect(18, 8, 28, 12);
      // Dark shades
      ctx.fillStyle = '#1a1a20';
      ctx.fillRect(21, 23, 22, 6);
      // Gold chain necklace
      ctx.fillStyle = '#d8aa28';
      ctx.fillRect(28, 49, 8, 3);
      // Toothy car dealer grin
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(25, 38, 14, 5);
      break;
    }

    case 'trophy_girl': {
      // Blonde blowout hair, sunglasses, checkered top, bright red smile
      renderFaceBase(ctx, '#fad8c0', '#181818');
      // Big 90s blonde hair
      ctx.fillStyle = '#f5d458';
      ctx.fillRect(14, 6, 36, 16);
      ctx.fillRect(12, 16, 8, 24);
      ctx.fillRect(44, 16, 8, 24);
      // Stylish sunglasses
      ctx.fillStyle = '#181820';
      ctx.fillRect(22, 24, 9, 6);
      ctx.fillRect(33, 24, 9, 6);
      // Bright red smile
      ctx.fillStyle = '#d82020';
      ctx.fillRect(27, 39, 10, 4);
      break;
    }
  }

  ctx.restore();
  return canvas;
}

function renderFaceBase(ctx: CanvasRenderingContext2D, skinColor: string, jacketColor: string): void {
  // Shoulders / Jacket
  ctx.fillStyle = jacketColor;
  ctx.fillRect(8, 46, 48, 16);

  // Neck
  ctx.fillStyle = shadeColor(skinColor, -15);
  ctx.fillRect(26, 40, 12, 8);

  // Head oval
  ctx.fillStyle = skinColor;
  ctx.fillRect(20, 18, 24, 24);
  ctx.fillRect(22, 14, 20, 30);
  ctx.fillRect(24, 40, 16, 4); // Chin
}

// ============================================================================
// 8. PARTICLE & COMBAT EFFECTS SPRITES
// ============================================================================

export function renderNitroFlameCanvas(frame: number): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(24, 24);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(12, 4);

  // Outer blue thrust flame
  ctx.fillStyle = '#1878ff';
  const f = frame % 2;
  ctx.fillRect(-6, 0, 12, 14 + f * 4);
  ctx.fillRect(-4, 14 + f * 4, 8, 4);

  // Core bright cyan & white heat
  ctx.fillStyle = '#40e0ff';
  ctx.fillRect(-3, 0, 6, 10 + f * 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, 0, 2, 7);

  ctx.restore();
  return canvas;
}

export function renderSmokePuffCanvas(frame: number): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(28, 28);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(14, 14);

  const radius = 6 + (frame % 4) * 2;
  const alpha = Math.max(0.2, 1.0 - (frame % 4) * 0.22);
  ctx.fillStyle = `rgba(180, 185, 195, ${alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(220, 225, 235, ${alpha})`;
  ctx.beginPath();
  ctx.arc(-2, -2, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return canvas;
}

export function renderCombatSparkCanvas(type: 'spark' | 'pow'): HTMLCanvasElement {
  const canvas = createOffscreenCanvas(40, 40);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(20, 20);

  if (type === 'pow') {
    // Jagged comic-style starburst
    ctx.fillStyle = '#ff2200';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 18 : 8;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Inner yellow starburst
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 + 0.3;
      const r = i % 2 === 0 ? 12 : 5;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // High-impact yellow/white contact spark
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(-10, -2, 20, 4);
    ctx.fillRect(-2, -10, 4, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -1, 12, 2);
    ctx.fillRect(-1, -6, 2, 12);
  }

  ctx.restore();
  return canvas;
}

// ============================================================================
// 9. CENTRAL SPRITE CACHE (HIGH PERFORMANCE SINGLETON)
// ============================================================================

export class SpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();

  getRacerSprite(options: RacerSpriteOptions): HTMLCanvasElement {
    const key = `racer:${options.isPlayer ? 'player' : options.riderName || 'unknown'}:${options.isCop ? 1 : 0}:${options.pose}:${options.beaconPhase || 0}:${options.colorScheme.fairing}:${options.colorScheme.tank}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = renderRacerSpriteCanvas(options);
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  getFrontBikeSprite(options: RacerSpriteOptions): HTMLCanvasElement {
    const key = `front_bike:${options.isPlayer ? 'player' : options.riderName || 'unknown'}:${options.isCop ? 1 : 0}:${options.beaconPhase || 0}:${options.colorScheme.fairing}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = renderFrontBikeSpriteCanvas(options);
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  getTrafficSprite(type: TrafficType, direction: TrafficDirection, color?: string): HTMLCanvasElement {
    const key = `traffic:${type}:${direction}:${color || 'default'}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = renderTrafficSpriteCanvas(type, direction, color);
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  getRoadsideSprite(type: RoadsideSpriteType): HTMLCanvasElement {
    const key = `roadside:${type}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = renderRoadsideSpriteCanvas(type);
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  getPortraitSprite(character: CharacterPortraitName): HTMLCanvasElement {
    const key = `portrait:${character}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = renderPortraitSpriteCanvas(character);
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  getEffectSprite(type: 'nitro' | 'smoke' | 'spark' | 'pow', frame = 0): HTMLCanvasElement {
    const key = `effect:${type}:${frame}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      if (type === 'nitro') {
        sprite = renderNitroFlameCanvas(frame);
      } else if (type === 'smoke') {
        sprite = renderSmokePuffCanvas(frame);
      } else {
        sprite = renderCombatSparkCanvas(type);
      }
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const spriteCache = new SpriteCache();

// Convenient direct helper functions
export function getRacerSprite(options: RacerSpriteOptions): HTMLCanvasElement {
  return spriteCache.getRacerSprite(options);
}

export function getFrontBikeSprite(options: RacerSpriteOptions): HTMLCanvasElement {
  return spriteCache.getFrontBikeSprite(options);
}

export function getTrafficSprite(type: TrafficType, direction: TrafficDirection, color?: string): HTMLCanvasElement {
  return spriteCache.getTrafficSprite(type, direction, color);
}

export function getRoadsideSprite(type: RoadsideSpriteType): HTMLCanvasElement {
  return spriteCache.getRoadsideSprite(type);
}

export function getPortraitSprite(character: CharacterPortraitName): HTMLCanvasElement {
  return spriteCache.getPortraitSprite(character);
}

export function getEffectSprite(type: 'nitro' | 'smoke' | 'spark' | 'pow', frame = 0): HTMLCanvasElement {
  return spriteCache.getEffectSprite(type, frame);
}

export function getCombatSparkSprite(type: 'spark' | 'pow'): HTMLCanvasElement {
  return spriteCache.getEffectSprite(type);
}

export function getNitroFlameSprite(frame = 0): HTMLCanvasElement {
  return spriteCache.getEffectSprite('nitro', frame);
}

export function getSmokeSprite(frame = 0): HTMLCanvasElement {
  return spriteCache.getEffectSprite('smoke', frame);
}

export function clearSpriteCache(): void {
  spriteCache.clear();
}
