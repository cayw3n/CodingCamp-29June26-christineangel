/**
 * Tests for FocusTimer — Task 6 (Start, Stop, Reset controls)
 *
 * Covers the timer state machine:
 *  - start() from stopped → begin countdown (Req 4.1)
 *  - start() from paused  → resume from remaining time (Req 4.2)
 *  - stop() while running → pause without reset (Req 4.3)
 *  - stop() while stopped → no-op (Req 4.4)
 *  - reset() → stop and restore to 25:00 (Req 4.5)
 *  - start() while running → ignored, no duplicate intervals (Req 4.6)
 *
 * Run with:  npm test
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

/** Evaluate app.js in the current jsdom window's global scope */
function loadApp() {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../js/app.js'),
    'utf8'
  );
  const script = new vm.Script(src);
  script.runInThisContext();
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();

  // Minimal DOM needed by FocusTimer
  document.body.innerHTML = `
    <div id="timer-display">25:00</div>
    <div class="timer-controls">
      <button id="timer-start" type="button">Start</button>
      <button id="timer-stop"  type="button">Stop</button>
      <button id="timer-reset" type="button">Reset</button>
    </div>
    <div id="error-banner" role="alert" aria-live="assertive"></div>
  `;

  loadApp();
  FocusTimer.init();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── formatDisplay ───────────────────────────────────────────────────────────

describe('FocusTimer.formatDisplay', () => {
  test('1500 → "25:00"', () => {
    expect(FocusTimer.formatDisplay(1500)).toBe('25:00');
  });

  test('0 → "00:00"', () => {
    expect(FocusTimer.formatDisplay(0)).toBe('00:00');
  });

  test('65 → "01:05"', () => {
    expect(FocusTimer.formatDisplay(65)).toBe('01:05');
  });

  test('59 → "00:59"', () => {
    expect(FocusTimer.formatDisplay(59)).toBe('00:59');
  });

  test('60 → "01:00"', () => {
    expect(FocusTimer.formatDisplay(60)).toBe('01:00');
  });

  test('1499 → "24:59"', () => {
    expect(FocusTimer.formatDisplay(1499)).toBe('24:59');
  });
});

// ─── init ────────────────────────────────────────────────────────────────────

describe('FocusTimer.init', () => {
  test('sets #timer-display to "25:00"', () => {
    expect(document.getElementById('timer-display').textContent).toBe('25:00');
  });

  test('initialises with running = false', () => {
    expect(FocusTimer._getState().running).toBe(false);
  });

  test('initialises with remainingSeconds = 1500', () => {
    expect(FocusTimer._getState().remainingSeconds).toBe(1500);
  });

  test('initialises with intervalId = null', () => {
    expect(FocusTimer._getState().intervalId).toBeNull();
  });
});

// ─── start() ─────────────────────────────────────────────────────────────────

describe('FocusTimer.start', () => {
  test('Req 4.1: start from stopped → running becomes true', () => {
    FocusTimer.start();
    expect(FocusTimer._getState().running).toBe(true);
  });

  test('Req 4.1: start from stopped → intervalId is set (not null)', () => {
    FocusTimer.start();
    expect(FocusTimer._getState().intervalId).not.toBeNull();
  });

  test('Req 4.1: start from stopped → countdown decrements after 1 second', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(1000);
    expect(FocusTimer._getState().remainingSeconds).toBe(1499);
  });

  test('Req 4.1: start from stopped → display updates to "24:59" after 1 second', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(1000);
    expect(document.getElementById('timer-display').textContent).toBe('24:59');
  });

  test('Req 4.2: start from paused → resumes from remaining time (not from 25:00)', () => {
    // Simulate a pause at 1490 seconds remaining
    FocusTimer._setRemaining(1490);
    FocusTimer.start();
    jest.advanceTimersByTime(1000);
    expect(FocusTimer._getState().remainingSeconds).toBe(1489);
  });

  test('Req 4.6: double-start does not create duplicate intervals', () => {
    FocusTimer.start();
    const firstIntervalId = FocusTimer._getState().intervalId;
    FocusTimer.start(); // second call should be ignored
    const secondIntervalId = FocusTimer._getState().intervalId;
    // The intervalId should not change — still the same interval
    expect(secondIntervalId).toBe(firstIntervalId);
  });

  test('Req 4.6: double-start does not accelerate countdown', () => {
    FocusTimer.start();
    FocusTimer.start(); // ignored
    jest.advanceTimersByTime(2000); // 2 ticks
    // Should only have decremented by 2, not 4
    expect(FocusTimer._getState().remainingSeconds).toBe(1498);
  });
});

// ─── stop() ──────────────────────────────────────────────────────────────────

describe('FocusTimer.stop', () => {
  test('Req 4.3: stop while running → running becomes false', () => {
    FocusTimer.start();
    FocusTimer.stop();
    expect(FocusTimer._getState().running).toBe(false);
  });

  test('Req 4.3: stop while running → intervalId becomes null', () => {
    FocusTimer.start();
    FocusTimer.stop();
    expect(FocusTimer._getState().intervalId).toBeNull();
  });

  test('Req 4.3: stop while running → remainingSeconds is NOT reset', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(3000); // tick 3 times
    const remaining = FocusTimer._getState().remainingSeconds;
    FocusTimer.stop();
    // remainingSeconds should stay at the paused value, not 1500
    expect(FocusTimer._getState().remainingSeconds).toBe(remaining);
    expect(FocusTimer._getState().remainingSeconds).toBe(1497);
  });

  test('Req 4.3: stop while running → display still shows paused time (not 25:00)', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(5000); // tick 5 times → 24:55
    FocusTimer.stop();
    expect(document.getElementById('timer-display').textContent).toBe('24:55');
  });

  test('Req 4.3: stop while running → timer no longer ticks after stop', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(2000);
    FocusTimer.stop();
    const frozenAt = FocusTimer._getState().remainingSeconds;
    jest.advanceTimersByTime(5000); // more time passes — should NOT decrement
    expect(FocusTimer._getState().remainingSeconds).toBe(frozenAt);
  });

  test('Req 4.4: stop while already stopped → running stays false (no-op)', () => {
    // Not started — already stopped
    expect(FocusTimer._getState().running).toBe(false);
    FocusTimer.stop(); // should be a no-op
    expect(FocusTimer._getState().running).toBe(false);
  });

  test('Req 4.4: stop while already stopped → intervalId stays null (no-op)', () => {
    FocusTimer.stop(); // called without ever starting
    expect(FocusTimer._getState().intervalId).toBeNull();
  });

  test('Req 4.4: stop while already stopped → remainingSeconds unchanged', () => {
    FocusTimer.stop();
    expect(FocusTimer._getState().remainingSeconds).toBe(1500);
  });
});

// ─── reset() ─────────────────────────────────────────────────────────────────

describe('FocusTimer.reset', () => {
  test('Req 4.5: reset while running → stops the timer (running = false)', () => {
    FocusTimer.start();
    FocusTimer.reset();
    expect(FocusTimer._getState().running).toBe(false);
  });

  test('Req 4.5: reset while running → clears the interval (intervalId = null)', () => {
    FocusTimer.start();
    FocusTimer.reset();
    expect(FocusTimer._getState().intervalId).toBeNull();
  });

  test('Req 4.5: reset while running → restores remainingSeconds to 1500', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(10000); // 10 ticks
    FocusTimer.reset();
    expect(FocusTimer._getState().remainingSeconds).toBe(1500);
  });

  test('Req 4.5: reset while running → display shows "25:00"', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(10000);
    FocusTimer.reset();
    expect(document.getElementById('timer-display').textContent).toBe('25:00');
  });

  test('Req 4.5: reset while stopped → restores remainingSeconds to 1500', () => {
    FocusTimer._setRemaining(800); // manually wind timer down
    FocusTimer.reset();
    expect(FocusTimer._getState().remainingSeconds).toBe(1500);
  });

  test('Req 4.5: reset while stopped → display shows "25:00"', () => {
    FocusTimer._setRemaining(800);
    FocusTimer.reset();
    expect(document.getElementById('timer-display').textContent).toBe('25:00');
  });

  test('Req 4.5: after reset, timer does NOT continue ticking', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(2000);
    FocusTimer.reset();
    jest.advanceTimersByTime(3000); // advance time — should NOT decrement
    expect(FocusTimer._getState().remainingSeconds).toBe(1500);
  });

  test('Req 4.5: after reset, start works again from 25:00', () => {
    FocusTimer.start();
    jest.advanceTimersByTime(5000);
    FocusTimer.reset();
    FocusTimer.start();
    jest.advanceTimersByTime(2000);
    expect(FocusTimer._getState().remainingSeconds).toBe(1498);
  });
});

// ─── Button wiring ────────────────────────────────────────────────────────────

describe('FocusTimer button wiring', () => {
  test('clicking #timer-start calls start() — running becomes true', () => {
    document.getElementById('timer-start').click();
    expect(FocusTimer._getState().running).toBe(true);
  });

  test('clicking #timer-stop while running pauses the timer', () => {
    document.getElementById('timer-start').click();
    expect(FocusTimer._getState().running).toBe(true);
    document.getElementById('timer-stop').click();
    expect(FocusTimer._getState().running).toBe(false);
  });

  test('clicking #timer-reset restores display to "25:00"', () => {
    document.getElementById('timer-start').click();
    jest.advanceTimersByTime(5000);
    document.getElementById('timer-reset').click();
    expect(document.getElementById('timer-display').textContent).toBe('25:00');
  });

  test('clicking #timer-start twice does not create duplicate intervals', () => {
    document.getElementById('timer-start').click();
    const id1 = FocusTimer._getState().intervalId;
    document.getElementById('timer-start').click();
    const id2 = FocusTimer._getState().intervalId;
    expect(id2).toBe(id1);
  });
});
