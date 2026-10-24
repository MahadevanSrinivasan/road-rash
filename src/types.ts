/**
 * Road Rash (1991 Sega Genesis) - Master Type Definitions
 * Complete architectural models for pseudo-3D raster road simulation,
 * combat physics, 15 authentic bikes, 14 AI rivals, police pursuit,
 * and career progression.
 */

// ============================================================================
// 1. WEAPONS & COMBAT SYSTEM
// ============================================================================

export type WeaponType = 'fist' | 'club' | 'chain' | 'crowbar' | 'none';

export type CombatActionType = 'punch' | 'backhand' | 'kick' | 'club_swing' | 'chain_whip' | 'crowbar_strike';

export interface WeaponDefinition {
  type: WeaponType;
  name: string;
  damage: number;
  knockback: number;
  rangeDistance: number;
  swingDurationMs: number;
  snatchable: boolean;
  description: string;
}

export interface CombatHitEvent {
  attackerId: string;
  targetId: string;
  weapon: WeaponType;
  action: CombatActionType;
  damage: number;
  snatchedWeapon: boolean;
  targetWipedOut: boolean;
  timestamp: number;
}

// ============================================================================
// 2. BIKES & PERFORMANCE SPECIFICATIONS
// ============================================================================

export type BikeClass = 'Panda' | 'Sport' | 'Super';

export interface BikeColorScheme {
  fairing: string;       // Primary bodywork color
  tank: string;          // Accent / stripe
  engine: string;        // Metal/engine casing
  windshield: string;    // Visor / glass tint
  exhaust: string;       // Chrome/pipes
  wheels: string;        // Rims/tires
}

export interface Bike {
  id: string;
  name: string;
  class: BikeClass;
  price: number;
  hp: number;
  weightLbs: number;
  topSpeedMph: number;
  acceleration: number;  // 0 - 100 rating
  cornering: number;     // 0 - 100 rating
  durability: number;    // 0 - 100 rating (resistance to damage)
  hasNitro: boolean;
  nitroCharges: number;  // Boost count per race
  colorScheme: BikeColorScheme;
  description: string;
}

// ============================================================================
// 3. AI RIVALS & PERSONALITY SYSTEM
// ============================================================================

export type RivalName =
  | 'Biff'
  | 'Natasha'
  | 'Slater'
  | 'Ikira'
  | 'P.E. No. 1'
  | 'Viper'
  | 'Helga'
  | 'Rude Boy'
  | 'Gino'
  | 'Butch'
  | 'Sven'
  | 'Tanya'
  | 'Spike'
  | 'Diablo';

export type RivalPersonality =
  | 'brawler'         // Constantly attacks, swings weapons
  | 'aggressive'      // Rams into player, aggressive cornering
  | 'speedster'       // Focuses on clean high-speed lines, evades fights
  | 'defensive'       // Counters when approached, stays stable
  | 'unpredictable'   // Swerves randomly, chaotic combat
  | 'tactical';       // Uses traffic as hazards, strikes when player is cornered

export interface RivalQuotes {
  preRace: string[];
  winRace: string[];
  loseRace: string[];
  taunt: string[];
  wrecked: string[];
  busted: string[];
}

export interface RivalLevelScaling {
  speedBonusMph: number;
  aggressionMultiplier: number;
  skillMultiplier: number;
  bikeUpgradeId?: string;
  weaponUpgrade?: WeaponType;
}

export interface AIRival {
  id: string;
  name: RivalName;
  bikeId: string;
  preferredWeapon: WeaponType;
  aggression: number;       // 0.0 (passive) to 1.0 (relentless)
  skill: number;            // 0.0 (amateur) to 1.0 (flawless racer)
  speedMultiplier: number;  // Base speed multiplier (0.85 to 1.25)
  personality: RivalPersonality;
  quotes: RivalQuotes;
  levelScaling: Record<number, RivalLevelScaling>;
}

// ============================================================================
// 4. POLICE PURSUIT SYSTEM
// ============================================================================

export type CopName = "Officer O'Leary" | "Officer Garcia" | "Officer Bob" | "State Trooper";

export type CopState =
  | 'idle'
  | 'patrolling'
  | 'pursuing'
  | 'attacking'
  | 'arresting'
  | 'crashed';

export interface CopVehicle {
  id: string;
  name: CopName;
  bikeId: string;
  state: CopState;
  sirenActive: boolean;
  fineAmountByLevel: Record<number, number>;
  taunts: string[];
  pursuitSpeedMph: number;
}

// ============================================================================
// 5. CRASH, WIPEOUT & RUN-BACK MECHANICS
// ============================================================================

export type CrashState =
  | 'none'
  | 'flying'            // Airborne ejection
  | 'tumbling'          // Cartwheeling across the asphalt
  | 'getting_up'        // Standing up animation
  | 'running_to_bike'   // On-foot sprint to motorcycle
  | 'mounting_bike'     // Remounting bike animation
  | 'busted'            // Caught by police while down or on foot
  | 'wrecked_totaled';  // Bike destroyed 100%

export interface RiderCrashData {
  state: CrashState;
  riderWorldX: number;       // Lateral position (-1.0 to 1.0 or beyond road shoulder)
  riderWorldZ: number;       // Track distance coordinate
  bikeWorldX: number;
  bikeWorldZ: number;
  distanceToBikeFeet: number;
  tumbleVelocity: { x: number; y: number; z: number };
  runSpeed: number;
  isStunned: boolean;
  stunDurationMs: number;
  runOverCount: number;      // Hits taken while on foot by traffic or rivals
}

// ============================================================================
// 6. TRAFFIC VEHICLES
// ============================================================================

export type TrafficType =
  | 'sedan'
  | 'station_wagon'
  | 'pickup'
  | 'convertible'
  | 'semi_truck'
  | 'sports_car';

export type TrafficDirection = 'same' | 'oncoming';

export interface TrafficVehicle {
  id: string;
  type: TrafficType;
  direction: TrafficDirection;
  x: number;               // Lateral position: -1.0 (left shoulder) to 1.0 (right shoulder)
  z: number;               // Position along the track in world units
  speedMph: number;
  color: string;
  width: number;
  length: number;
  collided: boolean;
}

// ============================================================================
// 7. ROADSIDE SPRITES & OBSTACLES
// ============================================================================

export type RoadsideSpriteType =
  | 'tree_pine'
  | 'tree_redwood'
  | 'tree_palm'
  | 'cactus_saguaro'
  | 'telephone_pole'
  | 'rock_boulder'
  | 'cow'
  | 'billboard'
  | 'guardrail'
  | 'road_sign_curve_left'
  | 'road_sign_curve_right'
  | 'road_sign_steep'
  | 'dirt_mound'
  | 'oil_slick'
  | 'spectator';

export interface RoadsideObject {
  id: string;
  type: RoadsideSpriteType;
  x: number;              // Lateral position (< -1.0 or > 1.0 is on the side)
  z: number;              // World distance along track
  scale: number;
  collidable: boolean;
  damageOnImpact: number;
  launchRampHeight?: number; // Dirt mounds launch bike airborne
}

// ============================================================================
// 8. TRACKS & PSEUDO-3D RASTER ROAD SEGMENTS
// ============================================================================

export type TrackId =
  | 'sierra_nevada'
  | 'pacific_coast'
  | 'redwood_forest'
  | 'palm_desert'
  | 'grass_valley';

export interface TrackColors {
  skyGradientTop: string;
  skyGradientBottom: string;
  distantMountains: string;
  hills: string;
  grassLight: string;
  grassDark: string;
  roadLight: string;
  roadDark: string;
  rumbleLight: string;
  rumbleDark: string;
  laneMarking: string;
  fogColor: string;
  fogDensity: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  w: number;
  scale: number;
}

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

export interface RoadSegment {
  index: number;
  p1: { world: WorldPoint; screen: ScreenPoint; camera: WorldPoint };
  p2: { world: WorldPoint; screen: ScreenPoint; camera: WorldPoint };
  curve: number;           // Curve factor (- = left, + = right)
  elevation: number;       // Y delta (hill climb or drop)
  isDark: boolean;         // Alternating stripe pattern
  sprites: RoadsideObject[];
  cars: TrafficVehicle[];
  clipY: number;           // Bottom clipping for hill occlusion
}

export interface RoadGeometryPreset {
  lengthInSegments: number;
  curve: number;
  hill: number;
}

export interface TrackPreset {
  id: TrackId;
  name: string;
  subtitle: string;
  lengthMilesByLevel: Record<number, number>;
  colors: TrackColors;
  musicTrackName: string;
  totalSegmentsByLevel: Record<number, number>;
  trafficDensityByLevel: Record<number, number>;
  copFrequencyByLevel: Record<number, number>;
  cashPrizesByLevel: Record<number, [number, number, number]>; // 1st, 2nd, 3rd prizes
  geometryPattern: RoadGeometryPreset[];
}

// ============================================================================
// 9. RACER ENTITY (PLAYER & AI COMPETITORS)
// ============================================================================

export interface RacerEntity {
  id: string;
  name: string;
  isPlayer: boolean;
  bike: Bike;
  x: number;               // Lateral position (-1.0 to 1.0)
  z: number;               // Track position (0 to track.length)
  speedMph: number;
  maxSpeedMph: number;
  stamina: number;         // 0 to 100 (combat life)
  maxStamina: number;
  bikeHealth: number;      // 0 to 100 (damage resistance)
  weapon: WeaponType;
  attacking: boolean;
  attackCooldownMs: number;
  currentAttack?: CombatActionType;
  crashData: RiderCrashData;
  finishPosition: number | null;
  finishTimeMs: number | null;
  nitroRemaining: number;
  nitroActive: boolean;
  nitroTimerMs: number;
  rivalProfile?: AIRival;
  copProfile?: CopVehicle;
}

// ============================================================================
// 10. CAREER & CHAMPIONSHIP PROGRESSION
// ============================================================================

export type ChampionshipLevel = 1 | 2 | 3 | 4 | 5;

export interface TrackProgress {
  trackId: TrackId;
  qualified: boolean;       // Must place 3rd or better to qualify
  bestPlace: number;        // Best finish position (1-15)
  bestTimeMs: number;       // Best time in milliseconds
  prizeMoneyWon: number;
}

export interface CareerProgress {
  level: ChampionshipLevel;
  cash: number;
  currentBikeId: string;
  ownedBikeIds: string[];
  trackProgress: Record<TrackId, TrackProgress>;
  totalRacesWon: number;
  totalKnockouts: number;
  totalArrests: number;
  totalWrecks: number;
  password: string;         // 8-character classic password representation
}

// ============================================================================
// 11. CLASSIC 8-CHAR PASSWORD GENERATOR / DECODER
// ============================================================================

export interface DecodedPassword {
  valid: boolean;
  level: ChampionshipLevel;
  bikeIndex: number;
  cash: number;
  tracksQualifiedBits: number;
}

// ============================================================================
// 12. GAME ARCHITECTURE & SCREEN STATES
// ============================================================================

export type GameScreen =
  | 'title'
  | 'main_menu'
  | 'clubhouse'
  | 'bike_shop'
  | 'track_select'
  | 'race'
  | 'race_results'
  | 'wrecked_screen'
  | 'busted_screen'
  | 'password_entry'
  | 'victory_congratulations';

export interface RaceSimulationState {
  track: TrackPreset;
  level: ChampionshipLevel;
  racers: RacerEntity[];
  player: RacerEntity;
  trackLengthWorld: number;
  segmentLengthWorld: number;
  totalSegments: number;
  cameraZ: number;
  cameraDepth: number;
  elapsedTimeMs: number;
  raceFinished: boolean;
  qualifyingThreshold: number; // 3 = Top 3 required
}

export interface GameState {
  currentScreen: GameScreen;
  career: CareerProgress;
  activeRace: RaceSimulationState | null;
  audioMuted: boolean;
  soundVolume: number;
  musicVolume: number;
}

// ============================================================================
// 13. INPUT CONTROLS
// ============================================================================

export interface PlayerInput {
  accelerate: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  punch: boolean;
  kick: boolean;
  nitro: boolean;
  pause: boolean;
}
