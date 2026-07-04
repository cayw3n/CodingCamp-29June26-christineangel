/**
 * Tests for GreetingWidget — Task 4
 *
 * Covers:
 *  - formatTime: 12-hour HH:MM AM/PM output (Req 1.1)
 *  - formatDate: "Day, Month DD, YYYY" format (Req 1.3)
 *  - getGreeting: boundary rules for all hours (Req 2.1–2.4, 2.6)
 *  - _tick: updates DOM elements correctly
 *
 * Run with:  npm test
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  localStorage.clear();
  const old = document.getElementById('error-banner');
  if (old) old.remove();
  loadApp();
});

// ─── formatTime ──────────────────────────────────────────────────────────────

describe('GreetingWidget.formatTime', () => {
  test('midnight (0:00) → "12:00 AM"', () => {
    const d = new Date(2025, 0, 1, 0, 0, 0);
    expect(GreetingWidget.formatTime(d)).toBe('12:00 AM');
  });

  test('noon (12:00) → "12:00 PM"', () => {
    const d = new Date(2025, 0, 1, 12, 0, 0);
    expect(GreetingWidget.formatTime(d)).toBe('12:00 PM');
  });

  test('9:05 AM → "09:05 AM" (zero-padded)', () => {
    const d = new Date(2025, 0, 1, 9, 5, 0);
    expect(GreetingWidget.formatTime(d)).toBe('09:05 AM');
  });

  test('13:45 → "01:45 PM"', () => {
    const d = new Date(2025, 0, 1, 13, 45, 0);
    expect(GreetingWidget.formatTime(d)).toBe('01:45 PM');
  });

  test('23:59 → "11:59 PM"', () => {
    const d = new Date(2025, 0, 1, 23, 59, 0);
    expect(GreetingWidget.formatTime(d)).toBe('11:59 PM');
  });

  test('1:01 → "01:01 AM" (hour and minute both zero-padded)', () => {
    const d = new Date(2025, 0, 1, 1, 1, 0);
    expect(GreetingWidget.formatTime(d)).toBe('01:01 AM');
  });

  test('always matches ^\\d{2}:\\d{2} (AM|PM)$ pattern', () => {
    const pattern = /^\d{2}:\d{2} (AM|PM)$/;
    // Test every hour and a few minutes
    for (let h = 0; h < 24; h++) {
      for (let m of [0, 15, 30, 45, 59]) {
        const d = new Date(2025, 5, 30, h, m, 0);
        expect(GreetingWidget.formatTime(d)).toMatch(pattern);
      }
    }
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('GreetingWidget.formatDate', () => {
  test('"Monday, June 30, 2025" — a known Monday', () => {
    // June 30, 2025 is a Monday
    const d = new Date(2025, 5, 30); // month is 0-indexed
    expect(GreetingWidget.formatDate(d)).toBe('Monday, June 30, 2025');
  });

  test('"Wednesday, January 1, 2025" — New Year\'s Day 2025', () => {
    const d = new Date(2025, 0, 1);
    expect(GreetingWidget.formatDate(d)).toBe('Wednesday, January 1, 2025');
  });

  test('"Friday, December 25, 2026" — Christmas 2026', () => {
    const d = new Date(2026, 11, 25);
    expect(GreetingWidget.formatDate(d)).toBe('Friday, December 25, 2026');
  });

  test('single-digit day is not zero-padded', () => {
    // March 5, 2025
    const d = new Date(2025, 2, 5);
    expect(GreetingWidget.formatDate(d)).toMatch(/5,/);
    expect(GreetingWidget.formatDate(d)).not.toMatch(/05,/);
  });

  test('format matches "Day, Month DD, YYYY" pattern', () => {
    const pattern = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/;
    const d = new Date(2025, 5, 30);
    expect(GreetingWidget.formatDate(d)).toMatch(pattern);
  });
});

// ─── getGreeting ─────────────────────────────────────────────────────────────

describe('GreetingWidget.getGreeting — boundary rules', () => {
  // Good Night: 21–4
  test('hour 0 → "Good Night"',   () => expect(GreetingWidget.getGreeting(0)).toBe('Good Night'));
  test('hour 1 → "Good Night"',   () => expect(GreetingWidget.getGreeting(1)).toBe('Good Night'));
  test('hour 4 → "Good Night"',   () => expect(GreetingWidget.getGreeting(4)).toBe('Good Night'));

  // Good Morning: 5–11
  test('hour 5 → "Good Morning"',  () => expect(GreetingWidget.getGreeting(5)).toBe('Good Morning'));
  test('hour 8 → "Good Morning"',  () => expect(GreetingWidget.getGreeting(8)).toBe('Good Morning'));
  test('hour 11 → "Good Morning"', () => expect(GreetingWidget.getGreeting(11)).toBe('Good Morning'));

  // Good Afternoon: 12–16
  test('hour 12 → "Good Afternoon"', () => expect(GreetingWidget.getGreeting(12)).toBe('Good Afternoon'));
  test('hour 14 → "Good Afternoon"', () => expect(GreetingWidget.getGreeting(14)).toBe('Good Afternoon'));
  test('hour 16 → "Good Afternoon"', () => expect(GreetingWidget.getGreeting(16)).toBe('Good Afternoon'));

  // Good Evening: 17–20
  test('hour 17 → "Good Evening"', () => expect(GreetingWidget.getGreeting(17)).toBe('Good Evening'));
  test('hour 19 → "Good Evening"', () => expect(GreetingWidget.getGreeting(19)).toBe('Good Evening'));
  test('hour 20 → "Good Evening"', () => expect(GreetingWidget.getGreeting(20)).toBe('Good Evening'));

  // Good Night: 21–23
  test('hour 21 → "Good Night"', () => expect(GreetingWidget.getGreeting(21)).toBe('Good Night'));
  test('hour 23 → "Good Night"', () => expect(GreetingWidget.getGreeting(23)).toBe('Good Night'));

  // Fallback
  test('NaN input → "Good Morning" (fallback)', () => {
    expect(GreetingWidget.getGreeting(NaN)).toBe('Good Morning');
  });

  test('undefined input → "Good Morning" (fallback)', () => {
    expect(GreetingWidget.getGreeting(undefined)).toBe('Good Morning');
  });

  test('all hours 0-23 return one of the four valid greetings', () => {
    const valid = new Set(['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night']);
    for (let h = 0; h <= 23; h++) {
      expect(valid.has(GreetingWidget.getGreeting(h))).toBe(true);
    }
  });
});

// ─── _tick DOM updates ────────────────────────────────────────────────────────

describe('GreetingWidget._tick', () => {
  beforeEach(() => {
    // Set up the required DOM elements
    document.body.innerHTML = `
      <div id="greeting-text"></div>
      <div id="current-time"></div>
      <div id="current-date"></div>
    `;
  });

  test('updates #current-time with a valid HH:MM AM/PM string', () => {
    GreetingWidget._tick();
    const text = document.getElementById('current-time').textContent;
    expect(text).toMatch(/^\d{2}:\d{2} (AM|PM)$/);
  });

  test('updates #current-date with a valid "Day, Month DD, YYYY" string', () => {
    GreetingWidget._tick();
    const text = document.getElementById('current-date').textContent;
    const pattern = /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/;
    expect(text).toMatch(pattern);
  });

  test('updates #greeting-text with a valid greeting', () => {
    GreetingWidget._tick();
    const text = document.getElementById('greeting-text').textContent;
    const valid = ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'];
    expect(valid).toContain(text);
  });

  test('does not throw when DOM elements are absent', () => {
    document.body.innerHTML = '';
    expect(() => GreetingWidget._tick()).not.toThrow();
  });
});
