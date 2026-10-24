import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager } from './inputManager';

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1280,
        height: 896,
        right: 1280,
        bottom: 896,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    } as unknown as HTMLCanvasElement;

    inputManager = new InputManager(mockCanvas);
  });

  afterEach(() => {
    inputManager.destroy();
  });

  it('should initialize with all idle player inputs', () => {
    const input = inputManager.getInput();
    expect(input.accelerate).toBe(false);
    expect(input.brake).toBe(false);
    expect(input.steerLeft).toBe(false);
    expect(input.steerRight).toBe(false);
    expect(input.punch).toBe(false);
    expect(input.kick).toBe(false);
    expect(input.nitro).toBe(false);
    expect(input.pause).toBe(false);
  });

  it('should track keyboard bindings accurately', () => {
    // Simulate pressing KeyW (Accelerate) and KeyA (Steer Left)
    inputManager.simulateKeyDown('KeyW');
    inputManager.simulateKeyDown('KeyA');

    let input = inputManager.getInput();
    expect(input.accelerate).toBe(true);
    expect(input.steerLeft).toBe(true);
    expect(input.brake).toBe(false);

    // Release KeyW
    inputManager.simulateKeyUp('KeyW');
    input = inputManager.getInput();
    expect(input.accelerate).toBe(false);
    expect(input.steerLeft).toBe(true);

    // Press combat keys: KeyZ (Punch) and ShiftRight (Kick)
    inputManager.simulateKeyDown('KeyZ');
    inputManager.simulateKeyDown('ShiftRight');

    input = inputManager.getInput();
    expect(input.punch).toBe(true);
    expect(input.kick).toBe(true);

    // Cleanup keys
    inputManager.simulateKeyUp('KeyA');
    inputManager.simulateKeyUp('KeyZ');
    inputManager.simulateKeyUp('ShiftRight');
  });

  it('should trigger double-tap nitro when Up is tapped twice within 250ms', () => {
    // First press
    inputManager.simulateKeyDown('ArrowUp');
    inputManager.simulateKeyUp('ArrowUp');

    // Immediate second press (< 250ms)
    inputManager.simulateKeyDown('ArrowUp');

    const input = inputManager.getInput();
    expect(input.accelerate).toBe(true);
    expect(input.nitro).toBe(true);

    inputManager.simulateKeyUp('ArrowUp');
  });

  it('should evaluate menu just-pressed actions and auto-repeat', () => {
    // Press ArrowDown
    inputManager.simulateKeyDown('ArrowDown');
    inputManager.update(16);

    expect(inputManager.isActionJustPressed('down')).toBe(true);
    const consumed = inputManager.consumeMenuActions();
    expect(consumed.down).toBe(true);

    // Next frame while still holding: should NOT be just pressed yet (until hold threshold)
    inputManager.update(16);
    expect(inputManager.isActionJustPressed('down')).toBe(false);

    // Advance time past 400ms repeat delay
    inputManager.update(450);
    expect(inputManager.isActionJustPressed('down')).toBe(true);

    inputManager.simulateKeyUp('ArrowDown');
    inputManager.update(16);
    expect(inputManager.isActionJustPressed('down')).toBe(false);
  });

  it('should correctly convert client coordinates to virtual 640x448 space', () => {
    // 1280x896 rect is exactly 2x 640x448
    const coords = inputManager.clientToCanvasCoords(640, 448, mockCanvas);
    expect(coords.x).toBe(320);
    expect(coords.y).toBe(224);
  });

  it('should buffer alphanumeric keys for password entry', () => {
    const receivedKeys: string[] = [];
    const unsubscribe = inputManager.onPasswordKey((k) => receivedKeys.push(k));

    inputManager.simulateKeyDown('KeyA', 'a');
    inputManager.simulateKeyDown('Digit7', '7');
    inputManager.simulateKeyDown('Backspace', 'Backspace');

    expect(receivedKeys).toEqual(['A', '7', 'BACKSPACE']);

    const consumed = inputManager.consumeTypedChars();
    expect(consumed).toEqual(['A', '7', 'BACKSPACE']);
    expect(inputManager.consumeTypedChars()).toEqual([]);

    unsubscribe();
  });
});
