/**
 * Road Rash (1991 Sega Genesis) - Input Manager
 * Handles multi-device input: Keyboard, Gamepad API, and Touch / Mobile Controls.
 * Implements authentic Sega Genesis mechanics including double-tap accelerate for nitro.
 */

import { PlayerInput } from '../types';

export type MenuAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

export interface MenuInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  back: boolean;
}

export interface TouchButtonZone {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  action: keyof PlayerInput | 'confirm' | 'back';
}

export class InputManager {
  // Canvas reference for coordinate conversion
  private canvas: HTMLCanvasElement | null = null;

  // Real-time raw key states
  private keysDown: Set<string> = new Set();
  private prevKeysDown: Set<string> = new Set();

  // Double-tap Nitro tracking (Sega Genesis mechanic: double-tap Up within 250ms)
  private lastUpPressTime: number = 0;
  private doubleTapNitroUntil: number = 0;
  private isUpCurrentlyReleased: boolean = true;

  // Menu action auto-repeat timers
  private menuHeldDuration: Record<MenuAction, number> = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    confirm: 0,
    back: 0,
  };
  private menuPrevState: MenuInputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    back: false,
  };
  private menuJustPressed: MenuInputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    back: false,
  };

  // Click & Pointer translation (640x448 virtual resolution)
  private pendingClick: { x: number; y: number } | null = null;
  private pointerPos: { x: number; y: number } | null = null;
  private pointerDown: boolean = false;

  // Password / text input buffer
  private typedCharsBuffer: string[] = [];
  private passwordKeyListeners: Array<(key: string) => void> = [];

  // Touch zones and active touches
  public touchOverlayVisible: boolean = false;
  private activeTouchActions: Set<keyof PlayerInput | 'confirm' | 'back'> = new Set();
  private touchZones: TouchButtonZone[] = [
    // Left side: Steering
    { id: 'steer_left', name: '◄', x: 20, y: 350, w: 70, h: 70, action: 'steerLeft' },
    { id: 'steer_right', name: '►', x: 100, y: 350, w: 70, h: 70, action: 'steerRight' },

    // Right side: Gas & Brake
    { id: 'gas', name: 'GAS', x: 550, y: 350, w: 70, h: 70, action: 'accelerate' },
    { id: 'brake', name: 'BRK', x: 470, y: 350, w: 70, h: 70, action: 'brake' },

    // Combat & Nitro
    { id: 'punch', name: 'PUNCH', x: 550, y: 260, w: 70, h: 70, action: 'punch' },
    { id: 'kick', name: 'KICK', x: 470, y: 260, w: 70, h: 70, action: 'kick' },
    { id: 'nitro', name: 'N2O', x: 390, y: 350, w: 65, h: 70, action: 'nitro' },

    // Pause top right
    { id: 'pause', name: 'PAUSE', x: 570, y: 15, w: 55, h: 40, action: 'pause' },
  ];

  // Event handler references for cleanup
  private onKeyDownBound = this.onKeyDown.bind(this);
  private onKeyUpBound = this.onKeyUp.bind(this);
  private onMouseDownBound = this.onMouseDown.bind(this);
  private onMouseMoveBound = this.onMouseMove.bind(this);
  private onMouseUpBound = this.onMouseUp.bind(this);
  private onTouchStartBound = this.onTouchStart.bind(this);
  private onTouchMoveBound = this.onTouchMove.bind(this);
  private onTouchEndBound = this.onTouchEnd.bind(this);
  private onTouchCancelBound = this.onTouchCancel.bind(this);

  constructor(canvas?: HTMLCanvasElement | null) {
    if (canvas) {
      this.attach(canvas);
    }
  }

  /**
   * Bind DOM listeners to window and canvas. Safe for non-browser/test environments.
   */
  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);

    canvas.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('mouseup', this.onMouseUpBound);

    canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEndBound, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchCancelBound, { passive: false });
  }

  /**
   * Detach all DOM listeners cleanly.
   */
  public destroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);

    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
      this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
      this.canvas.removeEventListener('touchmove', this.onTouchMoveBound);
      this.canvas.removeEventListener('touchend', this.onTouchEndBound);
      this.canvas.removeEventListener('touchcancel', this.onTouchCancelBound);
    }

    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);

    this.keysDown.clear();
    this.prevKeysDown.clear();
    this.typedCharsBuffer = [];
    this.passwordKeyListeners = [];
    this.activeTouchActions.clear();
  }

  // ==========================================================================
  // EVENT LISTENERS & SIMULATION HELPERS
  // ==========================================================================

  /**
   * Helper to simulate key down events for testing, virtual keyboards, or macros.
   */
  public simulateKeyDown(code: string, key?: string): void {
    this.onKeyDown({
      code,
      key: key ?? code,
      preventDefault: () => {},
    } as unknown as KeyboardEvent);
  }

  /**
   * Helper to simulate key up events for testing, virtual keyboards, or macros.
   */
  public simulateKeyUp(code: string): void {
    this.onKeyUp({
      code,
      key: code,
      preventDefault: () => {},
    } as unknown as KeyboardEvent);
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Prevent default browser scrolling on arrow keys & space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    const isNewPress = !this.keysDown.has(e.code);
    this.keysDown.add(e.code);

    // Sega Genesis Double-Tap Accelerate for Nitro Detection
    if (isNewPress && (e.code === 'ArrowUp' || e.code === 'KeyW')) {
      const now = performance?.now ? performance.now() : Date.now();
      const delta = now - this.lastUpPressTime;

      // Trigger if pressed again within 250ms and released in between
      if (this.isUpCurrentlyReleased && this.lastUpPressTime > 0 && delta <= 250) {
        this.doubleTapNitroUntil = now + 400; // 400ms nitro surge
      }
      this.lastUpPressTime = now;
      this.isUpCurrentlyReleased = false;
    }

    // Password / Text Input Handling
    if (isNewPress) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        this.typedCharsBuffer.push('BACKSPACE');
        this.notifyPasswordKeyListeners('BACKSPACE');
      } else if (e.key === 'Enter') {
        this.typedCharsBuffer.push('ENTER');
        this.notifyPasswordKeyListeners('ENTER');
      } else if (e.key.length === 1) {
        const upper = e.key.toUpperCase();
        if (/^[A-Z0-9]$/.test(upper)) {
          this.typedCharsBuffer.push(upper);
          this.notifyPasswordKeyListeners(upper);
        }
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.isUpCurrentlyReleased = true;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.pointerDown = true;
    const coords = this.clientToCanvasCoords(e.clientX, e.clientY);
    this.pointerPos = coords;
    this.pendingClick = coords;
  }

  private onMouseMove(e: MouseEvent): void {
    this.pointerPos = this.clientToCanvasCoords(e.clientX, e.clientY);
  }

  private onMouseUp(_e: MouseEvent): void {
    this.pointerDown = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.touchOverlayVisible = true;
    this.pointerDown = true;

    if (e.touches.length > 0) {
      const first = e.touches[0];
      const coords = this.clientToCanvasCoords(first.clientX, first.clientY);
      this.pointerPos = coords;
      this.pendingClick = coords;
    }

    this.updateTouches(e.touches);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const first = e.touches[0];
      this.pointerPos = this.clientToCanvasCoords(first.clientX, first.clientY);
    }
    this.updateTouches(e.touches);
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) {
      this.pointerDown = false;
    }
    this.updateTouches(e.touches);
  }

  private onTouchCancel(e: TouchEvent): void {
    e.preventDefault();
    this.pointerDown = false;
    this.updateTouches(e.touches);
  }

  private updateTouches(touches: TouchList): void {
    this.activeTouchActions.clear();

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const pt = this.clientToCanvasCoords(touch.clientX, touch.clientY);

      for (const zone of this.touchZones) {
        if (pt.x >= zone.x && pt.x <= zone.x + zone.w && pt.y >= zone.y && pt.y <= zone.y + zone.h) {
          this.activeTouchActions.add(zone.action);
        }
      }
    }
  }

  /**
   * Convert viewport client (x, y) to virtual 640x448 coordinates, accounting for aspect ratio contain letterboxing.
   */
  public clientToCanvasCoords(clientX: number, clientY: number, customCanvas?: HTMLCanvasElement): { x: number; y: number } {
    const cv = customCanvas ?? this.canvas;
    if (!cv) {
      return { x: clientX, y: clientY };
    }

    const rect = cv.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }

    // Road Rash native virtual resolution
    const virtualW = 640;
    const virtualH = 448;

    // Check letterboxing ratio if canvas is styled with object-fit: contain
    const canvasAspect = virtualW / virtualH;
    const rectAspect = rect.width / rect.height;

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (rectAspect > canvasAspect) {
      // Pillarboxed (black bars left and right)
      renderW = rect.height * canvasAspect;
      offsetX = (rect.width - renderW) / 2;
    } else {
      // Letterboxed (black bars top and bottom)
      renderH = rect.width / canvasAspect;
      offsetY = (rect.height - renderH) / 2;
    }

    const relativeX = clientX - rect.left - offsetX;
    const relativeY = clientY - rect.top - offsetY;

    const clampedX = Math.max(0, Math.min(renderW, relativeX));
    const clampedY = Math.max(0, Math.min(renderH, relativeY));

    return {
      x: Math.round((clampedX / renderW) * virtualW),
      y: Math.round((clampedY / renderH) * virtualH),
    };
  }

  // ==========================================================================
  // GAMEPAD POLLING
  // ==========================================================================

  private pollGamepad(): {
    rawAxes: number[];
    buttons: boolean[];
    connected: boolean;
  } {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return { rawAxes: [], buttons: [], connected: false };
    }

    const gamepads = navigator.getGamepads();
    if (!gamepads) return { rawAxes: [], buttons: [], connected: false };

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected) {
        const buttons = gp.buttons.map((b) => (typeof b === 'object' ? b.pressed : Boolean(b)));
        return {
          rawAxes: Array.from(gp.axes),
          buttons,
          connected: true,
        };
      }
    }

    return { rawAxes: [], buttons: [], connected: false };
  }

  // ==========================================================================
  // FRAME TICK & INPUT EVALUATION
  // ==========================================================================

  /**
   * Updates menu repeating states and just-pressed status. Call once per frame.
   */
  public update(dtMs: number = 16.6): void {
    const currentMenu = this.evaluateRawMenuState();
    const now = performance?.now ? performance.now() : Date.now();

    const actions: MenuAction[] = ['up', 'down', 'left', 'right', 'confirm', 'back'];

    for (const action of actions) {
      const isDown = currentMenu[action];
      const wasDown = this.menuPrevState[action];

      if (isDown) {
        if (!wasDown) {
          // Fresh press
          this.menuJustPressed[action] = true;
          this.menuHeldDuration[action] = 0;
        } else {
          // Held - handle arcade menu repeat (400ms initial delay, then repeat every 150ms)
          this.menuHeldDuration[action] += dtMs;
          if (this.menuHeldDuration[action] > 400) {
            this.menuJustPressed[action] = true;
            this.menuHeldDuration[action] -= 150;
          } else {
            this.menuJustPressed[action] = false;
          }
        }
      } else {
        this.menuJustPressed[action] = false;
        this.menuHeldDuration[action] = 0;
      }
    }

    this.menuPrevState = { ...currentMenu };

    // Clean up expired double-tap nitro
    if (this.doubleTapNitroUntil > 0 && now > this.doubleTapNitroUntil) {
      this.doubleTapNitroUntil = 0;
    }

    this.prevKeysDown = new Set(this.keysDown);
  }

  /**
   * Returns current active PlayerInput state synthesized across Keyboard, Gamepad, and Touch.
   */
  public getInput(): PlayerInput {
    const k = this.keysDown;
    const gp = this.pollGamepad();
    const touch = this.activeTouchActions;
    const now = performance?.now ? performance.now() : Date.now();

    // Gamepad button aliases
    // Standard layout: 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT, 8=Select, 9=Start, 12=DUp, 13=DDown, 14=DLeft, 15=DRight
    const gpGas = gp.buttons[0] || gp.buttons[7] || gp.buttons[5]; // A or RT or RB
    const gpBrake = gp.buttons[1] || gp.buttons[6]; // B or LT
    const gpPunch = gp.buttons[2]; // X
    const gpKick = gp.buttons[3]; // Y
    const gpNitro = gp.buttons[4] || gp.buttons[5]; // LB or RB
    const gpPause = gp.buttons[9]; // Start

    const gpStickX = gp.rawAxes[0] ?? 0;
    const gpLeft = gp.buttons[14] || gpStickX < -0.3;
    const gpRight = gp.buttons[15] || gpStickX > 0.3;

    // Double tap nitro active
    const isDoubleTapNitroActive = this.doubleTapNitroUntil > now;

    const accelerate =
      k.has('ArrowUp') || k.has('KeyW') || Boolean(gpGas) || touch.has('accelerate');

    const brake =
      k.has('ArrowDown') || k.has('KeyS') || Boolean(gpBrake) || touch.has('brake');

    const steerLeft =
      k.has('ArrowLeft') || k.has('KeyA') || Boolean(gpLeft) || touch.has('steerLeft');

    const steerRight =
      k.has('ArrowRight') || k.has('KeyD') || Boolean(gpRight) || touch.has('steerRight');

    const punch =
      k.has('KeyZ') || k.has('Space') || k.has('KeyJ') || Boolean(gpPunch) || touch.has('punch');

    const kick =
      k.has('KeyX') ||
      k.has('KeyK') ||
      k.has('ShiftLeft') ||
      k.has('ShiftRight') ||
      Boolean(gpKick) ||
      touch.has('kick');

    const nitro =
      k.has('KeyC') ||
      k.has('KeyN') ||
      k.has('KeyL') ||
      Boolean(gpNitro) ||
      touch.has('nitro') ||
      isDoubleTapNitroActive;

    const pause =
      k.has('KeyP') || k.has('Escape') || Boolean(gpPause) || touch.has('pause');

    return {
      accelerate,
      brake,
      steerLeft,
      steerRight,
      punch,
      kick,
      nitro,
      pause,
    };
  }

  // ==========================================================================
  // MENU NAVIGATION
  // ==========================================================================

  private evaluateRawMenuState(): MenuInputState {
    const k = this.keysDown;
    const gp = this.pollGamepad();
    const touch = this.activeTouchActions;

    const stickX = gp.rawAxes[0] ?? 0;
    const stickY = gp.rawAxes[1] ?? 0;

    const up =
      k.has('ArrowUp') || k.has('KeyW') || gp.buttons[12] || stickY < -0.4;
    const down =
      k.has('ArrowDown') || k.has('KeyS') || gp.buttons[13] || stickY > 0.4;
    const left =
      k.has('ArrowLeft') || k.has('KeyA') || gp.buttons[14] || stickX < -0.4;
    const right =
      k.has('ArrowRight') || k.has('KeyD') || gp.buttons[15] || stickX > 0.4;

    const confirm =
      k.has('Enter') ||
      k.has('Space') ||
      k.has('KeyZ') ||
      gp.buttons[0] || // A
      gp.buttons[9] || // Start
      touch.has('confirm');

    const back =
      k.has('Escape') ||
      k.has('Backspace') ||
      k.has('KeyX') ||
      gp.buttons[1] || // B
      gp.buttons[8] || // Select
      touch.has('back');

    return {
      up: Boolean(up),
      down: Boolean(down),
      left: Boolean(left),
      right: Boolean(right),
      confirm: Boolean(confirm),
      back: Boolean(back),
    };
  }

  /**
   * Check if a menu action was just pressed this frame (with auto-repeat).
   */
  public isActionJustPressed(action: MenuAction): boolean {
    return this.menuJustPressed[action];
  }

  /**
   * Returns and clears the current just-pressed menu actions for consuming in menu controllers.
   */
  public consumeMenuActions(): MenuInputState {
    const result = { ...this.menuJustPressed };
    this.menuJustPressed = {
      up: false,
      down: false,
      left: false,
      right: false,
      confirm: false,
      back: false,
    };
    return result;
  }

  // ==========================================================================
  // MOUSE & POINTER API
  // ==========================================================================

  /**
   * Consumes pending click if one occurred since last call.
   */
  public consumeClick(): { x: number; y: number } | null {
    const click = this.pendingClick;
    this.pendingClick = null;
    return click;
  }

  /**
   * Returns current pointer (mouse or touch) coordinates in virtual 640x448 space.
   */
  public getPointerPosition(): { x: number; y: number } | null {
    return this.pointerPos;
  }

  /**
   * Check if pointer/mouse button or touch is currently held down.
   */
  public isPointerDown(): boolean {
    return this.pointerDown;
  }

  // ==========================================================================
  // PASSWORD & TEXT INPUT
  // ==========================================================================

  /**
   * Subscribes a listener to raw password key inputs (A-Z, 0-9, BACKSPACE, ENTER).
   * Returns unsubscribe function.
   */
  public onPasswordKey(callback: (key: string) => void): () => void {
    this.passwordKeyListeners.push(callback);
    return () => {
      this.passwordKeyListeners = this.passwordKeyListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyPasswordKeyListeners(key: string): void {
    for (const listener of this.passwordKeyListeners) {
      try {
        listener(key);
      } catch (err) {
        console.error('Password key listener error:', err);
      }
    }
  }

  /**
   * Retrieves and flushes all typed characters since last frame.
   */
  public consumeTypedChars(): string[] {
    const chars = [...this.typedCharsBuffer];
    this.typedCharsBuffer = [];
    return chars;
  }

  // ==========================================================================
  // TOUCH UI HELPER RENDERER
  // ==========================================================================

  /**
   * Renders subtle on-screen touch buttons for mobile/touch-screen displays.
   */
  public renderTouchControls(ctx: CanvasRenderingContext2D): void {
    if (!this.touchOverlayVisible) return;

    ctx.save();
    for (const zone of this.touchZones) {
      const isPressed = this.activeTouchActions.has(zone.action);

      ctx.fillStyle = isPressed ? 'rgba(255, 68, 0, 0.45)' : 'rgba(30, 35, 45, 0.35)';
      ctx.strokeStyle = isPressed ? '#ff6600' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(zone.x, zone.y, zone.w, zone.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPressed ? '#ffffff' : 'rgba(220, 220, 220, 0.8)';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, zone.x + zone.w / 2, zone.y + zone.h / 2);
    }
    ctx.restore();
  }
}
