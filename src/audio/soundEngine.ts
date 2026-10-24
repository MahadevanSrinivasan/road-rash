/**
 * Road Rash (1991 Sega Genesis) - FM Synth & PSG Web Audio Engine
 *
 * Emulates the gritty Yamaha YM2612 (OPN2) 6-channel FM synthesizer and
 * Texas Instruments SN76489 PSG sound chip with 9-bit DAC ladder distortion.
 * Features procedural Rob Hubbard style rock/metal music tracks, dynamic
 * 5-gear motorcycle engine combustion synthesis, police pursuit siren,
 * combat impacts, crash destruction, and arcade UI sound effects.
 *
 * Gracefully no-ops in headless and test environments without Web Audio API.
 */

import { WeaponType, TrackId } from '../types';

export type MusicTrackKey = TrackId | 'title' | 'victory' | 'wrecked' | 'busted';

// ============================================================================
// 1. FM SYNTH & INSTRUMENT DEFINITIONS
// ============================================================================

export interface FMVoiceParams {
  carrierWave: OscillatorType;
  modulatorWave: OscillatorType;
  modRatio: number;
  modDepth: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  useDistortion?: boolean;
}

export const INSTRUMENT_PRESETS: Record<string, FMVoiceParams> = {
  slapBass: {
    carrierWave: 'sawtooth',
    modulatorWave: 'sine',
    modRatio: 1.0,
    modDepth: 1.8,
    attack: 0.005,
    decay: 0.14,
    sustain: 0.22,
    release: 0.08,
    useDistortion: true,
  },
  metalGuitar: {
    carrierWave: 'sawtooth',
    modulatorWave: 'sawtooth',
    modRatio: 2.0,
    modDepth: 2.4,
    attack: 0.01,
    decay: 0.18,
    sustain: 0.65,
    release: 0.12,
    useDistortion: true,
  },
  rockLead: {
    carrierWave: 'sawtooth',
    modulatorWave: 'sine',
    modRatio: 3.0,
    modDepth: 1.6,
    attack: 0.015,
    decay: 0.22,
    sustain: 0.7,
    release: 0.18,
    useDistortion: true,
  },
  fmBrass: {
    carrierWave: 'sawtooth',
    modulatorWave: 'sine',
    modRatio: 1.0,
    modDepth: 2.2,
    attack: 0.035,
    decay: 0.2,
    sustain: 0.55,
    release: 0.2,
    useDistortion: false,
  },
  psgSquare: {
    carrierWave: 'square',
    modulatorWave: 'sine',
    modRatio: 1.0,
    modDepth: 0.0,
    attack: 0.003,
    decay: 0.08,
    sustain: 0.45,
    release: 0.06,
    useDistortion: false,
  },
  cleanGuitar: {
    carrierWave: 'triangle',
    modulatorWave: 'sine',
    modRatio: 2.0,
    modDepth: 0.8,
    attack: 0.008,
    decay: 0.25,
    sustain: 0.35,
    release: 0.15,
    useDistortion: false,
  },
};

// ============================================================================
// 2. NOTE & FREQUENCY UTILITIES
// ============================================================================

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
};

export function noteToFreq(note: string | number): number {
  if (typeof note === 'number') {
    if (note <= 0) return 0;
    if (note < 128) {
      return 440 * Math.pow(2, (note - 69) / 12);
    }
    return note;
  }

  if (!note || note === '-' || note === 'rest') return 0;

  const match = note.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return 0;

  const pitchName = match[1];
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_SEMITONES[pitchName];
  if (semitone === undefined) return 0;

  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ============================================================================
// 3. MUSIC SEQUENCE DEFINITIONS
// ============================================================================

export type DrumType = 'kick' | 'snare' | 'hat' | 'openHat' | 'crash';

export interface NoteEvent {
  step: number;
  note?: string | number;
  dur?: number;
  velocity?: number;
  slap?: boolean;
}

export interface ChordEvent {
  step: number;
  chord: (string | number)[];
  dur?: number;
  velocity?: number;
}

export interface DrumEvent {
  step: number;
  type: DrumType;
  velocity?: number;
}

export interface TrackComposition {
  key: MusicTrackKey;
  name: string;
  bpm: number;
  lengthSteps: number;
  loop: boolean;
  leadVoice: string;
  bass: NoteEvent[];
  rhythm: ChordEvent[];
  lead: NoteEvent[];
  drums: DrumEvent[];
}

// ----------------------------------------------------------------------------
// 3.1 TRACK 1: TITLE - Heavy Metal Power-Chord & Slap-Bass Main Theme
// ----------------------------------------------------------------------------
const TRACK_TITLE: TrackComposition = {
  key: 'title',
  name: 'Road Rash Main Theme',
  bpm: 138,
  lengthSteps: 32,
  loop: true,
  leadVoice: 'rockLead',
  bass: [
    { step: 0, note: 'E1', dur: 1.5, slap: true },
    { step: 2, note: 'E2', dur: 1.0, slap: true },
    { step: 3, note: 'E1', dur: 1.0 },
    { step: 4, note: 'G1', dur: 1.5, slap: true },
    { step: 6, note: 'E1', dur: 1.0 },
    { step: 7, note: 'E1', dur: 1.0 },
    { step: 8, note: 'A1', dur: 1.5, slap: true },
    { step: 10, note: 'Bb1', dur: 1.5, slap: true },
    { step: 12, note: 'A1', dur: 1.5, slap: true },
    { step: 14, note: 'G1', dur: 1.5 },
    { step: 16, note: 'E1', dur: 1.5, slap: true },
    { step: 18, note: 'E2', dur: 1.0, slap: true },
    { step: 19, note: 'E1', dur: 1.0 },
    { step: 20, note: 'D1', dur: 1.5, slap: true },
    { step: 22, note: 'E1', dur: 1.0 },
    { step: 23, note: 'E1', dur: 1.0 },
    { step: 24, note: 'G1', dur: 1.5, slap: true },
    { step: 26, note: 'A1', dur: 1.5, slap: true },
    { step: 28, note: 'B1', dur: 1.5, slap: true },
    { step: 30, note: 'D2', dur: 1.5, slap: true },
  ],
  rhythm: [
    { step: 0, chord: ['E3', 'B3', 'E4'], dur: 1.5 },
    { step: 2, chord: ['E3', 'B3', 'E4'], dur: 1.0 },
    { step: 4, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 6, chord: ['E3', 'B3', 'E4'], dur: 1.5 },
    { step: 8, chord: ['A3', 'E4', 'A4'], dur: 1.5 },
    { step: 10, chord: ['Bb3', 'F4', 'Bb4'], dur: 1.5 },
    { step: 12, chord: ['A3', 'E4', 'A4'], dur: 1.5 },
    { step: 14, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 16, chord: ['E3', 'B3', 'E4'], dur: 1.5 },
    { step: 18, chord: ['E3', 'B3', 'E4'], dur: 1.0 },
    { step: 20, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 22, chord: ['E3', 'B3', 'E4'], dur: 1.5 },
    { step: 24, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 26, chord: ['A3', 'E4', 'A4'], dur: 1.5 },
    { step: 28, chord: ['B3', 'F#4', 'B4'], dur: 1.5 },
    { step: 30, chord: ['D4', 'A4', 'D5'], dur: 1.5 },
  ],
  lead: [
    { step: 0, note: 'E4', dur: 2.0 },
    { step: 3, note: 'G4', dur: 1.0 },
    { step: 4, note: 'E4', dur: 2.0 },
    { step: 7, note: 'G4', dur: 1.0 },
    { step: 8, note: 'A4', dur: 2.0 },
    { step: 10, note: 'Bb4', dur: 1.5 },
    { step: 12, note: 'A4', dur: 1.5 },
    { step: 14, note: 'G4', dur: 2.0 },
    { step: 16, note: 'E5', dur: 2.0 },
    { step: 19, note: 'D5', dur: 1.0 },
    { step: 20, note: 'B4', dur: 2.0 },
    { step: 23, note: 'G4', dur: 1.0 },
    { step: 24, note: 'A4', dur: 1.5 },
    { step: 26, note: 'B4', dur: 1.5 },
    { step: 28, note: 'D5', dur: 1.5 },
    { step: 30, note: 'E5', dur: 2.0 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    { step: 0, type: 'kick' },
    { step: 2, type: 'hat' },
    { step: 3, type: 'kick' },
    { step: 4, type: 'snare' },
    { step: 6, type: 'kick' },
    { step: 6, type: 'hat' },
    { step: 8, type: 'kick' },
    { step: 10, type: 'hat' },
    { step: 11, type: 'kick' },
    { step: 12, type: 'snare' },
    { step: 14, type: 'openHat' },
    { step: 14, type: 'kick' },
    { step: 16, type: 'kick' },
    { step: 18, type: 'hat' },
    { step: 19, type: 'kick' },
    { step: 20, type: 'snare' },
    { step: 22, type: 'kick' },
    { step: 22, type: 'hat' },
    { step: 24, type: 'kick' },
    { step: 26, type: 'hat' },
    { step: 27, type: 'kick' },
    { step: 28, type: 'snare' },
    { step: 30, type: 'openHat' },
    { step: 30, type: 'kick' },
  ],
};

// ----------------------------------------------------------------------------
// 3.2 TRACK 2: SIERRA NEVADA - Driving Alpine Hard Rock Anthem
// ----------------------------------------------------------------------------
const TRACK_SIERRA_NEVADA: TrackComposition = {
  key: 'sierra_nevada',
  name: 'Sierra Nevada Anthem',
  bpm: 148,
  lengthSteps: 64,
  loop: true,
  leadVoice: 'rockLead',
  bass: [
    // Am gallop (steps 0-15)
    { step: 0, note: 'A1', dur: 1.0 },
    { step: 1, note: 'A1', dur: 1.0 },
    { step: 2, note: 'A2', dur: 1.0, slap: true },
    { step: 3, note: 'A1', dur: 1.0 },
    { step: 4, note: 'A1', dur: 1.0 },
    { step: 5, note: 'A1', dur: 1.0 },
    { step: 6, note: 'A2', dur: 1.0, slap: true },
    { step: 7, note: 'A1', dur: 1.0 },
    { step: 8, note: 'A1', dur: 1.0 },
    { step: 9, note: 'A1', dur: 1.0 },
    { step: 10, note: 'A2', dur: 1.0, slap: true },
    { step: 11, note: 'A1', dur: 1.0 },
    { step: 12, note: 'C2', dur: 1.0 },
    { step: 14, note: 'D2', dur: 1.0 },
    // F gallop (steps 16-31)
    { step: 16, note: 'F1', dur: 1.0 },
    { step: 17, note: 'F1', dur: 1.0 },
    { step: 18, note: 'F2', dur: 1.0, slap: true },
    { step: 19, note: 'F1', dur: 1.0 },
    { step: 20, note: 'F1', dur: 1.0 },
    { step: 21, note: 'F1', dur: 1.0 },
    { step: 22, note: 'F2', dur: 1.0, slap: true },
    { step: 23, note: 'F1', dur: 1.0 },
    { step: 24, note: 'F1', dur: 1.0 },
    { step: 26, note: 'G1', dur: 1.0 },
    { step: 28, note: 'A1', dur: 1.0 },
    { step: 30, note: 'B1', dur: 1.0 },
    // C gallop (steps 32-47)
    { step: 32, note: 'C2', dur: 1.0 },
    { step: 33, note: 'C2', dur: 1.0 },
    { step: 34, note: 'C3', dur: 1.0, slap: true },
    { step: 35, note: 'C2', dur: 1.0 },
    { step: 36, note: 'C2', dur: 1.0 },
    { step: 37, note: 'C2', dur: 1.0 },
    { step: 38, note: 'C3', dur: 1.0, slap: true },
    { step: 39, note: 'C2', dur: 1.0 },
    { step: 40, note: 'C2', dur: 1.0 },
    { step: 42, note: 'D2', dur: 1.0 },
    { step: 44, note: 'E2', dur: 1.0 },
    { step: 46, note: 'G2', dur: 1.0 },
    // G gallop (steps 48-63)
    { step: 48, note: 'G1', dur: 1.0 },
    { step: 49, note: 'G1', dur: 1.0 },
    { step: 50, note: 'G2', dur: 1.0, slap: true },
    { step: 51, note: 'G1', dur: 1.0 },
    { step: 52, note: 'G1', dur: 1.0 },
    { step: 54, note: 'G2', dur: 1.0, slap: true },
    { step: 56, note: 'E1', dur: 1.0 },
    { step: 58, note: 'F1', dur: 1.0 },
    { step: 60, note: 'G1', dur: 1.0 },
    { step: 62, note: 'G#1', dur: 1.0 },
  ],
  rhythm: [
    { step: 0, chord: ['A3', 'E4', 'A4'], dur: 3.0 },
    { step: 4, chord: ['A3', 'E4', 'A4'], dur: 3.0 },
    { step: 8, chord: ['A3', 'E4', 'A4'], dur: 3.0 },
    { step: 12, chord: ['C4', 'G4', 'C5'], dur: 3.0 },
    { step: 16, chord: ['F3', 'C4', 'F4'], dur: 3.0 },
    { step: 20, chord: ['F3', 'C4', 'F4'], dur: 3.0 },
    { step: 24, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 28, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 32, chord: ['C3', 'G3', 'C4'], dur: 3.0 },
    { step: 36, chord: ['C3', 'G3', 'C4'], dur: 3.0 },
    { step: 40, chord: ['D3', 'A3', 'D4'], dur: 3.0 },
    { step: 44, chord: ['E3', 'B3', 'E4'], dur: 3.0 },
    { step: 48, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 52, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 56, chord: ['E3', 'B3', 'E4'], dur: 3.0 },
    { step: 60, chord: ['E3', 'G#3', 'E4'], dur: 3.0 },
  ],
  lead: [
    { step: 0, note: 'E5', dur: 3.0 },
    { step: 4, note: 'A5', dur: 3.0 },
    { step: 8, note: 'G5', dur: 2.0 },
    { step: 11, note: 'E5', dur: 1.5 },
    { step: 14, note: 'D5', dur: 2.0 },
    { step: 16, note: 'F5', dur: 3.0 },
    { step: 20, note: 'E5', dur: 2.0 },
    { step: 23, note: 'D5', dur: 1.5 },
    { step: 26, note: 'C5', dur: 2.0 },
    { step: 29, note: 'B4', dur: 2.0 },
    { step: 32, note: 'G5', dur: 3.0 },
    { step: 36, note: 'E5', dur: 2.0 },
    { step: 39, note: 'C5', dur: 2.0 },
    { step: 43, note: 'D5', dur: 3.0 },
    { step: 48, note: 'B4', dur: 2.5 },
    { step: 52, note: 'D5', dur: 2.0 },
    { step: 56, note: 'E5', dur: 2.0 },
    { step: 60, note: 'G#5', dur: 3.0 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    ...Array.from({ length: 16 }, (_, i) => [
      { step: i * 4, type: 'kick' as DrumType },
      { step: i * 4 + 1, type: 'hat' as DrumType },
      { step: i * 4 + 2, type: 'snare' as DrumType },
      { step: i * 4 + 3, type: 'hat' as DrumType },
    ]).flat(),
  ],
};

// ----------------------------------------------------------------------------
// 3.3 TRACK 3: PACIFIC COAST - Upbeat Coastal Speed-Rock Groove
// ----------------------------------------------------------------------------
const TRACK_PACIFIC_COAST: TrackComposition = {
  key: 'pacific_coast',
  name: 'Pacific Coast Cruise',
  bpm: 154,
  lengthSteps: 64,
  loop: true,
  leadVoice: 'rockLead',
  bass: [
    // D groove
    { step: 0, note: 'D2', dur: 1.5, slap: true },
    { step: 2, note: 'D3', dur: 1.0, slap: true },
    { step: 3, note: 'D2', dur: 1.0 },
    { step: 4, note: 'F#2', dur: 1.5 },
    { step: 6, note: 'G2', dur: 1.0 },
    { step: 8, note: 'A2', dur: 1.5, slap: true },
    { step: 10, note: 'C3', dur: 1.0 },
    { step: 12, note: 'D3', dur: 1.5, slap: true },
    { step: 14, note: 'C3', dur: 1.0 },
    // C groove
    { step: 16, note: 'C2', dur: 1.5, slap: true },
    { step: 18, note: 'C3', dur: 1.0, slap: true },
    { step: 19, note: 'C2', dur: 1.0 },
    { step: 20, note: 'E2', dur: 1.5 },
    { step: 22, note: 'G2', dur: 1.0 },
    { step: 24, note: 'A2', dur: 1.5, slap: true },
    { step: 26, note: 'Bb2', dur: 1.0 },
    { step: 28, note: 'C3', dur: 1.5, slap: true },
    { step: 30, note: 'Bb2', dur: 1.0 },
    // G groove
    { step: 32, note: 'G1', dur: 1.5, slap: true },
    { step: 34, note: 'G2', dur: 1.0, slap: true },
    { step: 35, note: 'G1', dur: 1.0 },
    { step: 36, note: 'B1', dur: 1.5 },
    { step: 38, note: 'C2', dur: 1.0 },
    { step: 40, note: 'D2', dur: 1.5, slap: true },
    { step: 42, note: 'F2', dur: 1.0 },
    { step: 44, note: 'G2', dur: 1.5, slap: true },
    { step: 46, note: 'F2', dur: 1.0 },
    // Turnaround to D
    { step: 48, note: 'D2', dur: 1.5, slap: true },
    { step: 50, note: 'D3', dur: 1.0, slap: true },
    { step: 52, note: 'C3', dur: 1.0 },
    { step: 54, note: 'D3', dur: 1.5 },
    { step: 56, note: 'A1', dur: 1.0 },
    { step: 58, note: 'C2', dur: 1.0 },
    { step: 60, note: 'C#2', dur: 1.0 },
    { step: 62, note: 'E2', dur: 1.0 },
  ],
  rhythm: [
    { step: 0, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 3, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 6, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 10, chord: ['F#3', 'C#4', 'F#4'], dur: 1.5 },
    { step: 14, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 16, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 19, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 22, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 26, chord: ['E3', 'B3', 'E4'], dur: 1.5 },
    { step: 30, chord: ['F3', 'C4', 'F4'], dur: 1.5 },
    { step: 32, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 35, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 38, chord: ['G3', 'D4', 'G4'], dur: 1.5 },
    { step: 42, chord: ['B3', 'F#4', 'B4'], dur: 1.5 },
    { step: 46, chord: ['C4', 'G4', 'C5'], dur: 1.5 },
    { step: 48, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 52, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 56, chord: ['A3', 'E4', 'A4'], dur: 1.5 },
    { step: 60, chord: ['A3', 'C#4', 'E4'], dur: 2.0 },
  ],
  lead: [
    { step: 0, note: 'F#4', dur: 1.5 },
    { step: 2, note: 'A4', dur: 1.5 },
    { step: 4, note: 'D5', dur: 2.5 },
    { step: 8, note: 'C#5', dur: 1.5 },
    { step: 10, note: 'D5', dur: 1.5 },
    { step: 12, note: 'E5', dur: 1.5 },
    { step: 14, note: 'F#5', dur: 2.0 },
    { step: 16, note: 'E5', dur: 2.5 },
    { step: 20, note: 'C5', dur: 2.0 },
    { step: 24, note: 'G4', dur: 2.0 },
    { step: 28, note: 'C5', dur: 2.0 },
    { step: 32, note: 'B4', dur: 2.0 },
    { step: 36, note: 'D5', dur: 2.0 },
    { step: 40, note: 'G5', dur: 2.5 },
    { step: 44, note: 'F#5', dur: 2.0 },
    { step: 48, note: 'D5', dur: 2.5 },
    { step: 52, note: 'A4', dur: 2.0 },
    { step: 56, note: 'C5', dur: 2.0 },
    { step: 60, note: 'C#5', dur: 2.5 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    ...Array.from({ length: 32 }, (_, i) => [
      { step: i * 2, type: (i % 2 === 0 ? 'kick' : 'snare') as DrumType },
      { step: i * 2 + 1, type: (i % 4 === 3 ? 'openHat' : 'hat') as DrumType },
    ]).flat(),
  ],
};

// ----------------------------------------------------------------------------
// 3.4 TRACK 4: REDWOOD FOREST - Dark Minor-Key Bassline & Shred Lead
// ----------------------------------------------------------------------------
const TRACK_REDWOOD_FOREST: TrackComposition = {
  key: 'redwood_forest',
  name: 'Redwood Shadows',
  bpm: 160,
  lengthSteps: 64,
  loop: true,
  leadVoice: 'rockLead',
  bass: [
    // B minor / Phrygian relentless thrash
    { step: 0, note: 'B1', dur: 1.0 },
    { step: 1, note: 'B1', dur: 1.0 },
    { step: 2, note: 'D2', dur: 1.0, slap: true },
    { step: 3, note: 'B1', dur: 1.0 },
    { step: 4, note: 'F#1', dur: 1.0 },
    { step: 5, note: 'B1', dur: 1.0 },
    { step: 6, note: 'G1', dur: 1.0 },
    { step: 7, note: 'B1', dur: 1.0 },
    { step: 8, note: 'B1', dur: 1.0 },
    { step: 9, note: 'B1', dur: 1.0 },
    { step: 10, note: 'D2', dur: 1.0, slap: true },
    { step: 11, note: 'B1', dur: 1.0 },
    { step: 12, note: 'F#1', dur: 1.0 },
    { step: 14, note: 'A1', dur: 1.0 },
    // G minor section
    { step: 16, note: 'G1', dur: 1.0 },
    { step: 17, note: 'G1', dur: 1.0 },
    { step: 18, note: 'B1', dur: 1.0, slap: true },
    { step: 19, note: 'G1', dur: 1.0 },
    { step: 20, note: 'D1', dur: 1.0 },
    { step: 22, note: 'F#1', dur: 1.0 },
    { step: 24, note: 'G1', dur: 1.0 },
    { step: 26, note: 'A1', dur: 1.0 },
    { step: 28, note: 'Bb1', dur: 1.0 },
    { step: 30, note: 'B1', dur: 1.0 },
    // A minor section
    { step: 32, note: 'A1', dur: 1.0 },
    { step: 33, note: 'A1', dur: 1.0 },
    { step: 34, note: 'C#2', dur: 1.0, slap: true },
    { step: 35, note: 'A1', dur: 1.0 },
    { step: 36, note: 'E1', dur: 1.0 },
    { step: 38, note: 'G1', dur: 1.0 },
    { step: 40, note: 'A1', dur: 1.0 },
    { step: 42, note: 'C2', dur: 1.0 },
    { step: 44, note: 'D2', dur: 1.0 },
    { step: 46, note: 'E2', dur: 1.0 },
    // F# dominant / Phrygian tension
    { step: 48, note: 'F#1', dur: 1.0 },
    { step: 49, note: 'F#1', dur: 1.0 },
    { step: 50, note: 'A#1', dur: 1.0, slap: true },
    { step: 51, note: 'F#1', dur: 1.0 },
    { step: 52, note: 'C#1', dur: 1.0 },
    { step: 54, note: 'E1', dur: 1.0 },
    { step: 56, note: 'F#1', dur: 1.0 },
    { step: 58, note: 'G1', dur: 1.0 },
    { step: 60, note: 'A#1', dur: 1.0 },
    { step: 62, note: 'C#2', dur: 1.0 },
  ],
  rhythm: [
    { step: 0, chord: ['B2', 'F#3', 'B3'], dur: 2.0 },
    { step: 4, chord: ['B2', 'F#3', 'B3'], dur: 2.0 },
    { step: 8, chord: ['B2', 'F#3', 'B3'], dur: 2.0 },
    { step: 12, chord: ['D3', 'A3', 'D4'], dur: 2.0 },
    { step: 16, chord: ['G2', 'D3', 'G3'], dur: 2.0 },
    { step: 20, chord: ['G2', 'D3', 'G3'], dur: 2.0 },
    { step: 24, chord: ['G2', 'D3', 'G3'], dur: 2.0 },
    { step: 28, chord: ['Bb2', 'F3', 'Bb3'], dur: 2.0 },
    { step: 32, chord: ['A2', 'E3', 'A3'], dur: 2.0 },
    { step: 36, chord: ['A2', 'E3', 'A3'], dur: 2.0 },
    { step: 40, chord: ['C3', 'G3', 'C4'], dur: 2.0 },
    { step: 44, chord: ['D3', 'A3', 'D4'], dur: 2.0 },
    { step: 48, chord: ['F#2', 'C#3', 'F#3'], dur: 2.0 },
    { step: 52, chord: ['F#2', 'C#3', 'F#3'], dur: 2.0 },
    { step: 56, chord: ['G2', 'D3', 'G3'], dur: 2.0 },
    { step: 60, chord: ['F#2', 'A#2', 'C#3'], dur: 2.5 },
  ],
  lead: [
    // Fast neo-classical arpeggio shred
    { step: 0, note: 'B4', dur: 1.0 },
    { step: 2, note: 'D5', dur: 1.0 },
    { step: 4, note: 'F#5', dur: 1.0 },
    { step: 6, note: 'B5', dur: 1.5 },
    { step: 8, note: 'A5', dur: 1.0 },
    { step: 10, note: 'F#5', dur: 1.0 },
    { step: 12, note: 'D5', dur: 1.0 },
    { step: 14, note: 'C#5', dur: 1.0 },
    { step: 16, note: 'G5', dur: 1.0 },
    { step: 18, note: 'B5', dur: 1.0 },
    { step: 20, note: 'D6', dur: 1.5 },
    { step: 22, note: 'B5', dur: 1.0 },
    { step: 24, note: 'A5', dur: 1.0 },
    { step: 26, note: 'G5', dur: 1.0 },
    { step: 28, note: 'F#5', dur: 1.0 },
    { step: 30, note: 'E5', dur: 1.0 },
    { step: 32, note: 'A5', dur: 1.0 },
    { step: 34, note: 'C#6', dur: 1.0 },
    { step: 36, note: 'E6', dur: 1.5 },
    { step: 38, note: 'C#6', dur: 1.0 },
    { step: 40, note: 'B5', dur: 1.0 },
    { step: 42, note: 'A5', dur: 1.0 },
    { step: 44, note: 'G5', dur: 1.0 },
    { step: 46, note: 'F#5', dur: 1.0 },
    { step: 48, note: 'F#5', dur: 1.0 },
    { step: 50, note: 'A#5', dur: 1.0 },
    { step: 52, note: 'C#6', dur: 1.0 },
    { step: 54, note: 'E6', dur: 1.0 },
    { step: 56, note: 'F#6', dur: 2.0 },
    { step: 60, note: 'C#6', dur: 2.0 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    ...Array.from({ length: 32 }, (_, i) => [
      { step: i * 2, type: 'kick' as DrumType },
      { step: i * 2 + 1, type: (i % 2 === 1 ? 'snare' : 'hat') as DrumType },
    ]).flat(),
  ],
};

// ----------------------------------------------------------------------------
// 3.5 TRACK 5: PALM DESERT - Scorching Desert Blues-Metal Riff
// ----------------------------------------------------------------------------
const TRACK_PALM_DESERT: TrackComposition = {
  key: 'palm_desert',
  name: 'Desert Sunburn',
  bpm: 132,
  lengthSteps: 64,
  loop: true,
  leadVoice: 'rockLead',
  bass: [
    // Heavy swinging blues-rock riff
    { step: 0, note: 'E1', dur: 2.0, slap: true },
    { step: 3, note: 'G1', dur: 1.0 },
    { step: 4, note: 'A1', dur: 1.5, slap: true },
    { step: 6, note: 'Bb1', dur: 1.5, slap: true },
    { step: 8, note: 'B1', dur: 2.0, slap: true },
    { step: 11, note: 'D2', dur: 1.0 },
    { step: 12, note: 'E2', dur: 2.0, slap: true },
    { step: 15, note: 'D2', dur: 1.0 },
    // Bar 2
    { step: 16, note: 'E1', dur: 2.0, slap: true },
    { step: 19, note: 'G1', dur: 1.0 },
    { step: 20, note: 'A1', dur: 1.5, slap: true },
    { step: 22, note: 'Bb1', dur: 1.5, slap: true },
    { step: 24, note: 'B1', dur: 2.0, slap: true },
    { step: 27, note: 'G1', dur: 1.0 },
    { step: 28, note: 'E1', dur: 2.0 },
    { step: 31, note: 'D1', dur: 1.0 },
    // Bar 3 - A blues turnaround
    { step: 32, note: 'A1', dur: 2.0, slap: true },
    { step: 35, note: 'C2', dur: 1.0 },
    { step: 36, note: 'D2', dur: 1.5, slap: true },
    { step: 38, note: 'Eb2', dur: 1.5, slap: true },
    { step: 40, note: 'E2', dur: 2.0, slap: true },
    { step: 43, note: 'G2', dur: 1.0 },
    { step: 44, note: 'A2', dur: 2.0, slap: true },
    { step: 47, note: 'G2', dur: 1.0 },
    // Bar 4 - Desert chromatic descent
    { step: 48, note: 'B1', dur: 2.0, slap: true },
    { step: 51, note: 'Bb1', dur: 1.5, slap: true },
    { step: 54, note: 'A1', dur: 1.5, slap: true },
    { step: 57, note: 'G1', dur: 1.5 },
    { step: 60, note: 'E1', dur: 2.0, slap: true },
    { step: 63, note: 'D1', dur: 1.0 },
  ],
  rhythm: [
    { step: 0, chord: ['E2', 'B2', 'E3'], dur: 2.5 },
    { step: 4, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 6, chord: ['A2', 'E3', 'A3'], dur: 1.5 },
    { step: 8, chord: ['Bb2', 'F3', 'Bb3'], dur: 1.5 },
    { step: 10, chord: ['B2', 'F#3', 'B3'], dur: 2.5 },
    { step: 14, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 16, chord: ['E2', 'B2', 'E3'], dur: 2.5 },
    { step: 20, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 22, chord: ['A2', 'E3', 'A3'], dur: 1.5 },
    { step: 24, chord: ['B2', 'F#3', 'B3'], dur: 2.5 },
    { step: 28, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 30, chord: ['E3', 'B3', 'E4'], dur: 1.5 },
    { step: 32, chord: ['A2', 'E3', 'A3'], dur: 2.5 },
    { step: 36, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 38, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 40, chord: ['Eb3', 'Bb3', 'Eb4'], dur: 1.5 },
    { step: 42, chord: ['E3', 'B3', 'E4'], dur: 2.5 },
    { step: 48, chord: ['B2', 'F#3', 'B3'], dur: 2.0 },
    { step: 52, chord: ['Bb2', 'F3', 'Bb3'], dur: 2.0 },
    { step: 56, chord: ['A2', 'E3', 'A3'], dur: 2.0 },
    { step: 60, chord: ['G2', 'D3', 'G3'], dur: 2.0 },
  ],
  lead: [
    { step: 0, note: 'E4', dur: 2.5 },
    { step: 4, note: 'G4', dur: 1.5 },
    { step: 6, note: 'A4', dur: 1.5 },
    { step: 8, note: 'Bb4', dur: 1.5 },
    { step: 10, note: 'B4', dur: 2.5 },
    { step: 14, note: 'D5', dur: 1.5 },
    { step: 16, note: 'E5', dur: 3.5 },
    { step: 22, note: 'G5', dur: 2.0 },
    { step: 26, note: 'E5', dur: 2.5 },
    { step: 30, note: 'D5', dur: 1.5 },
    { step: 32, note: 'A5', dur: 3.0 },
    { step: 38, note: 'C6', dur: 2.0 },
    { step: 42, note: 'A5', dur: 2.5 },
    { step: 46, note: 'G5', dur: 1.5 },
    { step: 48, note: 'F#5', dur: 2.0 },
    { step: 52, note: 'F5', dur: 2.0 },
    { step: 56, note: 'E5', dur: 2.5 },
    { step: 60, note: 'D5', dur: 2.0 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    // Halftime heavy rock beat
    ...Array.from({ length: 8 }, (_, i) => [
      { step: i * 8, type: 'kick' as DrumType },
      { step: i * 8 + 2, type: 'hat' as DrumType },
      { step: i * 8 + 4, type: 'snare' as DrumType },
      { step: i * 8 + 6, type: 'kick' as DrumType },
      { step: i * 8 + 7, type: 'hat' as DrumType },
    ]).flat(),
  ],
};

// ----------------------------------------------------------------------------
// 3.6 TRACK 6: GRASS VALLEY - High-Tempo Thrash/Boogie Road Anthem
// ----------------------------------------------------------------------------
const TRACK_GRASS_VALLEY: TrackComposition = {
  key: 'grass_valley',
  name: 'Grass Valley Stampede',
  bpm: 166,
  lengthSteps: 64,
  loop: true,
  leadVoice: 'rockLead',
  bass: [
    // G thrash boogie
    { step: 0, note: 'G1', dur: 1.0 },
    { step: 1, note: 'G1', dur: 1.0 },
    { step: 2, note: 'Bb1', dur: 1.0, slap: true },
    { step: 3, note: 'G1', dur: 1.0 },
    { step: 4, note: 'C2', dur: 1.0 },
    { step: 5, note: 'G1', dur: 1.0 },
    { step: 6, note: 'Db2', dur: 1.0, slap: true },
    { step: 7, note: 'D2', dur: 1.0 },
    { step: 8, note: 'G1', dur: 1.0 },
    { step: 9, note: 'G1', dur: 1.0 },
    { step: 10, note: 'F2', dur: 1.0, slap: true },
    { step: 11, note: 'G1', dur: 1.0 },
    { step: 12, note: 'D2', dur: 1.0 },
    { step: 14, note: 'C2', dur: 1.0 },
    // C thrash boogie
    { step: 16, note: 'C2', dur: 1.0 },
    { step: 17, note: 'C2', dur: 1.0 },
    { step: 18, note: 'Eb2', dur: 1.0, slap: true },
    { step: 19, note: 'C2', dur: 1.0 },
    { step: 20, note: 'F2', dur: 1.0 },
    { step: 22, note: 'F#2', dur: 1.0, slap: true },
    { step: 24, note: 'G2', dur: 1.0 },
    { step: 26, note: 'Bb2', dur: 1.0 },
    { step: 28, note: 'G2', dur: 1.0 },
    { step: 30, note: 'F2', dur: 1.0 },
    // Back to G
    { step: 32, note: 'G1', dur: 1.0 },
    { step: 34, note: 'Bb1', dur: 1.0, slap: true },
    { step: 36, note: 'C2', dur: 1.0 },
    { step: 38, note: 'Db2', dur: 1.0, slap: true },
    { step: 40, note: 'D2', dur: 1.0 },
    { step: 42, note: 'F2', dur: 1.0 },
    { step: 44, note: 'G2', dur: 1.0 },
    { step: 46, note: 'F2', dur: 1.0 },
    // Turnaround: D -> C -> G
    { step: 48, note: 'D2', dur: 1.5, slap: true },
    { step: 50, note: 'F#2', dur: 1.0 },
    { step: 52, note: 'C2', dur: 1.5, slap: true },
    { step: 54, note: 'E2', dur: 1.0 },
    { step: 56, note: 'G1', dur: 1.5, slap: true },
    { step: 58, note: 'Bb1', dur: 1.0 },
    { step: 60, note: 'C2', dur: 1.0 },
    { step: 62, note: 'D2', dur: 1.0 },
  ],
  rhythm: [
    { step: 0, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 2, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 4, chord: ['Bb2', 'F3', 'Bb3'], dur: 1.5 },
    { step: 6, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 8, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 10, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 12, chord: ['F3', 'C4', 'F4'], dur: 1.5 },
    { step: 14, chord: ['D3', 'A3', 'D4'], dur: 1.5 },
    { step: 16, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 18, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 20, chord: ['Eb3', 'Bb3', 'Eb4'], dur: 1.5 },
    { step: 22, chord: ['F3', 'C4', 'F4'], dur: 1.5 },
    { step: 24, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 28, chord: ['Bb3', 'F4', 'Bb4'], dur: 1.5 },
    { step: 32, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 36, chord: ['G2', 'D3', 'G3'], dur: 1.5 },
    { step: 40, chord: ['Bb2', 'F3', 'Bb3'], dur: 1.5 },
    { step: 44, chord: ['C3', 'G3', 'C4'], dur: 1.5 },
    { step: 48, chord: ['D3', 'A3', 'D4'], dur: 2.0 },
    { step: 52, chord: ['C3', 'G3', 'C4'], dur: 2.0 },
    { step: 56, chord: ['G2', 'D3', 'G3'], dur: 2.0 },
    { step: 60, chord: ['D3', 'F#3', 'A3'], dur: 2.0 },
  ],
  lead: [
    { step: 0, note: 'G4', dur: 1.5 },
    { step: 2, note: 'Bb4', dur: 1.5 },
    { step: 4, note: 'C5', dur: 1.5 },
    { step: 6, note: 'Db5', dur: 1.5 },
    { step: 8, note: 'D5', dur: 2.0 },
    { step: 12, note: 'F5', dur: 1.5 },
    { step: 14, note: 'G5', dur: 2.0 },
    { step: 16, note: 'C5', dur: 1.5 },
    { step: 18, note: 'Eb5', dur: 1.5 },
    { step: 20, note: 'F5', dur: 1.5 },
    { step: 22, note: 'F#5', dur: 1.5 },
    { step: 24, note: 'G5', dur: 2.0 },
    { step: 28, note: 'Bb5', dur: 2.0 },
    { step: 32, note: 'G5', dur: 2.0 },
    { step: 36, note: 'F5', dur: 1.5 },
    { step: 40, note: 'D5', dur: 1.5 },
    { step: 44, note: 'C5', dur: 1.5 },
    { step: 48, note: 'D5', dur: 2.0 },
    { step: 52, note: 'C5', dur: 2.0 },
    { step: 56, note: 'Bb4', dur: 2.0 },
    { step: 60, note: 'G4', dur: 2.5 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    ...Array.from({ length: 32 }, (_, i) => [
      { step: i * 2, type: 'kick' as DrumType },
      { step: i * 2 + 1, type: (i % 2 === 1 ? 'snare' : 'hat') as DrumType },
    ]).flat(),
  ],
};

// ----------------------------------------------------------------------------
// 3.7 TRACK 7: VICTORY - Triumphant 16-Bit Podium Fanfare
// ----------------------------------------------------------------------------
const TRACK_VICTORY: TrackComposition = {
  key: 'victory',
  name: 'Podium Triumph',
  bpm: 130,
  lengthSteps: 48,
  loop: false,
  leadVoice: 'fmBrass',
  bass: [
    { step: 0, note: 'C2', dur: 2.0, slap: true },
    { step: 4, note: 'C2', dur: 2.0 },
    { step: 8, note: 'G2', dur: 2.0, slap: true },
    { step: 12, note: 'G2', dur: 2.0 },
    { step: 16, note: 'A2', dur: 2.0, slap: true },
    { step: 20, note: 'A2', dur: 2.0 },
    { step: 24, note: 'F2', dur: 2.0, slap: true },
    { step: 28, note: 'G2', dur: 2.0 },
    { step: 32, note: 'C2', dur: 2.0, slap: true },
    { step: 36, note: 'E2', dur: 2.0 },
    { step: 40, note: 'F2', dur: 2.0, slap: true },
    { step: 44, note: 'G2', dur: 3.0 },
  ],
  rhythm: [
    { step: 0, chord: ['C4', 'E4', 'G4'], dur: 3.0 },
    { step: 4, chord: ['C4', 'E4', 'G4'], dur: 3.0 },
    { step: 8, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 12, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 16, chord: ['A3', 'E4', 'A4'], dur: 3.0 },
    { step: 20, chord: ['A3', 'E4', 'A4'], dur: 3.0 },
    { step: 24, chord: ['F3', 'C4', 'F4'], dur: 3.0 },
    { step: 28, chord: ['G3', 'D4', 'G4'], dur: 3.0 },
    { step: 32, chord: ['C4', 'G4', 'C5'], dur: 3.0 },
    { step: 36, chord: ['E4', 'G#4', 'B4'], dur: 3.0 },
    { step: 40, chord: ['F4', 'A4', 'C5'], dur: 3.0 },
    { step: 44, chord: ['G4', 'B4', 'D5'], dur: 4.0 },
  ],
  lead: [
    { step: 0, note: 'C4', dur: 1.5 },
    { step: 2, note: 'E4', dur: 1.5 },
    { step: 4, note: 'G4', dur: 2.5 },
    { step: 8, note: 'C5', dur: 3.0 },
    { step: 12, note: 'G4', dur: 2.0 },
    { step: 16, note: 'E5', dur: 2.5 },
    { step: 20, note: 'D5', dur: 2.0 },
    { step: 24, note: 'C5', dur: 2.0 },
    { step: 28, note: 'D5', dur: 2.5 },
    { step: 32, note: 'E5', dur: 2.5 },
    { step: 36, note: 'G5', dur: 2.5 },
    { step: 40, note: 'C6', dur: 2.0 },
    { step: 44, note: 'C6', dur: 4.0 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    { step: 0, type: 'kick' },
    { step: 4, type: 'snare' },
    { step: 8, type: 'kick' },
    { step: 12, type: 'snare' },
    { step: 16, type: 'crash' },
    { step: 16, type: 'kick' },
    { step: 20, type: 'snare' },
    { step: 24, type: 'kick' },
    { step: 28, type: 'snare' },
    { step: 32, type: 'crash' },
    { step: 36, type: 'snare' },
    { step: 40, type: 'snare' },
    { step: 42, type: 'snare' },
    { step: 44, type: 'crash' },
    { step: 44, type: 'kick' },
  ],
};

// ----------------------------------------------------------------------------
// 3.8 TRACK 8: WRECKED - Somber/Quirky Tow-Truck Breakdown Tune
// ----------------------------------------------------------------------------
const TRACK_WRECKED: TrackComposition = {
  key: 'wrecked',
  name: 'Tow Truck Breakdown',
  bpm: 104,
  lengthSteps: 32,
  loop: true,
  leadVoice: 'cleanGuitar',
  bass: [
    { step: 0, note: 'D2', dur: 2.5 },
    { step: 4, note: 'F1', dur: 2.0 },
    { step: 8, note: 'Ab1', dur: 2.5 },
    { step: 12, note: 'G1', dur: 2.0 },
    { step: 16, note: 'D1', dur: 2.5 },
    { step: 20, note: 'C1', dur: 2.0 },
    { step: 24, note: 'A0', dur: 2.5 },
    { step: 28, note: 'D1', dur: 2.5 },
  ],
  rhythm: [
    { step: 0, chord: ['D3', 'F3', 'A3'], dur: 2.0 },
    { step: 4, chord: ['D3', 'F3', 'A3'], dur: 2.0 },
    { step: 8, chord: ['Ab3', 'D4', 'F4'], dur: 2.0 },
    { step: 12, chord: ['G3', 'Bb3', 'D4'], dur: 2.0 },
    { step: 16, chord: ['D3', 'F3', 'A3'], dur: 2.0 },
    { step: 20, chord: ['C3', 'E3', 'G3'], dur: 2.0 },
    { step: 24, chord: ['A2', 'C#3', 'E3'], dur: 2.0 },
    { step: 28, chord: ['D3', 'F3', 'A3'], dur: 3.0 },
  ],
  lead: [
    { step: 0, note: 'A4', dur: 1.5 },
    { step: 2, note: 'Ab4', dur: 1.5 },
    { step: 4, note: 'G4', dur: 1.5 },
    { step: 6, note: 'F4', dur: 1.5 },
    { step: 8, note: 'D4', dur: 2.5 },
    { step: 12, note: 'C4', dur: 2.0 },
    { step: 16, note: 'D4', dur: 2.0 },
    { step: 20, note: 'F4', dur: 2.0 },
    { step: 24, note: 'Ab4', dur: 1.5 },
    { step: 26, note: 'G4', dur: 1.5 },
    { step: 28, note: 'F4', dur: 1.5 },
    { step: 30, note: 'D4', dur: 2.0 },
  ],
  drums: [
    { step: 0, type: 'kick' },
    { step: 4, type: 'hat' },
    { step: 8, type: 'snare' },
    { step: 12, type: 'hat' },
    { step: 16, type: 'kick' },
    { step: 20, type: 'hat' },
    { step: 24, type: 'snare' },
    { step: 28, type: 'hat' },
  ],
};

// ----------------------------------------------------------------------------
// 3.9 TRACK 9: BUSTED - Dramatic Police Arrest Brass & Bass Sting
// ----------------------------------------------------------------------------
const TRACK_BUSTED: TrackComposition = {
  key: 'busted',
  name: 'Busted by the Law',
  bpm: 116,
  lengthSteps: 32,
  loop: false,
  leadVoice: 'fmBrass',
  bass: [
    { step: 0, note: 'C1', dur: 2.0 },
    { step: 4, note: 'F#1', dur: 2.0 },
    { step: 8, note: 'C1', dur: 2.0 },
    { step: 12, note: 'F#1', dur: 2.0 },
    { step: 16, note: 'D1', dur: 2.0 },
    { step: 20, note: 'C#1', dur: 2.0 },
    { step: 24, note: 'F#1', dur: 2.0 },
    { step: 28, note: 'F#0', dur: 3.5 },
  ],
  rhythm: [
    { step: 0, chord: ['C4', 'F#4', 'A4'], dur: 2.0 },
    { step: 4, chord: ['F#3', 'C4', 'Eb4'], dur: 2.0 },
    { step: 8, chord: ['C4', 'F#4', 'A4'], dur: 2.0 },
    { step: 12, chord: ['F#3', 'C4', 'Eb4'], dur: 2.0 },
    { step: 16, chord: ['D4', 'Ab4', 'B4'], dur: 2.0 },
    { step: 20, chord: ['C#4', 'G4', 'Bb4'], dur: 2.0 },
    { step: 24, chord: ['F#3', 'C#4', 'F#4'], dur: 2.0 },
    { step: 28, chord: ['F#2', 'C#3', 'F#3'], dur: 3.0 },
  ],
  lead: [
    { step: 0, note: 'C6', dur: 1.0 },
    { step: 2, note: 'F#5', dur: 1.0 },
    { step: 4, note: 'C6', dur: 1.0 },
    { step: 6, note: 'F#5', dur: 1.0 },
    { step: 8, note: 'D6', dur: 1.0 },
    { step: 10, note: 'Ab5', dur: 1.0 },
    { step: 12, note: 'D6', dur: 1.0 },
    { step: 14, note: 'Ab5', dur: 1.0 },
    { step: 16, note: 'C#6', dur: 1.5 },
    { step: 19, note: 'A5', dur: 1.5 },
    { step: 22, note: 'F#5', dur: 2.0 },
    { step: 26, note: 'F#4', dur: 3.5 },
  ],
  drums: [
    { step: 0, type: 'crash' },
    { step: 0, type: 'kick' },
    { step: 4, type: 'snare' },
    { step: 8, type: 'kick' },
    { step: 12, type: 'snare' },
    { step: 16, type: 'crash' },
    { step: 16, type: 'kick' },
    { step: 20, type: 'snare' },
    { step: 24, type: 'kick' },
    { step: 28, type: 'snare' },
  ],
};

const COMPOSITIONS: Record<MusicTrackKey, TrackComposition> = {
  title: TRACK_TITLE,
  sierra_nevada: TRACK_SIERRA_NEVADA,
  pacific_coast: TRACK_PACIFIC_COAST,
  redwood_forest: TRACK_REDWOOD_FOREST,
  palm_desert: TRACK_PALM_DESERT,
  grass_valley: TRACK_GRASS_VALLEY,
  victory: TRACK_VICTORY,
  wrecked: TRACK_WRECKED,
  busted: TRACK_BUSTED,
};

// ============================================================================
// 4. MAIN SOUND ENGINE CLASS
// ============================================================================

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  // Master audio buses
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private sirenGain: GainNode | null = null;

  // Distortion & Saturation Nodes
  private genesisDistCurve: Float32Array<ArrayBuffer> | null = null;
  private musicGuitarBus: GainNode | null = null;
  private musicDistortionNode: WaveShaperNode | null = null;

  // Noise Buffer Cache
  private noiseBuffer: AudioBuffer | null = null;

  // Music Sequencer State
  private currentTrackKey: MusicTrackKey | null = null;
  private currentTrack: TrackComposition | null = null;
  private schedulerTimerId: number | null = null;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private isMusicPlaying: boolean = false;

  // Continuous Engine Synthesizer State
  private engineInitialized: boolean = false;
  private engineMasterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineMod: OscillatorNode | null = null;
  private engineModGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroOsc: OscillatorNode | null = null;
  private nitroNoiseNode: AudioBufferSourceNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  // Continuous Siren Synthesizer State
  private sirenInitialized: boolean = false;
  private sirenMasterGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenFilter: BiquadFilterNode | null = null;
  private sirenLfo: OscillatorNode | null = null;
  private sirenLfoGain: GainNode | null = null;

  // Volume & Mute Settings
  private muted: boolean = false;
  private masterVolume: number = 0.85;
  private musicVolume: number = 0.75;
  private soundVolume: number = 0.85;

  constructor() {
    this.registerUnlockListeners();
  }

  // ==========================================================================
  // CONTEXT LIFECYCLE & AUTO-UNLOCK
  // ==========================================================================

  private registerUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.isUnlocked = true;
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
  }

  public async resumeAudioContext(): Promise<void> {
    if (this.ensureContext() && this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
        this.isUnlocked = true;
      } catch {
        // Safe no-op if blocked by browser policy
      }
    }
  }

  private ensureContext(): boolean {
    const globalObj =
      typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
          ? globalThis
          : undefined;
    if (!globalObj) return false;

    if (!this.ctx) {
      const AudioCtxClass =
        (globalObj as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (globalObj as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) return false;

      try {
        this.ctx = new AudioCtxClass();
        this.setupAudioGraph();
      } catch {
        return false;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
      this.ctx.resume().catch(() => {});
    }

    return true;
  }

  private setupAudioGraph(): void {
    if (!this.ctx) return;

    // Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Sub Buses
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.soundVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.soundVolume, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(this.soundVolume, this.ctx.currentTime);
    this.sirenGain.connect(this.masterGain);

    // Distortion Overdrive Bus for Heavy 16-Bit Guitars
    this.genesisDistCurve = this.generateGenesisDistortionCurve(18);
    this.musicDistortionNode = this.ctx.createWaveShaper();
    this.musicDistortionNode.curve = this.genesisDistCurve;
    this.musicDistortionNode.oversample = '2x';
    this.musicDistortionNode.connect(this.musicGain);

    this.musicGuitarBus = this.ctx.createGain();
    this.musicGuitarBus.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.musicGuitarBus.connect(this.musicDistortionNode);

    // Generate White Noise Buffer
    this.generateNoiseBuffer();
  }

  /**
   * Generates a Sega Genesis 9-bit DAC ladder distortion curve
   */
  private generateGenesisDistortionCurve(drive: number): Float32Array<ArrayBuffer> {
    const samples = 4096;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      const y = ((3 + drive) * x * 20 * deg) / (Math.PI + drive * Math.abs(x));
      // 9-bit DAC quantization step
      const steps = 512;
      curve[i] = Math.round(y * steps) / steps;
    }
    return curve;
  }

  private generateNoiseBuffer(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds mono noise
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  // ==========================================================================
  // PROCEDURAL FM MUSIC ENGINE
  // ==========================================================================

  public playMusic(trackKey: MusicTrackKey | string, forceRestart: boolean = false): void {
    const normalizedKey = this.normalizeTrackKey(trackKey);
    const composition = COMPOSITIONS[normalizedKey];
    if (!composition) return;

    if (!forceRestart && this.isMusicPlaying && this.currentTrackKey === normalizedKey) {
      return;
    }

    this.stopMusic();

    this.currentTrackKey = normalizedKey;
    this.currentTrack = composition;
    this.isMusicPlaying = true;

    if (!this.ensureContext() || !this.ctx) return;

    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    // Fast 25ms scheduler loop using Web Audio hardware clock
    const timerFn = typeof window !== 'undefined' ? window.setInterval : setInterval;
    this.schedulerTimerId = timerFn(() => {
      this.schedulerTick();
    }, 25) as unknown as number;
  }

  public stopMusic(): void {
    if (this.schedulerTimerId !== null) {
      const clearFn = typeof window !== 'undefined' ? window.clearInterval : clearInterval;
      clearFn(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
    this.currentTrack = null;
    this.currentTrackKey = null;
    this.isMusicPlaying = false;
  }

  public getCurrentTrack(): string | null {
    return this.currentTrackKey;
  }

  public isPlayingMusic(): boolean {
    return this.isMusicPlaying;
  }

  private normalizeTrackKey(key: string): MusicTrackKey {
    const k = key.toLowerCase().trim();
    if (k.includes('title') || k.includes('main')) return 'title';
    if (k.includes('sierra')) return 'sierra_nevada';
    if (k.includes('pacific')) return 'pacific_coast';
    if (k.includes('redwood')) return 'redwood_forest';
    if (k.includes('palm') || k.includes('desert')) return 'palm_desert';
    if (k.includes('grass')) return 'grass_valley';
    if (k.includes('victory') || k.includes('win') || k.includes('podium')) return 'victory';
    if (k.includes('wreck') || k.includes('crash')) return 'wrecked';
    if (k.includes('bust') || k.includes('arrest') || k.includes('police')) return 'busted';

    if (COMPOSITIONS[k as MusicTrackKey]) {
      return k as MusicTrackKey;
    }
    return 'title';
  }

  private schedulerTick(): void {
    if (!this.ctx || !this.currentTrack || !this.isMusicPlaying) return;

    const lookAheadWindow = 0.12; // 120ms schedule ahead
    const stepDuration = 60 / this.currentTrack.bpm / 4; // 16th note in seconds

    while (this.nextStepTime < this.ctx.currentTime + lookAheadWindow) {
      this.scheduleStep(this.currentStep, this.nextStepTime, stepDuration);
      this.nextStepTime += stepDuration;
      this.currentStep++;

      if (this.currentStep >= this.currentTrack.lengthSteps) {
        if (this.currentTrack.loop) {
          this.currentStep = 0;
        } else {
          this.stopMusic();
          break;
        }
      }
    }
  }

  private scheduleStep(step: number, time: number, stepDuration: number): void {
    if (!this.currentTrack || !this.ctx) return;

    // 1. Bass Channel
    for (const b of this.currentTrack.bass) {
      if (b.step === step && b.note) {
        const freq = noteToFreq(b.note);
        if (freq > 0) {
          const dur = (b.dur || 1.0) * stepDuration;
          this.playFmVoice(
            freq,
            time,
            dur,
            INSTRUMENT_PRESETS.slapBass,
            this.musicGuitarBus || this.musicGain!,
            (b.velocity || 0.85) * (b.slap ? 1.25 : 1.0)
          );
        }
      }
    }

    // 2. Rhythm Guitar Chords
    for (const r of this.currentTrack.rhythm) {
      if (r.step === step && r.chord) {
        const dur = (r.dur || 1.5) * stepDuration;
        for (const note of r.chord) {
          const freq = noteToFreq(note);
          if (freq > 0) {
            this.playFmVoice(
              freq,
              time,
              dur,
              INSTRUMENT_PRESETS.metalGuitar,
              this.musicGuitarBus || this.musicGain!,
              (r.velocity || 0.7) * 0.75
            );
          }
        }
      }
    }

    // 3. Lead Voice
    const leadPreset = INSTRUMENT_PRESETS[this.currentTrack.leadVoice] || INSTRUMENT_PRESETS.rockLead;
    for (const l of this.currentTrack.lead) {
      if (l.step === step && l.note) {
        const freq = noteToFreq(l.note);
        if (freq > 0) {
          const dur = (l.dur || 1.5) * stepDuration;
          this.playFmVoice(
            freq,
            time,
            dur,
            leadPreset,
            leadPreset.useDistortion && this.musicGuitarBus ? this.musicGuitarBus : this.musicGain!,
            l.velocity || 0.85
          );
        }
      }
    }

    // 4. Drums
    for (const d of this.currentTrack.drums) {
      if (d.step === step) {
        this.playDrumVoice(d.type, time, d.velocity || 0.85);
      }
    }
  }

  private playFmVoice(
    freq: number,
    startTime: number,
    duration: number,
    voice: FMVoiceParams,
    destination: AudioNode,
    velocity: number = 0.8
  ): void {
    if (!this.ctx || freq <= 0) return;

    const ctx = this.ctx;
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const voiceGain = ctx.createGain();

    carrier.type = voice.carrierWave;
    carrier.frequency.setValueAtTime(freq, startTime);

    modulator.type = voice.modulatorWave;
    const modFreq = freq * voice.modRatio;
    modulator.frequency.setValueAtTime(modFreq, startTime);

    const modDepth = freq * voice.modDepth;
    modGain.gain.setValueAtTime(Math.max(0.001, modDepth), startTime);
    modGain.gain.exponentialRampToValueAtTime(Math.max(0.001, modDepth * 0.2), startTime + duration);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    const peakGain = 0.28 * Math.max(0.1, Math.min(1.5, velocity));
    const sustainGain = peakGain * voice.sustain;
    const attackEnd = startTime + voice.attack;
    const decayEnd = attackEnd + voice.decay;
    const releaseStart = startTime + duration;
    const releaseEnd = releaseStart + voice.release;

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), attackEnd);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustainGain), decayEnd);
    voiceGain.gain.setValueAtTime(Math.max(0.0001, sustainGain), releaseStart);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    carrier.connect(voiceGain);
    voiceGain.connect(destination);

    carrier.start(startTime);
    modulator.start(startTime);
    carrier.stop(releaseEnd + 0.05);
    modulator.stop(releaseEnd + 0.05);
  }

  private playDrumVoice(type: DrumType, time: number, velocity: number = 0.8): void {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    switch (type) {
      case 'kick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, time);
        osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

        const v = 0.45 * velocity;
        gain.gain.setValueAtTime(v, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + 0.15);
        break;
      }
      case 'snare': {
        // Tone punch
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(80, time + 0.06);

        oscGain.gain.setValueAtTime(0.3 * velocity, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        osc.connect(oscGain);
        oscGain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + 0.09);

        // Noise snap
        if (this.noiseBuffer) {
          const noise = ctx.createBufferSource();
          noise.buffer = this.noiseBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(950, time);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.32 * velocity, time);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(this.musicGain);

          noise.start(time);
          noise.stop(time + 0.16);
        }
        break;
      }
      case 'hat': {
        if (!this.noiseBuffer) return;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18 * velocity, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.05);
        break;
      }
      case 'openHat': {
        if (!this.noiseBuffer) return;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(5800, time);
        filter.Q.setValueAtTime(1.8, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22 * velocity, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.23);
        break;
      }
      case 'crash': {
        if (!this.noiseBuffer) return;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, time);
        filter.Q.setValueAtTime(1.2, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35 * velocity, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(time);
        noise.stop(time + 0.72);
        break;
      }
    }
  }

  // ==========================================================================
  // CONTINUOUS MOTORCYCLE ENGINE & SIREN SYNTHESIZER
  // ==========================================================================

  private initEngineNodes(): void {
    if (!this.ctx || !this.engineGain || this.engineInitialized) return;

    this.engineMasterGain = this.ctx.createGain();
    this.engineMasterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.engineMasterGain.connect(this.engineGain);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);
    this.engineFilter.connect(this.engineMasterGain);

    // Primary Cylinder Sawtooth
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(48, this.ctx.currentTime);

    // Sub Exhaust Rumble
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(24, this.ctx.currentTime);

    // FM Combustion Rattler
    this.engineMod = this.ctx.createOscillator();
    this.engineMod.type = 'sawtooth';
    this.engineMod.frequency.setValueAtTime(96, this.ctx.currentTime);

    this.engineModGain = this.ctx.createGain();
    this.engineModGain.gain.setValueAtTime(30, this.ctx.currentTime);

    this.engineMod.connect(this.engineModGain);
    this.engineModGain.connect(this.engineOsc1.frequency);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);

    // Nitro Afterburner Layer
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.nitroGain.connect(this.engineMasterGain);

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = 'bandpass';
    this.nitroFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);
    this.nitroFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);
    this.nitroFilter.connect(this.nitroGain);

    if (this.noiseBuffer) {
      this.nitroNoiseNode = this.ctx.createBufferSource();
      this.nitroNoiseNode.buffer = this.noiseBuffer;
      this.nitroNoiseNode.loop = true;
      this.nitroNoiseNode.connect(this.nitroFilter);
      this.nitroNoiseNode.start();
    }

    this.nitroOsc = this.ctx.createOscillator();
    this.nitroOsc.type = 'sawtooth';
    this.nitroOsc.frequency.setValueAtTime(740, this.ctx.currentTime);
    this.nitroOsc.connect(this.nitroGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineMod.start();
    this.nitroOsc.start();

    this.engineInitialized = true;
  }

  public updateEngineSound(
    speedMph: number,
    maxSpeedMph: number,
    isAccelerating: boolean,
    isNitro: boolean,
    isAirborne: boolean,
    isCrashed: boolean
  ): void {
    if (!this.ensureContext() || !this.ctx) return;
    if (!this.engineInitialized) {
      this.initEngineNodes();
    }

    const now = this.ctx.currentTime;
    const tc = 0.05; // 50ms smooth transition time constant

    if (isCrashed) {
      if (this.engineMasterGain) {
        this.engineMasterGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
      if (this.nitroGain) {
        this.nitroGain.gain.setTargetAtTime(0.0001, now, 0.05);
      }
      return;
    }

    const safeMax = Math.max(1, maxSpeedMph);
    const speedRatio = Math.max(0, Math.min(1.4, speedMph / safeMax));

    // 5-Gear Transmission Simulation
    let gearRpm = 0.15;
    if (speedRatio < 0.22) {
      gearRpm = speedRatio / 0.22;
    } else if (speedRatio < 0.42) {
      gearRpm = (speedRatio - 0.2) / 0.22;
    } else if (speedRatio < 0.64) {
      gearRpm = (speedRatio - 0.4) / 0.24;
    } else if (speedRatio < 0.85) {
      gearRpm = (speedRatio - 0.62) / 0.23;
    } else {
      gearRpm = (speedRatio - 0.83) / 0.32;
    }
    gearRpm = Math.max(0.12, Math.min(1.0, gearRpm));

    if (isAirborne) {
      gearRpm = Math.min(1.15, gearRpm + 0.35);
    }

    // Base pitch range: 45Hz idle to 195Hz redline
    const baseFreq = 46 + gearRpm * 145;
    const filterCutoff = isAccelerating
      ? 650 + gearRpm * 2200
      : 360 + gearRpm * 800;

    const engineVol = isAccelerating ? 0.42 : 0.26;

    if (this.engineOsc1) {
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, tc);
    }
    if (this.engineOsc2) {
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, tc);
    }
    if (this.engineMod && this.engineModGain) {
      this.engineMod.frequency.setTargetAtTime(baseFreq * 2.2, now, tc);
      this.engineModGain.gain.setTargetAtTime(isAccelerating ? baseFreq * 1.6 : baseFreq * 0.5, now, tc);
    }
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, tc);
    }
    if (this.engineMasterGain) {
      this.engineMasterGain.gain.setTargetAtTime(engineVol, now, tc);
    }

    // Nitro Roaring Afterburner
    if (this.nitroGain && this.nitroOsc && this.nitroFilter) {
      if (isNitro) {
        this.nitroGain.gain.setTargetAtTime(0.35, now, 0.05);
        this.nitroOsc.frequency.setTargetAtTime(820 + Math.sin(now * 25) * 60, now, 0.03);
        this.nitroFilter.frequency.setTargetAtTime(3200, now, 0.05);
      } else {
        this.nitroGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
    }
  }

  public stopEngineSound(): void {
    if (this.ctx && this.engineMasterGain) {
      this.engineMasterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
    if (this.ctx && this.nitroGain) {
      this.nitroGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
  }

  // --------------------------------------------------------------------------
  // POLICE SIREN SYNTHESIZER
  // --------------------------------------------------------------------------

  private initSirenNodes(): void {
    if (!this.ctx || !this.sirenGain || this.sirenInitialized) return;

    this.sirenMasterGain = this.ctx.createGain();
    this.sirenMasterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.sirenMasterGain.connect(this.sirenGain);

    this.sirenFilter = this.ctx.createBiquadFilter();
    this.sirenFilter.type = 'bandpass';
    this.sirenFilter.frequency.setValueAtTime(920, this.ctx.currentTime);
    this.sirenFilter.Q.setValueAtTime(2.6, this.ctx.currentTime);
    this.sirenFilter.connect(this.sirenMasterGain);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(860, this.ctx.currentTime);

    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.type = 'triangle';
    this.sirenLfo.frequency.setValueAtTime(0.65, this.ctx.currentTime); // ~1.5s wail cycle

    this.sirenLfoGain = this.ctx.createGain();
    this.sirenLfoGain.gain.setValueAtTime(260, this.ctx.currentTime); // Sweeps 600Hz to 1120Hz

    this.sirenLfo.connect(this.sirenLfoGain);
    this.sirenLfoGain.connect(this.sirenOsc.frequency);

    this.sirenOsc.connect(this.sirenFilter);

    this.sirenOsc.start();
    this.sirenLfo.start();

    this.sirenInitialized = true;
  }

  public updateSirenSound(active: boolean, distanceFactor: number): void {
    if (!this.ensureContext() || !this.ctx) return;
    if (!this.sirenInitialized) {
      this.initSirenNodes();
    }

    if (!this.sirenMasterGain) return;

    const now = this.ctx.currentTime;
    if (!active || distanceFactor <= 0.001) {
      this.sirenMasterGain.gain.setTargetAtTime(0.0001, now, 0.08);
    } else {
      const clampedDist = Math.max(0, Math.min(1.0, distanceFactor));
      const sirenVol = clampedDist * 0.32;
      this.sirenMasterGain.gain.setTargetAtTime(sirenVol, now, 0.05);
    }
  }

  public stopSirenSound(): void {
    if (this.ctx && this.sirenMasterGain) {
      this.sirenMasterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
    }
  }

  // ==========================================================================
  // ONE-SHOT COMBAT, CRASH & UI SOUND EFFECTS
  // ==========================================================================

  public playPunch(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);

    // Snap transient
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.25, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.03);
    }
  }

  public playKick(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.19);

    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playWeaponSwing(weapon: WeaponType): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    switch (weapon) {
      case 'club': {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, now);
        filter.frequency.exponentialRampToValueAtTime(160, now + 0.2);
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        break;
      }
      case 'chain': {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(650, now + 0.24);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        // Chain link metallic rattling clinks
        [2300, 3100, 1950].forEach((freq, idx) => {
          const clink = ctx.createOscillator();
          const clinkGain = ctx.createGain();
          clink.type = 'square';
          clink.frequency.setValueAtTime(freq, now + idx * 0.04);

          clinkGain.gain.setValueAtTime(0.12, now + idx * 0.04);
          clinkGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.03);

          clink.connect(clinkGain);
          clinkGain.connect(this.sfxGain!);
          clink.start(now + idx * 0.04);
          clink.stop(now + idx * 0.04 + 0.035);
        });
        break;
      }
      case 'crowbar': {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1300, now);
        filter.frequency.exponentialRampToValueAtTime(480, now + 0.18);
        filter.Q.setValueAtTime(5.5, now);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;
      }
      default: {
        // Fist / subtle whoosh
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, now);
        filter.frequency.exponentialRampToValueAtTime(260, now + 0.14);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;
      }
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.26);
  }

  public playWeaponHit(weapon: WeaponType): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (weapon) {
      case 'club': {
        // Solid wooden thwack
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);

        this.playPunch();
        break;
      }
      case 'chain': {
        // Metallic whip crack & link ring
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(580, now);

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(1860, now);

        modGain.gain.setValueAtTime(700, now);
        modGain.gain.exponentialRampToValueAtTime(10, now + 0.24);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);

        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        carrier.connect(gain);
        gain.connect(this.sfxGain);

        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + 0.26);
        modulator.stop(now + 0.26);

        this.playPunch();
        break;
      }
      case 'crowbar': {
        // Ringing iron metal clang & bone impact
        const freqs = [440, 1180, 2480];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);

          const decay = 0.35 - idx * 0.08;
          gain.gain.setValueAtTime(0.4 / (idx + 1), now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

          osc.connect(gain);
          gain.connect(this.sfxGain!);
          osc.start(now);
          osc.stop(now + decay + 0.01);
        });

        this.playPunch();
        break;
      }
      default: {
        this.playPunch();
        break;
      }
    }
  }

  public playWeaponSnatch(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Fast ascending snatch zip
    const zip = ctx.createOscillator();
    const zipGain = ctx.createGain();
    zip.type = 'sawtooth';
    zip.frequency.setValueAtTime(320, now);
    zip.frequency.exponentialRampToValueAtTime(940, now + 0.07);

    zipGain.gain.setValueAtTime(0.45, now);
    zipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    zip.connect(zipGain);
    zipGain.connect(this.sfxGain);
    zip.start(now);
    zip.stop(now + 0.085);

    // Triumphant confirmation chime
    const notes = [1046, 1318]; // C6 -> E6
    notes.forEach((freq, idx) => {
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'square';
      chime.frequency.setValueAtTime(freq, now + 0.07 + idx * 0.05);

      chimeGain.gain.setValueAtTime(0.3, now + 0.07 + idx * 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07 + idx * 0.05 + 0.1);

      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain!);
      chime.start(now + 0.07 + idx * 0.05);
      chime.stop(now + 0.07 + idx * 0.05 + 0.11);
    });
  }

  public playCrashImpact(severity: number = 1.0): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const s = Math.max(0.5, Math.min(2.5, severity));

    // Deep sub-explosion rumble
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(85, now);
    sub.frequency.exponentialRampToValueAtTime(20, now + 0.35 * s);

    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 * s);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.42 * s);

    // Shattering metal crunch
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1700, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.3 * s);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32 * s);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.35 * s);
    }
  }

  public playRiderScream(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Classic 1991 16-bit descending FM vocal scream ("WAAAOOWGH!")
    const carrier = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(540, now);
    carrier.frequency.exponentialRampToValueAtTime(610, now + 0.08); // Initial panic rise
    carrier.frequency.exponentialRampToValueAtTime(145, now + 0.72); // Descending tumble

    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(7.2, now); // Panic wobble

    vibratoGain.gain.setValueAtTime(15, now);
    vibratoGain.gain.linearRampToValueAtTime(45, now + 0.6);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Vocal tract formant filter
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(820, now);
    filter.Q.setValueAtTime(3.2, now);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.58, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    carrier.start(now);
    vibrato.start(now);
    carrier.stop(now + 0.78);
    vibrato.stop(now + 0.78);
  }

  public playTireScreech(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1950, now);
    filter.Q.setValueAtTime(9.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.35);
  }

  public playTrafficHorn(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Dual-tone auto horn (440Hz + 554Hz)
    const freqs = [440, 554.37];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.02);
      gain.gain.setValueAtTime(0.24, now + 0.38);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  public playCountdownBeep(finalGo: boolean): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (!finalGo) {
      // 3-2-1 Beep (440Hz clean PSG square)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } else {
      // GO! Triumphant high triad (880Hz + 1108Hz + 1320Hz)
      const triad = [880, 1108.73, 1320];
      triad.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.44);
      });
    }
  }

  public playMenuMove(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, now);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playMenuSelect(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Ascending 2-note 16-bit chirp: C5 -> G5
    const notes = [523.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.11);
    });
  }

  public playCashRegister(): void {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // High metallic bell chime (C7 + G7)
    [2093, 3136].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.36);
    });

    // Mechanical coin drop jingles
    [1800, 2250, 1620].forEach((freq, idx) => {
      const coin = ctx.createOscillator();
      const coinGain = ctx.createGain();
      coin.type = 'square';
      coin.frequency.setValueAtTime(freq, now + 0.06 + idx * 0.04);

      coinGain.gain.setValueAtTime(0.15, now + 0.06 + idx * 0.04);
      coinGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06 + idx * 0.04 + 0.035);

      coin.connect(coinGain);
      coinGain.connect(this.sfxGain!);
      coin.start(now + 0.06 + idx * 0.04);
      coin.stop(now + 0.06 + idx * 0.04 + 0.04);
    });
  }

  // ==========================================================================
  // VOLUME & MUTE CONTROLS
  // ==========================================================================

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1.0, v));
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSoundVolume(v: number): void {
    this.soundVolume = Math.max(0, Math.min(1.0, v));
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(this.soundVolume, now);
      if (this.engineGain) this.engineGain.gain.setValueAtTime(this.soundVolume, now);
      if (this.sirenGain) this.sirenGain.gain.setValueAtTime(this.soundVolume, now);
    }
  }

  public getSoundVolume(): number {
    return this.soundVolume;
  }

  public setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1.0, v));
    if (this.ctx && this.masterGain && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  // ==========================================================================
  // CLEANUP / DISPOSE
  // ==========================================================================

  public dispose(): void {
    this.stopMusic();
    this.stopEngineSound();
    this.stopSirenSound();

    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

// Singleton Export
export const soundEngine = new SoundEngine();
export default soundEngine;
