/**
 * Road Rash (1991 Sega Genesis) - Master Game Data
 * Authentic California tracks, 15 bikes, 14 named AI rivals,
 * weapons, police profiles, and password encoding algorithms.
 */

import {
  AIRival,
  Bike,
  ChampionshipLevel,
  CopVehicle,
  DecodedPassword,
  RivalName,
  TrackId,
  TrackPreset,
  WeaponDefinition,
  WeaponType,
  CareerProgress,
} from '../types';

// ============================================================================
// 1. WEAPON DEFINITIONS
// ============================================================================

export const WEAPONS: Record<WeaponType, WeaponDefinition> = {
  fist: {
    type: 'fist',
    name: 'Fists & Kicks',
    damage: 15,
    knockback: 12,
    rangeDistance: 1.8,
    swingDurationMs: 250,
    snatchable: false,
    description: 'Bare-knuckle punches and hard heel kicks to force rivals into the dirt.',
  },
  club: {
    type: 'club',
    name: 'Billy Club',
    damage: 30,
    knockback: 28,
    rangeDistance: 2.4,
    swingDurationMs: 320,
    snatchable: true,
    description: 'Heavy solid wooden police baton. Can deliver bone-jarring blows.',
  },
  chain: {
    type: 'chain',
    name: 'Heavy Steel Chain',
    damage: 38,
    knockback: 35,
    rangeDistance: 3.2,
    swingDurationMs: 380,
    snatchable: true,
    description: 'Industrial linked chain with lethal reach and devastating whip action.',
  },
  crowbar: {
    type: 'crowbar',
    name: 'Iron Crowbar',
    damage: 48,
    knockback: 44,
    rangeDistance: 2.6,
    swingDurationMs: 360,
    snatchable: true,
    description: 'Heavy curved pry-bar. Highest impact damage in close combat.',
  },
  none: {
    type: 'none',
    name: 'Unarmed',
    damage: 0,
    knockback: 0,
    rangeDistance: 0,
    swingDurationMs: 0,
    snatchable: false,
    description: 'No offensive weapon equipped.',
  },
};

// ============================================================================
// 2. 15 AUTHENTIC BIKES (PANDA, SPORT, SUPER CLASSES)
// ============================================================================

export const BIKES: Bike[] = [
  // --- PANDA / STANDARD CLASS ---
  {
    id: 'shuriken_400',
    name: 'Shuriken 400',
    class: 'Panda',
    price: 1000,
    hp: 42,
    weightLbs: 395,
    topSpeedMph: 112,
    acceleration: 32,
    cornering: 52,
    durability: 60,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#c83232',
      tank: '#ffffff',
      engine: '#404040',
      windshield: '#80b8d8',
      exhaust: '#a8a8a8',
      wheels: '#181818',
    },
    description: 'The standard entry-level cruiser. Heavy and modest top end, but cheap to maintain.',
  },
  {
    id: 'panda_600',
    name: 'Panda 600',
    class: 'Panda',
    price: 1800,
    hp: 58,
    weightLbs: 420,
    topSpeedMph: 121,
    acceleration: 44,
    cornering: 56,
    durability: 65,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#2a5a9c',
      tank: '#c0c0c0',
      engine: '#3b3b3b',
      windshield: '#72a0c4',
      exhaust: '#cccccc',
      wheels: '#181818',
    },
    description: 'Solid middleweight commuter with dependable torque and sturdy frame.',
  },
  {
    id: 'panda_750',
    name: 'Panda 750',
    class: 'Panda',
    price: 2750,
    hp: 72,
    weightLbs: 438,
    topSpeedMph: 129,
    acceleration: 54,
    cornering: 58,
    durability: 70,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#1c6834',
      tank: '#111111',
      engine: '#383838',
      windshield: '#668877',
      exhaust: '#b8b8b8',
      wheels: '#181818',
    },
    description: 'A respected highway cruiser that absorbs impacts well and stays glued to the road.',
  },
  {
    id: 'shuriken_1000',
    name: 'Shuriken 1000',
    class: 'Panda',
    price: 3900,
    hp: 88,
    weightLbs: 462,
    topSpeedMph: 138,
    acceleration: 62,
    cornering: 60,
    durability: 75,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#8c1d2e',
      tank: '#d8aa28',
      engine: '#2d2d2d',
      windshield: '#8098a8',
      exhaust: '#e0e0e0',
      wheels: '#222222',
    },
    description: 'Heavy 4-cylinder cruiser with serious straight-line momentum.',
  },
  {
    id: 'banzai_750',
    name: 'Banzai 750',
    class: 'Panda',
    price: 5200,
    hp: 96,
    weightLbs: 430,
    topSpeedMph: 146,
    acceleration: 68,
    cornering: 66,
    durability: 72,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#e5aa17',
      tank: '#161616',
      engine: '#363636',
      windshield: '#9ab0bf',
      exhaust: '#d0d0d0',
      wheels: '#141414',
    },
    description: 'The pinnacle of the Panda class. High-revving engine with responsive throttle.',
  },

  // --- SPORT BIKE CLASS ---
  {
    id: 'kamikaze_250',
    name: 'Kamikaze 250',
    class: 'Sport',
    price: 4300,
    hp: 66,
    weightLbs: 308,
    topSpeedMph: 136,
    acceleration: 66,
    cornering: 85,
    durability: 50,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#0fa3b1',
      tank: '#40e0d0',
      engine: '#2e2e2e',
      windshield: '#3b7482',
      exhaust: '#b4c0c4',
      wheels: '#181818',
    },
    description: 'Ultra-light featherweight sport racer. Carves through corners like a razor blade.',
  },
  {
    id: 'kamikaze_400',
    name: 'Kamikaze 400',
    class: 'Sport',
    price: 6400,
    hp: 80,
    weightLbs: 332,
    topSpeedMph: 147,
    acceleration: 74,
    cornering: 88,
    durability: 54,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#d62286',
      tank: '#1a1a1a',
      engine: '#303030',
      windshield: '#904e76',
      exhaust: '#cfcfcf',
      wheels: '#181818',
    },
    description: 'Agile 400cc screamer favored by urban street fighters and canyon carvers.',
  },
  {
    id: 'shuriken_800',
    name: 'Shuriken 800',
    class: 'Sport',
    price: 8500,
    hp: 106,
    weightLbs: 375,
    topSpeedMph: 156,
    acceleration: 79,
    cornering: 82,
    durability: 62,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#f0f0f0',
      tank: '#1e4bb5',
      engine: '#262626',
      windshield: '#5a78aa',
      exhaust: '#d4d4d4',
      wheels: '#121212',
    },
    description: 'A finely balanced race replica with outstanding power-to-weight balance.',
  },
  {
    id: 'rat_bike',
    name: 'Rat Bike',
    class: 'Sport',
    price: 9800,
    hp: 122,
    weightLbs: 390,
    topSpeedMph: 162,
    acceleration: 85,
    cornering: 76,
    durability: 82,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#6e4732',
      tank: '#3d302a',
      engine: '#1e1c1b',
      windshield: '#504a44',
      exhaust: '#825f44',
      wheels: '#111111',
    },
    description: 'Stripped down, rust-coated underground menace. Raw unruly torque and iron frame.',
  },
  {
    id: 'diablo_1000',
    name: 'Diablo 1000',
    class: 'Sport',
    price: 13000,
    hp: 138,
    weightLbs: 368,
    topSpeedMph: 172,
    acceleration: 89,
    cornering: 85,
    durability: 68,
    hasNitro: false,
    nitroCharges: 0,
    colorScheme: {
      fairing: '#a30815',
      tank: '#170507',
      engine: '#222222',
      windshield: '#66181f',
      exhaust: '#424242',
      wheels: '#0e0e0e',
    },
    description: 'Fierce sportbike powerhouse. Demands supreme reflexes to keep on the asphalt.',
  },

  // --- SUPER BIKE CLASS (NITRO EQUIPPED) ---
  {
    id: 'capek_850',
    name: 'Capek 850',
    class: 'Super',
    price: 15500,
    hp: 148,
    weightLbs: 388,
    topSpeedMph: 180,
    acceleration: 91,
    cornering: 86,
    durability: 76,
    hasNitro: true,
    nitroCharges: 3,
    colorScheme: {
      fairing: '#0f72c4',
      tank: '#e2e7ec',
      engine: '#2d333b',
      windshield: '#7bbce8',
      exhaust: '#e6eaf0',
      wheels: '#14181c',
    },
    description: 'European endurance superbike fitted with 3 compressed nitrous oxide bursts.',
  },
  {
    id: 'kula_1000',
    name: 'Kula 1000',
    class: 'Super',
    price: 19000,
    hp: 164,
    weightLbs: 378,
    topSpeedMph: 188,
    acceleration: 94,
    cornering: 89,
    durability: 78,
    hasNitro: true,
    nitroCharges: 4,
    colorScheme: {
      fairing: '#e85d04',
      tank: '#212529',
      engine: '#343a40',
      windshield: '#ffa200',
      exhaust: '#f8f9fa',
      wheels: '#121416',
    },
    description: 'Sleek aerodynamic missile designed for blistering circuit speeds and 4 nitrous boosts.',
  },
  {
    id: 'banzai_1100',
    name: 'Banzai 1100',
    class: 'Super',
    price: 23000,
    hp: 182,
    weightLbs: 392,
    topSpeedMph: 195,
    acceleration: 96,
    cornering: 88,
    durability: 82,
    hasNitro: true,
    nitroCharges: 5,
    colorScheme: {
      fairing: '#4ca727',
      tank: '#161d15',
      engine: '#282f27',
      windshield: '#8ae266',
      exhaust: '#e2f0df',
      wheels: '#101410',
    },
    description: 'Factory-tuned Japanese superbike monster delivering explosive nitrous acceleration.',
  },
  {
    id: 'corsair_1200',
    name: 'Corsair 1200',
    class: 'Super',
    price: 27500,
    hp: 198,
    weightLbs: 382,
    topSpeedMph: 202,
    acceleration: 98,
    cornering: 92,
    durability: 86,
    hasNitro: true,
    nitroCharges: 6,
    colorScheme: {
      fairing: '#50167c',
      tank: '#e0b82b',
      engine: '#26222b',
      windshield: '#aa6ce2',
      exhaust: '#f5f0fa',
      wheels: '#131017',
    },
    description: 'Grand Prix championship homologation special. 6 nitrous charges and razor handling.',
  },
  {
    id: 'wild_thing_2000',
    name: 'Wild Thing 2000',
    class: 'Super',
    price: 36000,
    hp: 235,
    weightLbs: 360,
    topSpeedMph: 218,
    acceleration: 100,
    cornering: 96,
    durability: 90,
    hasNitro: true,
    nitroCharges: 8,
    colorScheme: {
      fairing: '#f4b000',
      tank: '#d00000',
      engine: '#1c1c1c',
      windshield: '#fff275',
      exhaust: '#ffffff',
      wheels: '#080808',
    },
    description: 'The mythical crown jewel of Road Rash. 218 MPH top speed with 8 ferocious nitrous blasts.',
  },
];

// Quick index lookup
export const BIKES_BY_ID: Record<string, Bike> = Object.fromEntries(
  BIKES.map((b) => [b.id, b])
);

// ============================================================================
// 3. 14 AUTHENTIC AI RIVALS
// ============================================================================

export const AI_RIVALS: AIRival[] = [
  {
    id: 'biff',
    name: 'Biff',
    bikeId: 'panda_600',
    preferredWeapon: 'club',
    aggression: 0.88,
    skill: 0.45,
    speedMultiplier: 0.94,
    personality: 'brawler',
    quotes: {
      preRace: [
        'Eat my dust, wimp!',
        "I'm gonna knock that helmet clean off your shoulders!",
        'Look who decided to donate prize money to the Biff foundation.',
      ],
      winRace: [
        'Told you nobody messes with Biff!',
        'You eat asphalt while I count my cash.',
      ],
      loseRace: [
        'My carburetor choked! Next time you are getting cracked.',
        'Enjoy your lucky win, rookie.',
      ],
      taunt: [
        'Take that, slowpoke!',
        "Here's a wooden headache for ya!",
      ],
      wrecked: [
        'ARRGH! You broke my favorite fender!',
        "I'm gonna grind you to pieces for that!",
      ],
      busted: [
        'Cops got no respect for real street riding!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'panda_600' },
      2: { speedBonusMph: 6, aggressionMultiplier: 1.1, skillMultiplier: 1.1, bikeUpgradeId: 'panda_750', weaponUpgrade: 'club' },
      3: { speedBonusMph: 12, aggressionMultiplier: 1.2, skillMultiplier: 1.2, bikeUpgradeId: 'rat_bike', weaponUpgrade: 'club' },
      4: { speedBonusMph: 18, aggressionMultiplier: 1.25, skillMultiplier: 1.3, bikeUpgradeId: 'capek_850', weaponUpgrade: 'crowbar' },
      5: { speedBonusMph: 24, aggressionMultiplier: 1.3, skillMultiplier: 1.4, bikeUpgradeId: 'banzai_1100', weaponUpgrade: 'crowbar' },
    },
  },

  {
    id: 'natasha',
    name: 'Natasha',
    bikeId: 'kamikaze_250',
    preferredWeapon: 'chain',
    aggression: 0.85,
    skill: 0.72,
    speedMultiplier: 1.02,
    personality: 'aggressive',
    quotes: {
      preRace: [
        "Don't mess with me unless you want tire marks on your face.",
        'Stay out of my apex if you value your skin.',
        'You think you can keep up with a real racer?',
      ],
      winRace: [
        'Predictable. Boys on bikes with no spine.',
        'Class dismissed! Come back when you learn to ride.',
      ],
      loseRace: [
        'Cheap move! We settle this on the next pass.',
        'Next time, the chain does the talking.',
      ],
      taunt: [
        'Taste cold steel!',
        'Too slow to see my tail light!',
      ],
      wrecked: [
        'You pay for that bodywork with your blood!',
      ],
      busted: [
        'Badge or no badge, get your hands off my leather!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'kamikaze_250' },
      2: { speedBonusMph: 7, aggressionMultiplier: 1.1, skillMultiplier: 1.15, bikeUpgradeId: 'kamikaze_400', weaponUpgrade: 'chain' },
      3: { speedBonusMph: 14, aggressionMultiplier: 1.18, skillMultiplier: 1.25, bikeUpgradeId: 'shuriken_800', weaponUpgrade: 'chain' },
      4: { speedBonusMph: 20, aggressionMultiplier: 1.22, skillMultiplier: 1.35, bikeUpgradeId: 'kula_1000', weaponUpgrade: 'chain' },
      5: { speedBonusMph: 26, aggressionMultiplier: 1.28, skillMultiplier: 1.45, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'chain' },
    },
  },

  {
    id: 'slater',
    name: 'Slater',
    bikeId: 'panda_750',
    preferredWeapon: 'fist',
    aggression: 0.68,
    skill: 0.65,
    speedMultiplier: 0.98,
    personality: 'tactical',
    quotes: {
      preRace: [
        'Catch me if you can, rookie!',
        'Just keep it clean and maybe you will survive.',
        'Look at that shiny paint job. Shame if someone clipped it.',
      ],
      winRace: [
        'Too smooth, too slick. See ya at the clubhouse!',
        'Check the rearview mirror, man. Slater reigns.',
      ],
      loseRace: [
        'Nice hustle, but lightning never strikes twice.',
        'You got the jump on me today. Savor it.',
      ],
      taunt: [
        'Watch your flanks!',
        'Need training wheels, buddy?',
      ],
      wrecked: [
        'Whoa! That hurt more than my pride!',
      ],
      busted: [
        'Hey officer, can we talk this over over coffee?',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'panda_750' },
      2: { speedBonusMph: 5, aggressionMultiplier: 1.1, skillMultiplier: 1.1, bikeUpgradeId: 'shuriken_1000', weaponUpgrade: 'club' },
      3: { speedBonusMph: 11, aggressionMultiplier: 1.15, skillMultiplier: 1.2, bikeUpgradeId: 'shuriken_800', weaponUpgrade: 'club' },
      4: { speedBonusMph: 17, aggressionMultiplier: 1.2, skillMultiplier: 1.3, bikeUpgradeId: 'capek_850', weaponUpgrade: 'club' },
      5: { speedBonusMph: 23, aggressionMultiplier: 1.25, skillMultiplier: 1.4, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'crowbar' },
    },
  },

  {
    id: 'ikira',
    name: 'Ikira',
    bikeId: 'banzai_750',
    preferredWeapon: 'fist',
    aggression: 0.52,
    skill: 0.88,
    speedMultiplier: 1.04,
    personality: 'speedster',
    quotes: {
      preRace: [
        'Your speed is lacking. Focus on the road.',
        'Only precision leads to victory.',
        'Control the machine, do not fight it.',
      ],
      winRace: [
        'As expected. Discipline conquers brute force.',
        'The road reveals all weaknesses.',
      ],
      loseRace: [
        'An honorable contest. I must sharpen my technique.',
        'Your acceleration was superior today.',
      ],
      taunt: [
        'You hesitate in the turn.',
        'Smoothness is speed.',
      ],
      wrecked: [
        'A lapse in concentration... unforgivable.',
      ],
      busted: [
        'The law interferes with true mastery.',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'banzai_750' },
      2: { speedBonusMph: 8, aggressionMultiplier: 1.05, skillMultiplier: 1.15, bikeUpgradeId: 'kamikaze_400' },
      3: { speedBonusMph: 15, aggressionMultiplier: 1.1, skillMultiplier: 1.25, bikeUpgradeId: 'shuriken_800' },
      4: { speedBonusMph: 22, aggressionMultiplier: 1.15, skillMultiplier: 1.35, bikeUpgradeId: 'banzai_1100' },
      5: { speedBonusMph: 28, aggressionMultiplier: 1.2, skillMultiplier: 1.45, bikeUpgradeId: 'wild_thing_2000' },
    },
  },

  {
    id: 'pe_no_1',
    name: 'P.E. No. 1',
    bikeId: 'rat_bike',
    preferredWeapon: 'chain',
    aggression: 0.96,
    skill: 0.62,
    speedMultiplier: 1.01,
    personality: 'brawler',
    quotes: {
      preRace: [
        "I'll run you right off the cliff, punk!",
        'Public Enemy Number One takes prisoners to the morgue!',
        'Your bike is mine once you hit the dirt!',
      ],
      winRace: [
        'Ha! Call the coroner for the rest of them!',
        'Nobody survives the Public Enemy!',
      ],
      loseRace: [
        'Keep running! My boys will catch you at the garage!',
        'You just signed your own death warrant!',
      ],
      taunt: [
        'Into the ditch with you!',
        'Say hello to oncoming traffic!',
      ],
      wrecked: [
        'DAMMIT! You will burn for this!',
      ],
      busted: [
        'I ain’t going back to prison without a fight!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'rat_bike' },
      2: { speedBonusMph: 7, aggressionMultiplier: 1.12, skillMultiplier: 1.1, bikeUpgradeId: 'rat_bike', weaponUpgrade: 'chain' },
      3: { speedBonusMph: 14, aggressionMultiplier: 1.2, skillMultiplier: 1.2, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'chain' },
      4: { speedBonusMph: 21, aggressionMultiplier: 1.26, skillMultiplier: 1.3, bikeUpgradeId: 'kula_1000', weaponUpgrade: 'crowbar' },
      5: { speedBonusMph: 27, aggressionMultiplier: 1.32, skillMultiplier: 1.4, bikeUpgradeId: 'banzai_1100', weaponUpgrade: 'crowbar' },
    },
  },

  {
    id: 'viper',
    name: 'Viper',
    bikeId: 'kamikaze_400',
    preferredWeapon: 'crowbar',
    aggression: 0.78,
    skill: 0.75,
    speedMultiplier: 1.01,
    personality: 'tactical',
    quotes: {
      preRace: [
        'Hiss-s-s... watch your back.',
        'One strike is all I need to venomize your day.',
        'You look vulnerable from where I sit.',
      ],
      winRace: [
        'Deadly precision. The venom always works.',
        'Striking from the shadows never fails.',
      ],
      loseRace: [
        'The serpent retreats only to strike harder.',
        'Enjoy your fleeting survival.',
      ],
      taunt: [
        'Feel the strike!',
        'You never saw me coming!',
      ],
      wrecked: [
        'Curse your blind luck!',
      ],
      busted: [
        'Slithered into a patrol trap... blast it.',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'kamikaze_400' },
      2: { speedBonusMph: 6, aggressionMultiplier: 1.1, skillMultiplier: 1.12, bikeUpgradeId: 'kamikaze_400', weaponUpgrade: 'crowbar' },
      3: { speedBonusMph: 13, aggressionMultiplier: 1.18, skillMultiplier: 1.22, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'crowbar' },
      4: { speedBonusMph: 19, aggressionMultiplier: 1.22, skillMultiplier: 1.32, bikeUpgradeId: 'kula_1000', weaponUpgrade: 'crowbar' },
      5: { speedBonusMph: 26, aggressionMultiplier: 1.28, skillMultiplier: 1.42, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'crowbar' },
    },
  },

  {
    id: 'helga',
    name: 'Helga',
    bikeId: 'shuriken_1000',
    preferredWeapon: 'club',
    aggression: 0.90,
    skill: 0.58,
    speedMultiplier: 0.96,
    personality: 'brawler',
    quotes: {
      preRace: [
        'Get out of my way before I flatten you!',
        'Valkyrie fury coming down your neck!',
        'You look fragile, little racer.',
      ],
      winRace: [
        'Crushed beneath Helga’s iron boot!',
        'No man or machine can withstand my charge!',
      ],
      loseRace: [
        'You squeaked by this time! Next race you get hammered!',
        'I will snap your handlebars in two!',
      ],
      taunt: [
        'SIT DOWN!',
        'Crush your bones!',
      ],
      wrecked: [
        'GRAAAAH! Helga will rise and break you!',
      ],
      busted: [
        'I eat police cruisers for breakfast!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'shuriken_1000' },
      2: { speedBonusMph: 6, aggressionMultiplier: 1.1, skillMultiplier: 1.1, bikeUpgradeId: 'rat_bike', weaponUpgrade: 'club' },
      3: { speedBonusMph: 13, aggressionMultiplier: 1.18, skillMultiplier: 1.2, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'crowbar' },
      4: { speedBonusMph: 19, aggressionMultiplier: 1.24, skillMultiplier: 1.3, bikeUpgradeId: 'capek_850', weaponUpgrade: 'crowbar' },
      5: { speedBonusMph: 25, aggressionMultiplier: 1.30, skillMultiplier: 1.38, bikeUpgradeId: 'banzai_1100', weaponUpgrade: 'crowbar' },
    },
  },

  {
    id: 'rude_boy',
    name: 'Rude Boy',
    bikeId: 'panda_600',
    preferredWeapon: 'fist',
    aggression: 0.72,
    skill: 0.60,
    speedMultiplier: 0.97,
    personality: 'unpredictable',
    quotes: {
      preRace: [
        'No respect, mon! Watch the rooster tail!',
        'Rude Boy gonna school you in style!',
        'Ease off before you get the high kick!',
      ],
      winRace: [
        'Big vibes! Rudies take the trophy!',
        'Stylin’ and profilin’ all the way to the bank!',
      ],
      loseRace: [
        'Bad karma on that corner, mon.',
        'Respect the hustle, but revenge is sweet.',
      ],
      taunt: [
        'Take dat kick, rude boy!',
        'Out of rhythm, man!',
      ],
      wrecked: [
        'Mash up my ride?! You crazy?!',
      ],
      busted: [
        'Officer, relax and listen to the bass!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'panda_600' },
      2: { speedBonusMph: 5, aggressionMultiplier: 1.1, skillMultiplier: 1.1, bikeUpgradeId: 'panda_750', weaponUpgrade: 'club' },
      3: { speedBonusMph: 12, aggressionMultiplier: 1.16, skillMultiplier: 1.2, bikeUpgradeId: 'shuriken_800', weaponUpgrade: 'club' },
      4: { speedBonusMph: 18, aggressionMultiplier: 1.22, skillMultiplier: 1.3, bikeUpgradeId: 'capek_850', weaponUpgrade: 'chain' },
      5: { speedBonusMph: 24, aggressionMultiplier: 1.26, skillMultiplier: 1.38, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'chain' },
    },
  },

  {
    id: 'gino',
    name: 'Gino',
    bikeId: 'shuriken_800',
    preferredWeapon: 'club',
    aggression: 0.82,
    skill: 0.70,
    speedMultiplier: 1.01,
    personality: 'aggressive',
    quotes: {
      preRace: [
        'Mamma mia, you think you can pass Gino?!',
        'My redline is pure passion! Move aside!',
        'You touch my bike, I break your knuckles!',
      ],
      winRace: [
        'Bellissimo! Gino is the king of the road!',
        'Nobody out-accelerates Italian fury!',
      ],
      loseRace: [
        'You cut my line! Insulting!',
        'Wait until my cousins hear about this!',
      ],
      taunt: [
        'Arrivederci, amateur!',
        'You brake like my grandmother!',
      ],
      wrecked: [
        'SACRILEGIO! My glorious motorcycle!',
      ],
      busted: [
        'Officer, do you know who my family is?!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'shuriken_800' },
      2: { speedBonusMph: 7, aggressionMultiplier: 1.1, skillMultiplier: 1.12, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'club' },
      3: { speedBonusMph: 14, aggressionMultiplier: 1.18, skillMultiplier: 1.22, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'chain' },
      4: { speedBonusMph: 20, aggressionMultiplier: 1.24, skillMultiplier: 1.32, bikeUpgradeId: 'kula_1000', weaponUpgrade: 'chain' },
      5: { speedBonusMph: 26, aggressionMultiplier: 1.28, skillMultiplier: 1.42, bikeUpgradeId: 'wild_thing_2000', weaponUpgrade: 'chain' },
    },
  },

  {
    id: 'butch',
    name: 'Butch',
    bikeId: 'shuriken_400',
    preferredWeapon: 'club',
    aggression: 0.86,
    skill: 0.48,
    speedMultiplier: 0.93,
    personality: 'brawler',
    quotes: {
      preRace: [
        "I'm gonna turn your bike into scrap metal!",
        'Locker room rules on the asphalt, kid.',
        'Got a fresh wrench for your skull.',
      ],
      winRace: [
        'Pummeled into submission! Who wants next?!',
        'Cash in pocket and grease on knuckles.',
      ],
      loseRace: [
        'You cheated! Bikes ain’t supposed to turn like that!',
        'Catch you in the parking lot, chump.',
      ],
      taunt: [
        'Eat heavy metal!',
        'Bend your forks!',
      ],
      wrecked: [
        'My toolbox is gonna fix you permanently!',
      ],
      busted: [
        'I ain’t cooperating with the law!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'shuriken_400' },
      2: { speedBonusMph: 6, aggressionMultiplier: 1.12, skillMultiplier: 1.1, bikeUpgradeId: 'panda_750', weaponUpgrade: 'club' },
      3: { speedBonusMph: 12, aggressionMultiplier: 1.2, skillMultiplier: 1.18, bikeUpgradeId: 'rat_bike', weaponUpgrade: 'crowbar' },
      4: { speedBonusMph: 18, aggressionMultiplier: 1.26, skillMultiplier: 1.28, bikeUpgradeId: 'capek_850', weaponUpgrade: 'crowbar' },
      5: { speedBonusMph: 24, aggressionMultiplier: 1.30, skillMultiplier: 1.36, bikeUpgradeId: 'banzai_1100', weaponUpgrade: 'crowbar' },
    },
  },

  {
    id: 'sven',
    name: 'Sven',
    bikeId: 'panda_750',
    preferredWeapon: 'fist',
    aggression: 0.60,
    skill: 0.78,
    speedMultiplier: 1.00,
    personality: 'defensive',
    quotes: {
      preRace: [
        'You drive too slow for these roads.',
        'Cold nerves prevail over reckless noise.',
        'Try to push me and see who slides.',
      ],
      winRace: [
        'As predictable as the winter snow.',
        'Methodical riding always yields results.',
      ],
      loseRace: [
        'Impressive pace. I misjudged your traction.',
        'A temporary setback in the standings.',
      ],
      taunt: [
        'Unbalanced.',
        'You drift too wide.',
      ],
      wrecked: [
        'Ice in the veins, fire on the tarmac.',
      ],
      busted: [
        'Order must be respected, but this delay is irritating.',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'panda_750' },
      2: { speedBonusMph: 7, aggressionMultiplier: 1.08, skillMultiplier: 1.15, bikeUpgradeId: 'banzai_750' },
      3: { speedBonusMph: 13, aggressionMultiplier: 1.14, skillMultiplier: 1.25, bikeUpgradeId: 'shuriken_800', weaponUpgrade: 'club' },
      4: { speedBonusMph: 20, aggressionMultiplier: 1.18, skillMultiplier: 1.35, bikeUpgradeId: 'capek_850', weaponUpgrade: 'club' },
      5: { speedBonusMph: 27, aggressionMultiplier: 1.22, skillMultiplier: 1.45, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'club' },
    },
  },

  {
    id: 'tanya',
    name: 'Tanya',
    bikeId: 'kamikaze_250',
    preferredWeapon: 'chain',
    aggression: 0.76,
    skill: 0.74,
    speedMultiplier: 1.02,
    personality: 'tactical',
    quotes: {
      preRace: [
        'Did you forget how to shift gears, slowpoke?',
        'Look nice in my mirrors, stay back there.',
        'I hope you brought a helmet with extra padding.',
      ],
      winRace: [
        'Too easy! Did you guys even leave the start line?',
        'Tanya takes the purse, losers pay the bill.',
      ],
      loseRace: [
        'Enjoy your fifteen seconds of fame.',
        'Next turn I am taking your front wheel with me.',
      ],
      taunt: [
        'Blink and I am gone!',
        'Whip it good!',
      ],
      wrecked: [
        'You are SO going to pay for this!',
      ],
      busted: [
        'Can I talk you out of that ticket, handsome officer?',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'kamikaze_250' },
      2: { speedBonusMph: 7, aggressionMultiplier: 1.1, skillMultiplier: 1.15, bikeUpgradeId: 'kamikaze_400', weaponUpgrade: 'chain' },
      3: { speedBonusMph: 14, aggressionMultiplier: 1.16, skillMultiplier: 1.25, bikeUpgradeId: 'shuriken_800', weaponUpgrade: 'chain' },
      4: { speedBonusMph: 21, aggressionMultiplier: 1.22, skillMultiplier: 1.35, bikeUpgradeId: 'kula_1000', weaponUpgrade: 'chain' },
      5: { speedBonusMph: 27, aggressionMultiplier: 1.28, skillMultiplier: 1.45, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'chain' },
    },
  },

  {
    id: 'spike',
    name: 'Spike',
    bikeId: 'banzai_750',
    preferredWeapon: 'chain',
    aggression: 0.94,
    skill: 0.64,
    speedMultiplier: 1.00,
    personality: 'unpredictable',
    quotes: {
      preRace: [
        'Chaos rules the asphalt!',
        'No speed limits, no mercy, pure anarchy!',
        'Listen to the pipes scream! Blood and throttle!',
      ],
      winRace: [
        'Total devastation! Spike reigns supreme!',
        'Anarchy on two wheels, baby!',
      ],
      loseRace: [
        'The road will eat you eventually, human!',
        'I will burn rubber on your grave!',
      ],
      taunt: [
        'SCREAM FOR ME!',
        'Chain reaction!',
      ],
      wrecked: [
        'HA HA HA! The pain makes me faster!',
      ],
      busted: [
        'Fascist pigs can’t cage the hurricane!',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'banzai_750' },
      2: { speedBonusMph: 7, aggressionMultiplier: 1.12, skillMultiplier: 1.12, bikeUpgradeId: 'rat_bike', weaponUpgrade: 'chain' },
      3: { speedBonusMph: 14, aggressionMultiplier: 1.20, skillMultiplier: 1.22, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'chain' },
      4: { speedBonusMph: 21, aggressionMultiplier: 1.25, skillMultiplier: 1.32, bikeUpgradeId: 'kula_1000', weaponUpgrade: 'chain' },
      5: { speedBonusMph: 28, aggressionMultiplier: 1.30, skillMultiplier: 1.42, bikeUpgradeId: 'wild_thing_2000', weaponUpgrade: 'chain' },
    },
  },

  {
    id: 'diablo',
    name: 'Diablo',
    bikeId: 'diablo_1000',
    preferredWeapon: 'crowbar',
    aggression: 0.92,
    skill: 0.92,
    speedMultiplier: 1.08,
    personality: 'speedster',
    quotes: {
      preRace: [
        'The road belongs to the shadows.',
        'You stare into the abyss of true speed.',
        'Surrender before you ignite.',
      ],
      winRace: [
        'Infernal perfection. As it was written.',
        'None can outrun the devil on two wheels.',
      ],
      loseRace: [
        'A momentary flicker. The flame will consume you next time.',
        'You have earned my attention... and my wrath.',
      ],
      taunt: [
        'Burn in my wake.',
        'Fade into darkness.',
      ],
      wrecked: [
        'A spark extinguished... I shall reignite!',
      ],
      busted: [
        'Mortals cannot shackle this tempest.',
      ],
    },
    levelScaling: {
      1: { speedBonusMph: 0, aggressionMultiplier: 1.0, skillMultiplier: 1.0, bikeUpgradeId: 'diablo_1000' },
      2: { speedBonusMph: 9, aggressionMultiplier: 1.1, skillMultiplier: 1.15, bikeUpgradeId: 'diablo_1000', weaponUpgrade: 'crowbar' },
      3: { speedBonusMph: 16, aggressionMultiplier: 1.18, skillMultiplier: 1.28, bikeUpgradeId: 'capek_850', weaponUpgrade: 'crowbar' },
      4: { speedBonusMph: 24, aggressionMultiplier: 1.24, skillMultiplier: 1.38, bikeUpgradeId: 'corsair_1200', weaponUpgrade: 'crowbar' },
      5: { speedBonusMph: 32, aggressionMultiplier: 1.30, skillMultiplier: 1.50, bikeUpgradeId: 'wild_thing_2000', weaponUpgrade: 'crowbar' },
    },
  },
];

export const AI_RIVALS_BY_ID: Record<string, AIRival> = Object.fromEntries(
  AI_RIVALS.map((r) => [r.id, r])
);

export const AI_RIVALS_BY_NAME: Record<RivalName, AIRival> = Object.fromEntries(
  AI_RIVALS.map((r) => [r.name, r])
) as Record<RivalName, AIRival>;

// ============================================================================
// 4. POLICE PROFILES & ESCALATION
// ============================================================================

export const POLICE_OFFICERS: CopVehicle[] = [
  {
    id: 'oleary',
    name: "Officer O'Leary",
    bikeId: 'panda_750',
    state: 'idle',
    sirenActive: false,
    pursuitSpeedMph: 155,
    fineAmountByLevel: {
      1: 250,
      2: 450,
      3: 750,
      4: 1100,
      5: 1600,
    },
    taunts: [
      'Pull over right now, speed demon!',
      "O'Leary's gonna teach you respect for the California vehicle code!",
      'End of the line, reckless outlaw!',
    ],
  },
  {
    id: 'garcia',
    name: 'Officer Garcia',
    bikeId: 'shuriken_1000',
    state: 'idle',
    sirenActive: false,
    pursuitSpeedMph: 168,
    fineAmountByLevel: {
      1: 300,
      2: 500,
      3: 850,
      4: 1250,
      5: 1800,
    },
    taunts: [
      'Highway Patrol! Kill that engine immediately!',
      'You are facing reckless endangerment and assaulting an officer!',
      'Step off that machine with hands in the air!',
    ],
  },
];

// ============================================================================
// 5. 5 CALIFORNIA TRACK PRESETS & ROAD GEOMETRY
// ============================================================================

export const TRACKS: Record<TrackId, TrackPreset> = {
  sierra_nevada: {
    id: 'sierra_nevada',
    name: 'Sierra Nevada',
    subtitle: 'High Altitude Alpine Mountain Passes',
    musicTrackName: 'Sierra Nevada Anthem',
    lengthMilesByLevel: {
      1: 5.2,
      2: 7.1,
      3: 9.4,
      4: 12.0,
      5: 15.2,
    },
    totalSegmentsByLevel: {
      1: 650,
      2: 880,
      3: 1180,
      4: 1500,
      5: 1900,
    },
    trafficDensityByLevel: {
      1: 0.12,
      2: 0.16,
      3: 0.22,
      4: 0.28,
      5: 0.35,
    },
    copFrequencyByLevel: {
      1: 0.20,
      2: 0.35,
      3: 0.50,
      4: 0.70,
      5: 0.90,
    },
    cashPrizesByLevel: {
      1: [1000, 600, 300],
      2: [1800, 1100, 550],
      3: [3000, 1800, 900],
      4: [4800, 2900, 1400],
      5: [7500, 4500, 2200],
    },
    colors: {
      skyGradientTop: '#103060',
      skyGradientBottom: '#5a84b0',
      distantMountains: '#324866',
      hills: '#1b3d2b',
      grassLight: '#387a3e',
      grassDark: '#2d6132',
      roadLight: '#4a4c54',
      roadDark: '#40424a',
      rumbleLight: '#dce0e6',
      rumbleDark: '#b82e2e',
      laneMarking: '#e5b82e',
      fogColor: '#446482',
      fogDensity: 0.0006,
    },
    geometryPattern: [
      { lengthInSegments: 40, curve: 0, hill: 0 },
      { lengthInSegments: 35, curve: 2.4, hill: 20 },
      { lengthInSegments: 30, curve: -2.8, hill: -15 },
      { lengthInSegments: 45, curve: 0, hill: 35 },
      { lengthInSegments: 35, curve: 3.2, hill: -30 },
      { lengthInSegments: 50, curve: -3.6, hill: 15 },
      { lengthInSegments: 40, curve: 0, hill: 0 },
      { lengthInSegments: 35, curve: 2.0, hill: -25 },
      { lengthInSegments: 45, curve: -2.2, hill: 25 },
      { lengthInSegments: 50, curve: 0, hill: 0 },
    ],
  },

  pacific_coast: {
    id: 'pacific_coast',
    name: 'Pacific Coast',
    subtitle: 'Highway 1 Ocean Bluffs & Coastal Cliffs',
    musicTrackName: 'Pacific Coast Cruise',
    lengthMilesByLevel: {
      1: 5.6,
      2: 7.8,
      3: 10.2,
      4: 13.1,
      5: 16.5,
    },
    totalSegmentsByLevel: {
      1: 700,
      2: 975,
      3: 1275,
      4: 1630,
      5: 2060,
    },
    trafficDensityByLevel: {
      1: 0.15,
      2: 0.20,
      3: 0.26,
      4: 0.32,
      5: 0.40,
    },
    copFrequencyByLevel: {
      1: 0.25,
      2: 0.40,
      3: 0.60,
      4: 0.80,
      5: 1.00,
    },
    cashPrizesByLevel: {
      1: [1100, 650, 320],
      2: [2000, 1200, 600],
      3: [3300, 2000, 1000],
      4: [5200, 3100, 1550],
      5: [8000, 4800, 2400],
    },
    colors: {
      skyGradientTop: '#0b5d9e',
      skyGradientBottom: '#76b8df',
      distantMountains: '#2c4d68',
      hills: '#426b38',
      grassLight: '#3ea349',
      grassDark: '#32823b',
      roadLight: '#464952',
      roadDark: '#3a3d45',
      rumbleLight: '#f0f3f7',
      rumbleDark: '#c22727',
      laneMarking: '#ffffff',
      fogColor: '#689fc2',
      fogDensity: 0.0005,
    },
    geometryPattern: [
      { lengthInSegments: 50, curve: 0, hill: 0 },
      { lengthInSegments: 45, curve: 1.8, hill: 12 },
      { lengthInSegments: 55, curve: -2.1, hill: -10 },
      { lengthInSegments: 40, curve: 3.5, hill: 22 },
      { lengthInSegments: 60, curve: 0, hill: -18 },
      { lengthInSegments: 50, curve: -3.2, hill: 10 },
      { lengthInSegments: 45, curve: 2.6, hill: -8 },
      { lengthInSegments: 70, curve: 0, hill: 0 },
    ],
  },

  redwood_forest: {
    id: 'redwood_forest',
    name: 'Redwood Forest',
    subtitle: 'Towering Canopies & Shadowed Hairpins',
    musicTrackName: 'Redwood Shadows',
    lengthMilesByLevel: {
      1: 5.8,
      2: 8.2,
      3: 10.8,
      4: 13.9,
      5: 17.2,
    },
    totalSegmentsByLevel: {
      1: 725,
      2: 1025,
      3: 1350,
      4: 1740,
      5: 2150,
    },
    trafficDensityByLevel: {
      1: 0.14,
      2: 0.18,
      3: 0.24,
      4: 0.30,
      5: 0.38,
    },
    copFrequencyByLevel: {
      1: 0.20,
      2: 0.35,
      3: 0.55,
      4: 0.75,
      5: 0.95,
    },
    cashPrizesByLevel: {
      1: [1200, 700, 350],
      2: [2200, 1300, 650],
      3: [3600, 2200, 1100],
      4: [5600, 3400, 1700],
      5: [8500, 5100, 2550],
    },
    colors: {
      skyGradientTop: '#0e2a30',
      skyGradientBottom: '#22585c',
      distantMountains: '#163028',
      hills: '#0f2618',
      grassLight: '#24542e',
      grassDark: '#1a4022',
      roadLight: '#36383e',
      roadDark: '#2b2c30',
      rumbleLight: '#c28e27',
      rumbleDark: '#181818',
      laneMarking: '#cfab3a',
      fogColor: '#20453d',
      fogDensity: 0.0009,
    },
    geometryPattern: [
      { lengthInSegments: 35, curve: 0, hill: 0 },
      { lengthInSegments: 40, curve: -3.8, hill: 18 },
      { lengthInSegments: 35, curve: 4.2, hill: -22 },
      { lengthInSegments: 50, curve: -2.5, hill: 28 },
      { lengthInSegments: 40, curve: 3.9, hill: -15 },
      { lengthInSegments: 30, curve: -4.5, hill: 0 },
      { lengthInSegments: 45, curve: 2.0, hill: 16 },
      { lengthInSegments: 50, curve: 0, hill: 0 },
    ],
  },

  palm_desert: {
    id: 'palm_desert',
    name: 'Palm Desert',
    subtitle: 'Blistering Flats & Scorched Salt Basins',
    musicTrackName: 'Desert Sunburn',
    lengthMilesByLevel: {
      1: 5.0,
      2: 6.9,
      3: 9.1,
      4: 11.8,
      5: 14.8,
    },
    totalSegmentsByLevel: {
      1: 625,
      2: 860,
      3: 1140,
      4: 1475,
      5: 1850,
    },
    trafficDensityByLevel: {
      1: 0.16,
      2: 0.22,
      3: 0.28,
      4: 0.36,
      5: 0.44,
    },
    copFrequencyByLevel: {
      1: 0.30,
      2: 0.45,
      3: 0.65,
      4: 0.85,
      5: 1.05,
    },
    cashPrizesByLevel: {
      1: [1000, 600, 300],
      2: [1900, 1150, 575],
      3: [3200, 1900, 950],
      4: [5000, 3000, 1500],
      5: [7800, 4700, 2350],
    },
    colors: {
      skyGradientTop: '#85441d',
      skyGradientBottom: '#d49b5d',
      distantMountains: '#5c2a1a',
      hills: '#824d2d',
      grassLight: '#9e814c',
      grassDark: '#876d3f',
      roadLight: '#54504d',
      roadDark: '#484442',
      rumbleLight: '#d8cca6',
      rumbleDark: '#a83020',
      laneMarking: '#edd9b4',
      fogColor: '#b3824f',
      fogDensity: 0.0004,
    },
    geometryPattern: [
      { lengthInSegments: 70, curve: 0, hill: 0 },
      { lengthInSegments: 35, curve: 1.5, hill: 35 },
      { lengthInSegments: 30, curve: -1.2, hill: -40 },
      { lengthInSegments: 80, curve: 0, hill: 0 },
      { lengthInSegments: 40, curve: -2.4, hill: 25 },
      { lengthInSegments: 75, curve: 0, hill: -20 },
      { lengthInSegments: 35, curve: 2.2, hill: 15 },
      { lengthInSegments: 80, curve: 0, hill: 0 },
    ],
  },

  grass_valley: {
    id: 'grass_valley',
    name: 'Grass Valley',
    subtitle: 'Rolling Foothill Pastures & Farmland',
    musicTrackName: 'Grass Valley Stampede',
    lengthMilesByLevel: {
      1: 4.8,
      2: 6.6,
      3: 8.8,
      4: 11.2,
      5: 14.2,
    },
    totalSegmentsByLevel: {
      1: 600,
      2: 825,
      3: 1100,
      4: 1400,
      5: 1775,
    },
    trafficDensityByLevel: {
      1: 0.12,
      2: 0.16,
      3: 0.22,
      4: 0.28,
      5: 0.36,
    },
    copFrequencyByLevel: {
      1: 0.20,
      2: 0.35,
      3: 0.50,
      4: 0.70,
      5: 0.90,
    },
    cashPrizesByLevel: {
      1: [950, 570, 280],
      2: [1750, 1050, 520],
      3: [2900, 1750, 870],
      4: [4600, 2750, 1370],
      5: [7200, 4300, 2150],
    },
    colors: {
      skyGradientTop: '#1d5ea8',
      skyGradientBottom: '#6faee6',
      distantMountains: '#2a5252',
      hills: '#527038',
      grassLight: '#3da03d',
      grassDark: '#2f782f',
      roadLight: '#46484d',
      roadDark: '#3c3e42',
      rumbleLight: '#e3e3e3',
      rumbleDark: '#bd2d2d',
      laneMarking: '#e0b82b',
      fogColor: '#538ab8',
      fogDensity: 0.0005,
    },
    geometryPattern: [
      { lengthInSegments: 45, curve: 0, hill: 0 },
      { lengthInSegments: 40, curve: 2.0, hill: 25 },
      { lengthInSegments: 35, curve: -2.0, hill: -25 },
      { lengthInSegments: 45, curve: 1.5, hill: 30 },
      { lengthInSegments: 40, curve: -2.5, hill: -30 },
      { lengthInSegments: 50, curve: 2.8, hill: 15 },
      { lengthInSegments: 40, curve: -1.8, hill: -10 },
      { lengthInSegments: 55, curve: 0, hill: 0 },
    ],
  },
};

export const TRACK_IDS: TrackId[] = [
  'sierra_nevada',
  'pacific_coast',
  'redwood_forest',
  'palm_desert',
  'grass_valley',
];

// ============================================================================
// 6. 8-CHAR CLASSIC PASSWORD GENERATOR & DECODER
// ============================================================================

// Base 32 Alphabet omitting confusing characters (0, O, 1, I)
const PASSWORD_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Encodes career state into an authentic 8-character password.
 * Pack format:
 * - Level (1-5): 3 bits
 * - Bike Index (0-14): 4 bits
 * - Cash units ($50 increments, max $65,535 = 1310 units): 11 bits
 * - Qualified tracks mask (5 bits for 5 tracks): 5 bits
 * - Checksum: 7 bits
 * Total = 30 bits -> 6 base-32 characters, padded with 2 verification chars = 8 chars.
 */
export function encodePassword(career: CareerProgress): string {
  const levelVal = Math.min(Math.max(career.level, 1), 5) - 1; // 0..4 (3 bits)
  const bikeIdx = Math.max(0, BIKES.findIndex((b) => b.id === career.currentBikeId)); // 0..14 (4 bits)
  const cashUnits = Math.min(2047, Math.floor(career.cash / 50)); // 11 bits (up to $102,350)

  // Track qualification bitmask (5 tracks: bits 0..4)
  let trackMask = 0;
  TRACK_IDS.forEach((id, idx) => {
    if (career.trackProgress[id]?.qualified) {
      trackMask |= 1 << idx;
    }
  });

  // Calculate 7-bit checksum
  const rawSum = (levelVal * 31 + bikeIdx * 17 + cashUnits * 7 + trackMask * 13) & 0x7f;

  // Construct 30-bit integer
  // [level: 3][bike: 4][trackMask: 5][cashUnits: 11][checksum: 7] = 30 bits
  let packed = BigInt(0);
  packed |= BigInt(levelVal & 0x07) << 27n;
  packed |= BigInt(bikeIdx & 0x0f) << 23n;
  packed |= BigInt(trackMask & 0x1f) << 18n;
  packed |= BigInt(cashUnits & 0x7ff) << 7n;
  packed |= BigInt(rawSum & 0x7f);

  // Convert to 6 base-32 characters
  let baseStr = '';
  let temp = packed;
  for (let i = 0; i < 6; i++) {
    const rem = Number(temp & 0x1fn);
    baseStr = PASSWORD_ALPHABET[rem] + baseStr;
    temp >>= 5n;
  }

  // Salt/obfuscate two tail characters for integrity check
  const char1Val = PASSWORD_ALPHABET.indexOf(baseStr[0]);
  const char2Val = PASSWORD_ALPHABET.indexOf(baseStr[1]);
  const tail1 = PASSWORD_ALPHABET[(char1Val + rawSum) % 32];
  const tail2 = PASSWORD_ALPHABET[(char2Val + levelVal * 5 + bikeIdx) % 32];

  return `${baseStr}${tail1}${tail2}`;
}

/**
 * Decodes an 8-character classic password into career parameters.
 */
export function decodePassword(password: string): DecodedPassword {
  const clean = password.trim().toUpperCase().replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '');
  if (clean.length !== 8) {
    return { valid: false, level: 1, bikeIndex: 0, cash: 1000, tracksQualifiedBits: 0 };
  }

  const base6 = clean.substring(0, 6);
  const tail1 = clean[6];
  const tail2 = clean[7];

  let packed = BigInt(0);
  for (let i = 0; i < 6; i++) {
    const val = PASSWORD_ALPHABET.indexOf(base6[i]);
    if (val === -1) return { valid: false, level: 1, bikeIndex: 0, cash: 1000, tracksQualifiedBits: 0 };
    packed = (packed << 5n) | BigInt(val);
  }

  const checksum = Number(packed & 0x7fn);
  const cashUnits = Number((packed >> 7n) & 0x7ffn);
  const trackMask = Number((packed >> 18n) & 0x1fn);
  const bikeIdx = Number((packed >> 23n) & 0x0fn);
  const levelVal = Number((packed >> 27n) & 0x07n);

  // Validate internal checksum
  const expectedChecksum = (levelVal * 31 + bikeIdx * 17 + cashUnits * 7 + trackMask * 13) & 0x7f;
  if (checksum !== expectedChecksum) {
    return { valid: false, level: 1, bikeIndex: 0, cash: 1000, tracksQualifiedBits: 0 };
  }

  // Validate tail characters
  const char1Val = PASSWORD_ALPHABET.indexOf(base6[0]);
  const char2Val = PASSWORD_ALPHABET.indexOf(base6[1]);
  const expectedTail1 = PASSWORD_ALPHABET[(char1Val + checksum) % 32];
  const expectedTail2 = PASSWORD_ALPHABET[(char2Val + levelVal * 5 + bikeIdx) % 32];

  if (tail1 !== expectedTail1 || tail2 !== expectedTail2) {
    return { valid: false, level: 1, bikeIndex: 0, cash: 1000, tracksQualifiedBits: 0 };
  }

  const level = (Math.min(Math.max(levelVal + 1, 1), 5)) as ChampionshipLevel;
  const cash = cashUnits * 50;

  return {
    valid: true,
    level,
    bikeIndex: Math.min(bikeIdx, BIKES.length - 1),
    cash,
    tracksQualifiedBits: trackMask,
  };
}

// ============================================================================
// 7. CAREER PERSISTENCE HELPERS (LOCALSTORAGE)
// ============================================================================

export const LOCAL_STORAGE_CAREER_KEY = 'road_rash_genesis_career_v1';

export function createInitialCareer(): CareerProgress {
  const initialTrackProgress: Record<TrackId, { trackId: TrackId; qualified: boolean; bestPlace: number; bestTimeMs: number; prizeMoneyWon: number }> = {
    sierra_nevada: { trackId: 'sierra_nevada', qualified: false, bestPlace: 0, bestTimeMs: 0, prizeMoneyWon: 0 },
    pacific_coast: { trackId: 'pacific_coast', qualified: false, bestPlace: 0, bestTimeMs: 0, prizeMoneyWon: 0 },
    redwood_forest: { trackId: 'redwood_forest', qualified: false, bestPlace: 0, bestTimeMs: 0, prizeMoneyWon: 0 },
    palm_desert: { trackId: 'palm_desert', qualified: false, bestPlace: 0, bestTimeMs: 0, prizeMoneyWon: 0 },
    grass_valley: { trackId: 'grass_valley', qualified: false, bestPlace: 0, bestTimeMs: 0, prizeMoneyWon: 0 },
  };

  const initialCareer: CareerProgress = {
    level: 1,
    cash: 1000,
    currentBikeId: 'shuriken_400',
    ownedBikeIds: ['shuriken_400'],
    trackProgress: initialTrackProgress,
    totalRacesWon: 0,
    totalKnockouts: 0,
    totalArrests: 0,
    totalWrecks: 0,
    password: '',
  };

  initialCareer.password = encodePassword(initialCareer);
  return initialCareer;
}

export function saveCareerToStorage(career: CareerProgress): void {
  try {
    career.password = encodePassword(career);
    localStorage.setItem(LOCAL_STORAGE_CAREER_KEY, JSON.stringify(career));
  } catch (err) {
    console.warn('Failed to save career progress to localStorage:', err);
  }
}

export function loadCareerFromStorage(): CareerProgress {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CAREER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CareerProgress;
      if (parsed && parsed.level && parsed.cash !== undefined && parsed.currentBikeId) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load career from localStorage, using initial state:', err);
  }
  return createInitialCareer();
}
