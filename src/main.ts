/**
 * Road Rash (1991 Sega Genesis) - Engine Entry Point
 */

import { BIKES, AI_RIVALS, TRACKS, loadCareerFromStorage } from './data/gameData';

console.log('⚡ Road Rash (1991 Sega Genesis) Initializing...');
console.log(`Loaded ${BIKES.length} bikes, ${AI_RIVALS.length} AI rivals, ${Object.keys(TRACKS).length} tracks.`);

const career = loadCareerFromStorage();
console.log(`Career status: Level ${career.level}, Cash: $${career.cash}, Bike: ${career.currentBikeId}, Password: ${career.password}`);

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Render Retro Title Splash
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title Banner
    ctx.fillStyle = '#e62200';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ROAD RASH', canvas.width / 2, 80);

    ctx.fillStyle = '#f5c200';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('SEGA GENESIS 16-BIT RETRO COMBAT MOTORCYCLE RACING', canvas.width / 2, 115);

    // Stats Box
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 140, canvas.width - 100, 240);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`• California Tracks: ${Object.keys(TRACKS).length} (Sierra Nevada, Pacific Coast, Redwood...)`, 80, 180);
    ctx.fillText(`• Authentic Bikes:    ${BIKES.length} across Panda, Sport & Super (Wild Thing 2000)`, 80, 215);
    ctx.fillText(`• Legendary Rivals:  ${AI_RIVALS.length} (Biff, Natasha, Slater, Ikira, P.E. No. 1...)`, 80, 250);
    ctx.fillText(`• Career Level:      ${career.level} (Cash: $${career.cash.toLocaleString()})`, 80, 285);
    ctx.fillText(`• Classic Password:  [ ${career.password} ]`, 80, 320);
    ctx.fillText(`• Combat Weapons:    Fists, Billy Club, Steel Chain, Crowbar`, 80, 355);

    ctx.fillStyle = '#888888';
    ctx.textAlign = 'center';
    ctx.fillText('Engine Scaffold Initialized - Ready for Phase 2 Implementation', canvas.width / 2, 420);
  }
}
