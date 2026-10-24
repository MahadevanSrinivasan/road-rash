/**
 * Road Rash (1991 Sega Genesis) - Pseudo-3D Raster Road Renderer
 * Authentic OutRun / Road Rash dual-scanline road projection,
 * parallax background scrolling, hill elevation occlusion clipping (clipY),
 * entity painter's algorithm, combat particle bursts, and rear-view mirrors.
 */

import {
  ChampionshipLevel,
  CombatActionType,
  RacerEntity,
  RaceSimulationState,
  RoadSegment,
  RoadsideObject,
  RoadsideSpriteType,
  ScreenPoint,
  TrackPreset,
  TrafficVehicle,
  WorldPoint,
} from '../types';
import {
  getCombatSparkSprite,
  getEffectSprite,
  getFrontBikeSprite,
  getRacerSprite,
  getRoadsideSprite,
  getTrafficSprite,
  RacerPose,
} from './spriteGenerator';

// ============================================================================
// 1. CONSTANTS & GEOMETRY SETTINGS
// ============================================================================

export const SEGMENT_LENGTH = 200; // World Z length per segment
export const ROAD_WIDTH = 2000;    // World units from left shoulder to right shoulder
export const CAMERA_HEIGHT = 1000; // Eye level above road surface
export const DRAW_DISTANCE = 120;  // Visible segments ahead of camera
export const DEFAULT_VIEWPORT_WIDTH = 640;
export const DEFAULT_VIEWPORT_HEIGHT = 336; // 336px top race view, leaving 112px for bottom HUD

// ============================================================================
// 2. TRACK GENERATION (buildTrackSegments)
// ============================================================================

/**
 * Builds the array of RoadSegment objects from the track's geometryPattern,
 * interpolating smooth ease-in/ease-out curves and elevation hills,
 * and populating roadside scenery objects matching the track's biome.
 */
export function buildTrackSegments(track: TrackPreset, level: ChampionshipLevel): RoadSegment[] {
  const totalSegments = track.totalSegmentsByLevel[level] || 650;
  const segments: RoadSegment[] = [];

  // Flatten / cycle through track geometryPattern to cover totalSegments
  const pattern = track.geometryPattern;
  let patternIdx = 0;
  let patternStep = 0;
  let currentY = 0;

  for (let i = 0; i < totalSegments; i++) {
    const currentPattern = pattern[patternIdx];
    const L = Math.max(1, currentPattern.lengthInSegments);
    const t = patternStep / L; // Progress through current pattern [0, 1)

    // Smooth sinusoidal ease-in / ease-out for both curve and elevation
    const curveEase = Math.sin(t * Math.PI);
    const curve = currentPattern.curve * curveEase;

    // Elevation delta for this segment
    const hillStep = (currentPattern.hill / L) * Math.sin(t * Math.PI) * 1.5;
    const nextY = currentY + hillStep;

    // Alternating 3-segment raster bands for authentic Genesis stripes
    const isDark = Math.floor(i / 3) % 2 === 0;

    const p1: { world: WorldPoint; screen: ScreenPoint; camera: WorldPoint } = {
      world: { x: 0, y: currentY, z: i * SEGMENT_LENGTH },
      screen: { x: 0, y: 0, w: 0, scale: 0 },
      camera: { x: 0, y: 0, z: 0 },
    };

    const p2: { world: WorldPoint; screen: ScreenPoint; camera: WorldPoint } = {
      world: { x: 0, y: nextY, z: (i + 1) * SEGMENT_LENGTH },
      screen: { x: 0, y: 0, w: 0, scale: 0 },
      camera: { x: 0, y: 0, z: 0 },
    };

    // Populate roadside scenery matching the track biome
    const sprites: RoadsideObject[] = generateSegmentSprites(track.id, i, totalSegments, curve, currentPattern.hill);

    const segment: RoadSegment = {
      index: i,
      p1,
      p2,
      curve,
      elevation: hillStep,
      isDark,
      sprites,
      cars: [],
      clipY: 0,
    };

    segments.push(segment);

    currentY = nextY;
    patternStep++;
    if (patternStep >= L) {
      patternStep = 0;
      patternIdx = (patternIdx + 1) % pattern.length;
    }
  }

  return segments;
}

/**
 * Procedurally places authentic California roadside objects based on track biome.
 */
function generateSegmentSprites(
  trackId: string,
  index: number,
  _totalSegments: number,
  curve: number,
  hill: number
): RoadsideObject[] {
  const sprites: RoadsideObject[] = [];

  // 1. START / FINISH LINE SPECTATORS
  if (index >= 0 && index <= 12) {
    if (index % 3 === 0) {
      sprites.push({
        id: `spectator_left_${index}`,
        type: 'spectator',
        x: -1.35,
        z: index * SEGMENT_LENGTH,
        scale: 1.0,
        collidable: false,
        damageOnImpact: 0,
      });
      sprites.push({
        id: `spectator_right_${index}`,
        type: 'spectator',
        x: 1.35,
        z: index * SEGMENT_LENGTH,
        scale: 1.0,
        collidable: false,
        damageOnImpact: 0,
      });
    }
    return sprites;
  }

  // 2. CURVE & HILL WARNING SIGNS
  if (Math.abs(curve) > 2.0 && index % 14 === 0) {
    const isRightCurve = curve > 0;
    sprites.push({
      id: `sign_curve_${index}`,
      type: isRightCurve ? 'road_sign_curve_right' : 'road_sign_curve_left',
      x: isRightCurve ? 1.35 : -1.35,
      z: index * SEGMENT_LENGTH,
      scale: 1.1,
      collidable: true,
      damageOnImpact: 20,
    });
  } else if (Math.abs(hill) > 25 && index % 20 === 0) {
    sprites.push({
      id: `sign_steep_${index}`,
      type: 'road_sign_steep',
      x: 1.4,
      z: index * SEGMENT_LENGTH,
      scale: 1.1,
      collidable: true,
      damageOnImpact: 20,
    });
  }

  // 3. GUARDRAILS ON HARD CURVES
  if (Math.abs(curve) > 2.5 && index % 2 === 0) {
    sprites.push({
      id: `guardrail_${index}`,
      type: 'guardrail',
      x: curve > 0 ? -1.2 : 1.2,
      z: index * SEGMENT_LENGTH,
      scale: 1.0,
      collidable: true,
      damageOnImpact: 25,
    });
  }

  // 4. DIRT RAMPS & JUMPS (Road Rash Launchers!)
  if (index % 55 === 0 && index > 30) {
    sprites.push({
      id: `dirt_mound_${index}`,
      type: 'dirt_mound',
      x: (index % 2 === 0) ? -1.25 : 1.25,
      z: index * SEGMENT_LENGTH,
      scale: 1.2,
      collidable: true,
      damageOnImpact: 5,
      launchRampHeight: 25,
    });
  }

  // 5. OIL SLICKS ON ROAD SURFACE
  if (index % 72 === 0 && index > 40) {
    sprites.push({
      id: `oil_slick_${index}`,
      type: 'oil_slick',
      x: ((index % 3) - 1) * 0.4, // -0.4, 0.0, or +0.4
      z: index * SEGMENT_LENGTH,
      scale: 1.0,
      collidable: true,
      damageOnImpact: 10,
    });
  }

  // 6. BIOME-SPECIFIC SCENERY
  const side = (index % 2 === 0) ? -1 : 1;
  const lateralDist = side * (1.6 + ((index * 7) % 15) * 0.1); // 1.6 to 3.0

  if (index % 5 === 0) {
    switch (trackId) {
      case 'sierra_nevada': {
        // Alpine pines, granite boulders, utility poles
        const r = index % 3;
        if (r === 0) {
          sprites.push(createSceneryObj('tree_pine', index, lateralDist, 1.3, 35));
        } else if (r === 1) {
          sprites.push(createSceneryObj('rock_boulder', index, lateralDist, 1.2, 40));
        } else {
          sprites.push(createSceneryObj('telephone_pole', index, lateralDist * 0.9, 1.0, 30));
        }
        break;
      }

      case 'pacific_coast': {
        // Coastal palms, billboards, utility poles, spectators
        const r = index % 4;
        if (r === 0) {
          sprites.push(createSceneryObj('tree_palm', index, lateralDist, 1.3, 30));
        } else if (r === 1) {
          sprites.push(createSceneryObj('billboard', index, lateralDist * 1.1, 1.2, 35));
        } else if (r === 2) {
          sprites.push(createSceneryObj('telephone_pole', index, lateralDist * 0.9, 1.0, 30));
        } else {
          sprites.push({
            id: `spectator_${index}`,
            type: 'spectator',
            x: lateralDist * 0.8,
            z: index * SEGMENT_LENGTH,
            scale: 1.0,
            collidable: false,
            damageOnImpact: 0,
          });
        }
        break;
      }

      case 'redwood_forest': {
        // Towering redwoods, dense pines, boulders
        const r = index % 3;
        if (r === 0) {
          sprites.push(createSceneryObj('tree_redwood', index, lateralDist * 1.05, 1.5, 45));
        } else if (r === 1) {
          sprites.push(createSceneryObj('tree_pine', index, lateralDist, 1.2, 35));
        } else {
          sprites.push(createSceneryObj('rock_boulder', index, lateralDist, 1.1, 40));
        }
        break;
      }

      case 'palm_desert': {
        // Giant saguaro cacti, desert palms, boulders, billboards
        const r = index % 3;
        if (r === 0) {
          sprites.push(createSceneryObj('cactus_saguaro', index, lateralDist, 1.2, 30));
        } else if (r === 1) {
          sprites.push(createSceneryObj('rock_boulder', index, lateralDist, 1.2, 40));
        } else {
          sprites.push(createSceneryObj('billboard', index, lateralDist * 1.1, 1.2, 35));
        }
        break;
      }

      case 'grass_valley':
      default: {
        // Pasture cows, billboards, green pines, utility poles
        const r = index % 4;
        if (r === 0) {
          sprites.push(createSceneryObj('cow', index, lateralDist * 1.1, 1.1, 40));
        } else if (r === 1) {
          sprites.push(createSceneryObj('billboard', index, lateralDist * 1.15, 1.2, 35));
        } else if (r === 2) {
          sprites.push(createSceneryObj('tree_pine', index, lateralDist, 1.2, 35));
        } else {
          sprites.push(createSceneryObj('telephone_pole', index, lateralDist * 0.9, 1.0, 30));
        }
        break;
      }
    }
  }

  return sprites;
}

function createSceneryObj(
  type: RoadsideSpriteType,
  index: number,
  x: number,
  scale: number,
  damageOnImpact: number
): RoadsideObject {
  return {
    id: `${type}_${index}`,
    type,
    x,
    z: index * SEGMENT_LENGTH,
    scale,
    collidable: true,
    damageOnImpact,
  };
}

// ============================================================================
// 3. PERSPECTIVE PROJECTION ENGINE
// ============================================================================

function projectPoint(
  p: { world: WorldPoint; screen: ScreenPoint; camera: WorldPoint },
  worldX: number,
  worldY: number,
  worldZ: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number,
  roadWidth: number
): void {
  p.camera.x = worldX - cameraX;
  p.camera.y = worldY - cameraY;
  p.camera.z = worldZ - cameraZ;

  if (p.camera.z <= 0) {
    p.screen.scale = 0;
    p.screen.x = 0;
    p.screen.y = height;
    p.screen.w = 0;
    return;
  }

  const scale = cameraDepth / p.camera.z;
  p.screen.scale = scale;
  p.screen.x = Math.round((width / 2) + (scale * p.camera.x * width / 2));
  p.screen.y = Math.round((height / 2) - (scale * p.camera.y * height / 2));
  p.screen.w = Math.round(scale * roadWidth * width / 2);
}

// ============================================================================
// 4. PARALLAX SKY & HORIZON RENDERER
// ============================================================================

function renderParallaxBackground(
  ctx: CanvasRenderingContext2D,
  track: TrackPreset,
  horizonY: number,
  cameraCurveAccum: number,
  playerX: number,
  viewportWidth: number
): void {
  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, track.colors.skyGradientTop || '#103060');
  skyGrad.addColorStop(1, track.colors.skyGradientBottom || '#5a84b0');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewportWidth, horizonY);

  // 2. Celestial & Biome Atmosphere
  if (track.id === 'palm_desert') {
    // Blazing white/gold desert sun with corona
    ctx.fillStyle = '#fffae0';
    ctx.beginPath();
    ctx.arc(viewportWidth * 0.72, horizonY * 0.35, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 230, 150, 0.35)';
    ctx.beginPath();
    ctx.arc(viewportWidth * 0.72, horizonY * 0.35, 42, 0, Math.PI * 2);
    ctx.fill();
  } else if (track.id === 'pacific_coast') {
    // Pacific Ocean horizon line below sky
    ctx.fillStyle = '#1c4870';
    ctx.fillRect(0, horizonY - 18, viewportWidth, 18);
    // Coastal Sun
    ctx.fillStyle = '#fff4c0';
    ctx.beginPath();
    ctx.arc(viewportWidth * 0.28, horizonY * 0.38, 20, 0, Math.PI * 2);
    ctx.fill();
    // Clouds
    renderRetroCloud(ctx, (viewportWidth * 0.45 - playerX * 20) % viewportWidth, horizonY * 0.22, 50, 12);
    renderRetroCloud(ctx, (viewportWidth * 0.85 - playerX * 30) % viewportWidth, horizonY * 0.18, 64, 14);
  } else {
    // Alpine / Pasture clouds
    renderRetroCloud(ctx, (viewportWidth * 0.25 - playerX * 20) % viewportWidth, horizonY * 0.25, 54, 14);
    renderRetroCloud(ctx, (viewportWidth * 0.75 - playerX * 25) % viewportWidth, horizonY * 0.20, 68, 16);
  }

  // 3. Parallax Layer 1: Distant Mountain Range
  const mountainScroll = ((cameraCurveAccum * 4 + playerX * 50) % viewportWidth + viewportWidth) % viewportWidth;
  ctx.fillStyle = track.colors.distantMountains || '#324866';

  for (let offset = -viewportWidth; offset <= viewportWidth; offset += viewportWidth) {
    const baseX = offset - mountainScroll;
    ctx.beginPath();
    ctx.moveTo(baseX, horizonY);
    ctx.lineTo(baseX + 40, horizonY - 45);
    ctx.lineTo(baseX + 90, horizonY - 20);
    ctx.lineTo(baseX + 150, horizonY - 60);
    ctx.lineTo(baseX + 210, horizonY - 28);
    ctx.lineTo(baseX + 280, horizonY - 72);
    ctx.lineTo(baseX + 360, horizonY - 32);
    ctx.lineTo(baseX + 430, horizonY - 55);
    ctx.lineTo(baseX + 510, horizonY - 24);
    ctx.lineTo(baseX + 580, horizonY - 62);
    ctx.lineTo(baseX + viewportWidth, horizonY);
    ctx.closePath();
    ctx.fill();
  }

  // 4. Parallax Layer 2: Rolling Mid-ground Hills
  const hillScroll = ((cameraCurveAccum * 10 + playerX * 120) % viewportWidth + viewportWidth) % viewportWidth;
  ctx.fillStyle = track.colors.hills || '#1b3d2b';

  for (let offset = -viewportWidth; offset <= viewportWidth; offset += viewportWidth) {
    const baseX = offset - hillScroll;
    ctx.beginPath();
    ctx.moveTo(baseX, horizonY);
    ctx.quadraticCurveTo(baseX + 80, horizonY - 36, baseX + 160, horizonY);
    ctx.quadraticCurveTo(baseX + 260, horizonY - 48, baseX + 360, horizonY);
    ctx.quadraticCurveTo(baseX + 480, horizonY - 38, baseX + 560, horizonY);
    ctx.quadraticCurveTo(baseX + 600, horizonY - 24, baseX + viewportWidth, horizonY);
    ctx.closePath();
    ctx.fill();
  }
}

function renderRetroCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(240, 246, 255, 0.7)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.2, cy - h * 0.2, w * 0.3, h * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================================
// 5. MASTER RACE VIEW RENDERER (renderRaceView)
// ============================================================================

/**
 * Renders the top race simulation viewport (640x336 by default).
 * Draws sky parallax, projected raster road polygons with occlusion buffer,
 * roadside scenery, traffic vehicles, AI rivals, police pursuit, player bike,
 * nitro thrust plumes, skidding tire smoke, and combat impact bursts.
 */
export function renderRaceView(
  ctx: CanvasRenderingContext2D,
  state: RaceSimulationState,
  segments: RoadSegment[],
  viewportWidth = DEFAULT_VIEWPORT_WIDTH,
  viewportHeight = DEFAULT_VIEWPORT_HEIGHT
): void {
  if (!segments || segments.length === 0 || !state.track) return;

  const totalSegments = segments.length;
  const segmentLength = state.segmentLengthWorld || SEGMENT_LENGTH;
  const trackLength = state.trackLengthWorld || (totalSegments * segmentLength);
  const roadWidth = ROAD_WIDTH;
  const cameraDepth = state.cameraDepth || 0.84;

  const player = state.player;
  const playerZ = player ? player.z : 0;
  const playerX = player ? player.x : 0;

  // Base segment where player is currently located
  const baseSegmentIndex = Math.floor(playerZ / segmentLength) % totalSegments;
  const baseSegment = segments[baseSegmentIndex];
  const basePercent = (playerZ % segmentLength) / segmentLength;

  // Camera world coordinates
  const cameraZ = state.cameraZ !== undefined ? state.cameraZ : playerZ;
  const cameraX = playerX * roadWidth;

  const baseElevation = baseSegment.p1.world.y + (baseSegment.p2.world.y - baseSegment.p1.world.y) * basePercent;
  const cameraY = CAMERA_HEIGHT + baseElevation;

  // Hill pitch offset for horizon movement
  const nextLookaheadSegment = segments[(baseSegmentIndex + 8) % totalSegments];
  const hillDelta = nextLookaheadSegment.p1.world.y - baseElevation;
  const pitch = Math.max(-42, Math.min(42, hillDelta * 0.16));
  const horizonY = Math.round(viewportHeight * 0.46 + pitch);

  // Parallax curve accumulator
  let curveSum = 0;
  for (let c = 0; c < 25; c++) {
    curveSum += segments[(baseSegmentIndex + c) % totalSegments].curve;
  }

  ctx.save();
  // Clip strictly to viewport area
  ctx.beginPath();
  ctx.rect(0, 0, viewportWidth, viewportHeight);
  ctx.clip();

  // 1. Render Sky, Parallax Mountains & Rolling Hills
  renderParallaxBackground(ctx, state.track, horizonY, curveSum, playerX, viewportWidth);

  // 2. Project Visible Segments (Front-to-Back for screen coordinate & clipY calculation)
  let dx = -(baseSegment.curve * basePercent);
  let x = 0;
  let maxScreenY = viewportHeight;

  for (let n = 0; n < DRAW_DISTANCE; n++) {
    const segIdx = (baseSegmentIndex + n) % totalSegments;
    const segment = segments[segIdx];
    const isLooped = (baseSegmentIndex + n) >= totalSegments;

    const segmentZ1 = (segment.index * segmentLength) + (isLooped ? trackLength : 0);
    const segmentZ2 = ((segment.index + 1) * segmentLength) + (isLooped ? trackLength : 0);

    projectPoint(segment.p1, x, segment.p1.world.y, segmentZ1, cameraX, cameraY, cameraZ, cameraDepth, viewportWidth, viewportHeight, roadWidth);
    x += dx;
    dx += segment.curve;
    projectPoint(segment.p2, x, segment.p2.world.y, segmentZ2, cameraX, cameraY, cameraZ, cameraDepth, viewportWidth, viewportHeight, roadWidth);

    // Hill crest occlusion buffer (clipY)
    segment.clipY = maxScreenY;
    if (segment.p1.screen.y < maxScreenY) {
      maxScreenY = segment.p1.screen.y;
    }
  }

  // 3. Render Road Polygons (Back-to-Front Painter's Algorithm)
  for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
    const segIdx = (baseSegmentIndex + n) % totalSegments;
    const segment = segments[segIdx];
    const p1 = segment.p1;
    const p2 = segment.p2;

    // Skip segments behind camera or occluded below hill crests
    if (p1.camera.z <= 0 || p2.screen.y >= segment.clipY || p1.screen.y >= segment.clipY) {
      continue;
    }

    // Distance fog blend factor
    const fogFactor = Math.min(1.0, Math.exp(-p1.camera.z * (state.track.colors.fogDensity || 0.0006) * 0.45));

    // A. Grass Shoulder
    ctx.fillStyle = segment.isDark ? state.track.colors.grassDark : state.track.colors.grassLight;
    ctx.beginPath();
    ctx.moveTo(0, p2.screen.y);
    ctx.lineTo(viewportWidth, p2.screen.y);
    ctx.lineTo(viewportWidth, p1.screen.y);
    ctx.lineTo(0, p1.screen.y);
    ctx.closePath();
    ctx.fill();

    // B. Rumble Strips (Trapezoids on left and right road borders)
    ctx.fillStyle = segment.isDark ? state.track.colors.rumbleDark : state.track.colors.rumbleLight;
    // Left rumble
    renderPolygon(
      ctx,
      p1.screen.x - p1.screen.w * 1.16, p1.screen.y,
      p1.screen.x - p1.screen.w, p1.screen.y,
      p2.screen.x - p2.screen.w, p2.screen.y,
      p2.screen.x - p2.screen.w * 1.16, p2.screen.y
    );
    // Right rumble
    renderPolygon(
      ctx,
      p1.screen.x + p1.screen.w, p1.screen.y,
      p1.screen.x + p1.screen.w * 1.16, p1.screen.y,
      p2.screen.x + p2.screen.w * 1.16, p2.screen.y,
      p2.screen.x + p2.screen.w, p2.screen.y
    );

    // C. Road Asphalt Surface
    ctx.fillStyle = segment.isDark ? state.track.colors.roadDark : state.track.colors.roadLight;
    renderPolygon(
      ctx,
      p1.screen.x - p1.screen.w, p1.screen.y,
      p1.screen.x + p1.screen.w, p1.screen.y,
      p2.screen.x + p2.screen.w, p2.screen.y,
      p2.screen.x - p2.screen.w, p2.screen.y
    );

    // D. Dashed Center Lane Stripe
    if (segment.isDark) {
      ctx.fillStyle = state.track.colors.laneMarking || '#ffffff';
      const lw1 = Math.max(1, p1.screen.w * 0.024);
      const lw2 = Math.max(1, p2.screen.w * 0.024);
      renderPolygon(
        ctx,
        p1.screen.x - lw1, p1.screen.y,
        p1.screen.x + lw1, p1.screen.y,
        p2.screen.x + lw2, p2.screen.y,
        p2.screen.x - lw2, p2.screen.y
      );
    }

    // E. Start / Finish Line Checkered Banner
    if (segment.index === 0) {
      renderStartFinishBanner(ctx, p1, p2, viewportWidth);
    }

    // F. Distance Fog Overlay
    if (fogFactor < 0.98) {
      ctx.fillStyle = state.track.colors.fogColor || '#446482';
      ctx.globalAlpha = 1.0 - fogFactor;
      ctx.fillRect(0, p2.screen.y, viewportWidth, p1.screen.y - p2.screen.y + 1);
      ctx.globalAlpha = 1.0;
    }
  }

  // 4. Render Entities on Segments (Back-to-Front Painter's Algorithm)
  for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
    const segIdx = (baseSegmentIndex + n) % totalSegments;
    const segment = segments[segIdx];
    const p1 = segment.p1;

    if (p1.camera.z <= 0 || p1.screen.y >= segment.clipY) continue;

    // A. Roadside Scenery Objects on this segment
    for (const obj of segment.sprites) {
      renderRoadsideEntity(ctx, obj, p1, segment.clipY);
    }

    // B. Traffic Vehicles on this segment
    if (segment.cars && segment.cars.length > 0) {
      for (const car of segment.cars) {
        renderTrafficEntity(ctx, car, p1, segment.clipY);
      }
    }

    // C. AI Racers & Police Officers on this segment
    if (state.racers && state.racers.length > 0) {
      const segStartWorldZ = segment.index * segmentLength;
      const segEndWorldZ = (segment.index + 1) * segmentLength;

      for (const racer of state.racers) {
        if (racer.isPlayer) continue; // Render player in foreground pass

        // Check if racer is within this segment
        const rz = racer.z % trackLength;
        if (rz >= segStartWorldZ && rz < segEndWorldZ) {
          renderBikerEntity(ctx, racer, p1, segment.clipY, state.elapsedTimeMs);
        }
      }
    }
  }

  // 5. Render Player's Motorcycle & Rider in Foreground
  if (player) {
    renderPlayerForeground(ctx, player, baseSegment, viewportWidth, viewportHeight, state.elapsedTimeMs);
  }

  ctx.restore();
}

// ----------------------------------------------------------------------------
// Helper: Draw Road Quad Polygon
// ----------------------------------------------------------------------------

function renderPolygon(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

// ----------------------------------------------------------------------------
// Helper: Start / Finish Line Checkered Texture & Overhead Truss
// ----------------------------------------------------------------------------

function renderStartFinishBanner(
  ctx: CanvasRenderingContext2D,
  p1: { screen: ScreenPoint },
  p2: { screen: ScreenPoint },
  _viewportWidth: number
): void {
  // Checkered pattern on road surface
  const numChecks = 16;
  const step1 = (p1.screen.w * 2) / numChecks;
  const step2 = (p2.screen.w * 2) / numChecks;

  for (let c = 0; c < numChecks; c++) {
    ctx.fillStyle = (c % 2 === 0) ? '#ffffff' : '#111115';
    renderPolygon(
      ctx,
      (p1.screen.x - p1.screen.w) + c * step1, p1.screen.y,
      (p1.screen.x - p1.screen.w) + (c + 1) * step1, p1.screen.y,
      (p2.screen.x - p2.screen.w) + (c + 1) * step2, p2.screen.y,
      (p2.screen.x - p2.screen.w) + c * step2, p2.screen.y
    );
  }

  // Overhead Finish Gantry Arch
  const archHeight = Math.round(p1.screen.w * 0.7);
  const archTop = p1.screen.y - archHeight;
  const leftCol = p1.screen.x - p1.screen.w * 1.15;
  const rightCol = p1.screen.x + p1.screen.w * 1.15;

  if (archTop > 0) {
    // Steel columns
    ctx.fillStyle = '#6a7280';
    ctx.fillRect(leftCol - 6, archTop, 12, archHeight);
    ctx.fillRect(rightCol - 6, archTop, 12, archHeight);

    // Cross truss
    ctx.fillStyle = '#e42020';
    ctx.fillRect(leftCol, archTop, rightCol - leftCol, Math.max(12, Math.round(archHeight * 0.22)));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(leftCol, archTop + 3, rightCol - leftCol, Math.max(6, Math.round(archHeight * 0.1)));
  }
}

// ----------------------------------------------------------------------------
// Helper: Render Roadside Scenery
// ----------------------------------------------------------------------------

function renderRoadsideEntity(
  ctx: CanvasRenderingContext2D,
  obj: RoadsideObject,
  p: { screen: ScreenPoint },
  clipY: number
): void {
  const sprite = getRoadsideSprite(obj.type);
  const scale = p.screen.scale * obj.scale * 1.6;
  const destW = Math.round(sprite.width * scale);
  const destH = Math.round(sprite.height * scale);

  const destX = Math.round(p.screen.x + (p.screen.w * obj.x) - (destW / 2));
  const destY = Math.round(p.screen.y - destH);

  // Hill crest occlusion clipping
  if (destY + destH >= clipY) {
    const visibleH = clipY - destY;
    if (visibleH <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(destX - 2, destY - 2, destW + 4, visibleH + 2);
    ctx.clip();
    ctx.drawImage(sprite, destX, destY, destW, destH);
    ctx.restore();
    return;
  }

  ctx.drawImage(sprite, destX, destY, destW, destH);
}

// ----------------------------------------------------------------------------
// Helper: Render Traffic Vehicles
// ----------------------------------------------------------------------------

function renderTrafficEntity(
  ctx: CanvasRenderingContext2D,
  car: TrafficVehicle,
  p: { screen: ScreenPoint },
  clipY: number
): void {
  const sprite = getTrafficSprite(car.type, car.direction, car.color);
  const scale = p.screen.scale * 1.5;
  const destW = Math.round(sprite.width * scale);
  const destH = Math.round(sprite.height * scale);

  const destX = Math.round(p.screen.x + (p.screen.w * car.x) - (destW / 2));
  const destY = Math.round(p.screen.y - destH);

  // Shadow on road under tires
  ctx.fillStyle = 'rgba(10, 10, 14, 0.45)';
  ctx.beginPath();
  ctx.ellipse(destX + destW / 2, p.screen.y - 2, destW * 0.46, Math.max(3, destH * 0.12), 0, 0, Math.PI * 2);
  ctx.fill();

  if (destY + destH >= clipY) {
    const visibleH = clipY - destY;
    if (visibleH <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(destX - 2, destY - 2, destW + 4, visibleH + 2);
    ctx.clip();
    ctx.drawImage(sprite, destX, destY, destW, destH);
    ctx.restore();
    return;
  }

  ctx.drawImage(sprite, destX, destY, destW, destH);
}

// ----------------------------------------------------------------------------
// Helper: Render AI Rival / Police Entity
// ----------------------------------------------------------------------------

function renderBikerEntity(
  ctx: CanvasRenderingContext2D,
  racer: RacerEntity,
  p: { screen: ScreenPoint },
  clipY: number,
  elapsedTimeMs: number
): void {
  // Determine pose based on crash data, combat, or cornering
  const pose = determineRacerPose(racer, elapsedTimeMs);
  const isCop = !!racer.copProfile;
  const beaconPhase = Math.floor(elapsedTimeMs / 250) % 2;

  const sprite = getRacerSprite({
    colorScheme: racer.bike.colorScheme,
    riderName: racer.name,
    isCop,
    pose,
    beaconPhase,
  });

  const scale = p.screen.scale * 1.7;
  const destW = Math.round(sprite.width * scale);
  const destH = Math.round(sprite.height * scale);

  const destX = Math.round(p.screen.x + (p.screen.w * racer.x) - (destW / 2));
  const destY = Math.round(p.screen.y - destH);

  // Contact shadow on asphalt
  ctx.fillStyle = 'rgba(10, 10, 14, 0.45)';
  ctx.beginPath();
  ctx.ellipse(destX + destW / 2, p.screen.y - 2, destW * 0.36, Math.max(2, destH * 0.1), 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw sprite with crest clipping
  if (destY + destH >= clipY) {
    const visibleH = clipY - destY;
    if (visibleH <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(destX - 2, destY - 2, destW + 4, visibleH + 2);
    ctx.clip();
    ctx.drawImage(sprite, destX, destY, destW, destH);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, destX, destY, destW, destH);
  }

  // Nitro Flames
  if (racer.nitroActive) {
    const flame = getEffectSprite('nitro', Math.floor(elapsedTimeMs / 60));
    const fw = Math.round(flame.width * scale);
    const fh = Math.round(flame.height * scale);
    ctx.drawImage(flame, destX + destW * 0.35 - fw / 2, destY + destH * 0.8, fw, fh);
    ctx.drawImage(flame, destX + destW * 0.65 - fw / 2, destY + destH * 0.8, fw, fh);
  }

  // Combat impact spark / "POW!" burst
  if (racer.attacking) {
    const spark = getCombatSparkSprite('pow');
    const sw = Math.round(spark.width * scale * 1.2);
    const sh = Math.round(spark.height * scale * 1.2);
    const sparkX = racer.x < 0 ? destX + destW : destX - sw;
    ctx.drawImage(spark, sparkX, destY + destH * 0.3, sw, sh);
  }
}

// ----------------------------------------------------------------------------
// Helper: Determine Racer Pose from Entity State
// ----------------------------------------------------------------------------

function determineRacerPose(racer: RacerEntity, elapsedTimeMs: number): RacerPose {
  const crash = racer.crashData;
  if (crash && crash.state !== 'none') {
    switch (crash.state) {
      case 'flying':
        return 'flying';
      case 'tumbling': {
        const frame = Math.floor(elapsedTimeMs / 120) % 4;
        return `tumbling_${frame}` as RacerPose;
      }
      case 'getting_up':
        return 'getting_up';
      case 'running_to_bike': {
        const frame = Math.floor(elapsedTimeMs / 100) % 4;
        return `running_${frame}` as RacerPose;
      }
      case 'wrecked_totaled':
        return 'downed_bike';
    }
  }

  // Combat strikes
  if (racer.attacking && racer.currentAttack) {
    return getCombatPose(racer.currentAttack, racer.x < 0);
  }

  // Cornering / Lean
  return 'straight';
}

function getCombatPose(action: CombatActionType, strikeRight: boolean): RacerPose {
  switch (action) {
    case 'punch':
    case 'backhand':
      return strikeRight ? 'punch_right' : 'punch_left';
    case 'kick':
      return strikeRight ? 'kick_right' : 'kick_left';
    case 'club_swing':
      return strikeRight ? 'club_right' : 'club_left';
    case 'chain_whip':
      return strikeRight ? 'chain_right' : 'chain_left';
    case 'crowbar_strike':
      return strikeRight ? 'crowbar_right' : 'crowbar_left';
    default:
      return strikeRight ? 'punch_right' : 'punch_left';
  }
}

// ----------------------------------------------------------------------------
// Helper: Render Player's Bike in Foreground (Bottom Center)
// ----------------------------------------------------------------------------

function renderPlayerForeground(
  ctx: CanvasRenderingContext2D,
  player: RacerEntity,
  _baseSegment: RoadSegment,
  viewportWidth: number,
  viewportHeight: number,
  elapsedTimeMs: number
): void {
  // If player crashed, handle crash states
  if (player.crashData && player.crashData.state !== 'none') {
    renderPlayerCrashedForeground(ctx, player, viewportWidth, viewportHeight, elapsedTimeMs);
    return;
  }

  // Normal riding player bike in foreground
  let pose: RacerPose = 'straight';
  if (player.attacking && player.currentAttack) {
    // Player combat punch/kick/weapon
    pose = getCombatPose(player.currentAttack, true);
  } else if (Math.abs(player.x) > 0.4) {
    pose = player.x > 0 ? 'lean_right_hard' : 'lean_left_hard';
  } else if (Math.abs(player.x) > 0.15) {
    pose = player.x > 0 ? 'lean_right' : 'lean_left';
  }

  const sprite = getRacerSprite({
    colorScheme: player.bike.colorScheme,
    riderName: 'Player',
    isPlayer: true,
    pose,
  });

  const scale = 2.1;
  const destW = Math.round(sprite.width * scale);
  const destH = Math.round(sprite.height * scale);

  // Lateral sway with player steering input
  const destX = Math.round(viewportWidth / 2 + (player.x * 65) - (destW / 2));
  const destY = viewportHeight - destH - 4;

  // Contact shadow on asphalt
  ctx.fillStyle = 'rgba(8, 8, 12, 0.5)';
  ctx.beginPath();
  ctx.ellipse(destX + destW / 2, viewportHeight - 6, destW * 0.35, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(sprite, destX, destY, destW, destH);

  // Nitro Boost Flames
  if (player.nitroActive) {
    const flame = getEffectSprite('nitro', Math.floor(elapsedTimeMs / 60));
    const fw = Math.round(flame.width * 1.8);
    const fh = Math.round(flame.height * 1.8);
    ctx.drawImage(flame, destX + destW * 0.35 - fw / 2, destY + destH * 0.82, fw, fh);
    ctx.drawImage(flame, destX + destW * 0.65 - fw / 2, destY + destH * 0.82, fw, fh);
  }

  // Tire Skid Smoke (Braking or hard sliding)
  if (Math.abs(player.x) > 0.6 || player.speedMph < player.maxSpeedMph * 0.4) {
    const smoke = getEffectSprite('smoke', Math.floor(elapsedTimeMs / 80));
    const sw = Math.round(smoke.width * 1.4);
    const sh = Math.round(smoke.height * 1.4);
    ctx.drawImage(smoke, destX + destW * 0.2 - sw / 2, viewportHeight - sh - 2, sw, sh);
    ctx.drawImage(smoke, destX + destW * 0.8 - sw / 2, viewportHeight - sh - 2, sw, sh);
  }
}

function renderPlayerCrashedForeground(
  ctx: CanvasRenderingContext2D,
  player: RacerEntity,
  viewportWidth: number,
  viewportHeight: number,
  elapsedTimeMs: number
): void {
  const crash = player.crashData;
  let pose: RacerPose = 'tumbling_0';

  if (crash.state === 'flying') {
    pose = 'flying';
  } else if (crash.state === 'tumbling') {
    pose = `tumbling_${Math.floor(elapsedTimeMs / 120) % 4}` as RacerPose;
  } else if (crash.state === 'getting_up') {
    pose = 'getting_up';
  } else if (crash.state === 'running_to_bike') {
    pose = `running_${Math.floor(elapsedTimeMs / 100) % 4}` as RacerPose;
  }

  // Draw downed bike
  const bikeSprite = getRacerSprite({
    colorScheme: player.bike.colorScheme,
    riderName: 'Player',
    isPlayer: true,
    pose: 'downed_bike',
  });
  const bikeW = Math.round(bikeSprite.width * 1.8);
  const bikeH = Math.round(bikeSprite.height * 1.8);
  const bikeX = Math.round(viewportWidth / 2 + (crash.bikeWorldX * 60) - bikeW / 2);
  const bikeY = viewportHeight - bikeH - 12;
  ctx.drawImage(bikeSprite, bikeX, bikeY, bikeW, bikeH);

  // Draw rider
  const riderSprite = getRacerSprite({
    colorScheme: player.bike.colorScheme,
    riderName: 'Player',
    isPlayer: true,
    pose,
  });
  const riderW = Math.round(riderSprite.width * 1.8);
  const riderH = Math.round(riderSprite.height * 1.8);
  const riderX = Math.round(viewportWidth / 2 + (crash.riderWorldX * 60) - riderW / 2);
  const riderY = viewportHeight - riderH - 8;
  ctx.drawImage(riderSprite, riderX, riderY, riderW, riderH);
}

// ============================================================================
// 6. REAR-VIEW MIRROR RENDERER (renderRearViewMirror)
// ============================================================================

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Renders the rear-view mirror view showing the road behind the player
 * and approaching rival racers or highway patrol cops approaching from behind.
 */
export function renderRearViewMirror(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  state: RaceSimulationState,
  side: 'left' | 'right'
): void {
  ctx.save();

  // 1. Outer Beveled Metallic Casing
  ctx.fillStyle = '#121216';
  ctx.strokeStyle = '#5a6270';
  ctx.lineWidth = 2;
  ctx.beginPath();
  drawRoundRectPath(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  // 2. Mirror Glass Viewport (Clipped)
  ctx.beginPath();
  drawRoundRectPath(ctx, x + 2, y + 2, w - 4, h - 4, 4);
  ctx.clip();

  const mirrorHorizonY = y + Math.round(h * 0.48);

  // Sky behind player
  const skyGrad = ctx.createLinearGradient(0, y, 0, mirrorHorizonY);
  skyGrad.addColorStop(0, '#264268');
  skyGrad.addColorStop(1, '#547ca8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(x + 2, y + 2, w - 4, mirrorHorizonY - (y + 2));

  // Asphalt road surface receding backwards
  ctx.fillStyle = '#34363c';
  ctx.fillRect(x + 2, mirrorHorizonY, w - 4, y + h - mirrorHorizonY);

  // Road converging edges & dashed center stripe
  const centerX = x + w / 2 + (side === 'left' ? -w * 0.12 : w * 0.12);
  ctx.strokeStyle = '#707480';
  ctx.lineWidth = 1;

  // Road borders
  ctx.beginPath();
  ctx.moveTo(centerX - 4, mirrorHorizonY);
  ctx.lineTo(x - 10, y + h);
  ctx.moveTo(centerX + 4, mirrorHorizonY);
  ctx.lineTo(x + w + 10, y + h);
  ctx.stroke();

  // Dashed lane marks
  ctx.strokeStyle = '#ffffff';
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([4, 4]);
  }
  ctx.beginPath();
  ctx.moveTo(centerX, mirrorHorizonY);
  ctx.lineTo(centerX, y + h);
  ctx.stroke();
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([]);
  }

  // 3. Approaching Racers & Cops Behind Player
  if (state.racers && state.racers.length > 0 && state.player) {
    const playerZ = state.player.z;
    const trackLength = state.trackLengthWorld || (state.totalSegments * (state.segmentLengthWorld || SEGMENT_LENGTH));

    let closestCopApproaching = false;

    for (const racer of state.racers) {
      if (racer.isPlayer) continue;

      // Distance behind player
      let diffZ = (playerZ - racer.z) % trackLength;
      if (diffZ < 0) diffZ += trackLength;

      // Only show racers within 2400 units behind player
      if (diffZ > 20 && diffZ < 2400) {
        // Flank check based on mirror side
        const matchesSide = side === 'left' ? racer.x <= 0.35 : racer.x >= -0.35;
        if (!matchesSide) continue;

        const isCop = !!racer.copProfile;
        if (isCop && diffZ < 600) {
          closestCopApproaching = true;
        }

        const distFactor = Math.max(0.05, 1.0 - (diffZ / 2400));
        const sprite = getFrontBikeSprite({
          colorScheme: racer.bike.colorScheme,
          riderName: racer.name,
          isCop,
          pose: 'straight',
          beaconPhase: Math.floor(state.elapsedTimeMs / 200) % 2,
        });

        const scale = distFactor * 0.9;
        const bw = Math.round(sprite.width * scale);
        const bh = Math.round(sprite.height * scale);

        // Screen positioning in mirror
        const bx = Math.round(centerX + (racer.x * (w * 0.32)) - bw / 2);
        const by = Math.round(mirrorHorizonY + (distFactor * (h * 0.44)) - bh);

        ctx.drawImage(sprite, bx, by, bw, bh);

        // Headlight glow on road
        ctx.fillStyle = 'rgba(255, 255, 200, 0.25)';
        ctx.beginPath();
        ctx.ellipse(bx + bw / 2, by + bh, bw * 0.6, Math.max(2, bh * 0.2), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Danger flashing border if cop is right on player's tail
    if (closestCopApproaching && Math.floor(state.elapsedTimeMs / 180) % 2 === 0) {
      ctx.strokeStyle = '#ff1818';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }
  }

  // 4. Convex Mirror Glass Reflection Highlight
  const glareGrad = ctx.createLinearGradient(x + 2, y + 2, x + w - 4, y + h - 4);
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  glareGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
  glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = glareGrad;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

  ctx.restore();
}
