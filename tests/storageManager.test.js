/**
 * Tests for StorageManager and showErrorBanner — Task 2
 *
 * Run with:  npm test
 *
 * These tests cover:
 *  - save + load round-trip (acceptance criteria)
 *  - load when key is absent
 *  - load with invalid JSON → returns null, shows error banner
 *  - save when localStorage.setItem throws → returns { ok: false }, shows banner
 *  - showErrorBanner creates #error-banner if absent and auto-dismisses
 *
 * The test environment is jsdom (configured in package.json), which provides
 * window.localStorage and document.  app.js is loaded via require() using a
 * small shim that evaluates the script in the global scope so all var
 * declarations become accessible.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Evaluate app.js in the current jsdom window's global scope */
function loadApp() {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../js/app.js'),
    'utf8'
  );
  // Run in the jsdom window context so localStorage and document are real
  const script = new vm.Script(src);
  script.runInThisContext();
}

// ─── setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  // Fresh localStorage for every test
  localStorage.clear();

  // Remove any leftover banner element
  const old = document.getElementById('error-banner');
  if (old) old.remove();

  // Load (re-evaluate) app.js so we get a clean StorageManager
  loadApp();
});

// ─── StorageManager.save + load round-trip ───────────────────────────────────

describe('StorageManager — save and load round-trip', () => {
  test('save then load returns the original data', () => {
    // Acceptance criterion from the spec
    const result = StorageManager.save('test', [{ a: 1 }]);
    expect(result).toEqual({ ok: true });

    const loaded = StorageManager.load('test');
    expect(loaded).toEqual([{ a: 1 }]);
  });

  test('save then load preserves deeply nested objects', () => {
    const data = [{ id: '1', text: 'hello', completed: false }, { id: '2', nested: { x: [1, 2, 3] } }];
    StorageManager.save('deep', data);
    expect(StorageManager.load('deep')).toEqual(data);
  });

  test('save returns { ok: true } on success', () => {
    expect(StorageManager.save('k', [])).toEqual({ ok: true });
  });
});

// ─── StorageManager.load edge-cases ──────────────────────────────────────────

describe('StorageManager.load', () => {
  test('returns null (no banner) when key does not exist', () => {
    const result = StorageManager.load('nonexistent-key');
    expect(result).toBeNull();
    // No banner should have been created for a missing key
    const banner = document.getElementById('error-banner');
    const visible = banner && banner.style.display !== 'none';
    expect(visible).toBe(false);
  });

  test('returns null and shows error banner for invalid JSON', () => {
    localStorage.setItem('bad-json', '{ this is not valid JSON }');

    const result = StorageManager.load('bad-json');
    expect(result).toBeNull();

    const banner = document.getElementById('error-banner');
    expect(banner).not.toBeNull();
    expect(banner.style.display).toBe('block');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toMatch(/failed to load/i);
  });

  test('returns null and shows error banner when localStorage.getItem throws', () => {
    const original = localStorage.getItem.bind(localStorage);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('SecurityError: access denied');
    });

    const result = StorageManager.load('any-key');
    expect(result).toBeNull();

    const banner = document.getElementById('error-banner');
    expect(banner).not.toBeNull();
    expect(banner.style.display).toBe('block');

    // Restore (jest.restoreAllMocks is not set globally so restore manually)
    Storage.prototype.getItem.mockRestore();
  });
});

// ─── StorageManager.save error path ──────────────────────────────────────────

describe('StorageManager.save — error handling', () => {
  test('returns { ok: false, error } and shows banner when setItem throws', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });

    const result = StorageManager.save('key', [{ x: 1 }]);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();

    const banner = document.getElementById('error-banner');
    expect(banner).not.toBeNull();
    expect(banner.style.display).toBe('block');
    expect(banner.getAttribute('role')).toBe('alert');

    Storage.prototype.setItem.mockRestore();
  });
});

// ─── showErrorBanner ─────────────────────────────────────────────────────────

describe('showErrorBanner', () => {
  test('creates #error-banner if not present in DOM', () => {
    expect(document.getElementById('error-banner')).toBeNull();
    showErrorBanner('test message');
    const banner = document.getElementById('error-banner');
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.getAttribute('aria-live')).toBe('assertive');
    expect(banner.style.display).toBe('block');
  });

  test('uses existing #error-banner element when present', () => {
    const el = document.createElement('div');
    el.id = 'error-banner';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'assertive');
    document.body.appendChild(el);

    showErrorBanner('existing banner');
    const allBanners = document.querySelectorAll('#error-banner');
    expect(allBanners.length).toBe(1);
    expect(allBanners[0].textContent).toBe('existing banner');
  });

  test('sets message as textContent', () => {
    showErrorBanner('something went wrong');
    expect(document.getElementById('error-banner').textContent).toBe('something went wrong');
  });

  test('auto-dismisses after 5 seconds', () => {
    jest.useFakeTimers();
    showErrorBanner('will dismiss');

    const banner = document.getElementById('error-banner');
    expect(banner.style.display).toBe('block');

    jest.advanceTimersByTime(5000);
    expect(banner.style.display).toBe('none');

    jest.useRealTimers();
  });

  test('dismisses on click', () => {
    showErrorBanner('click me away');
    const banner = document.getElementById('error-banner');
    banner.click();
    expect(banner.style.display).toBe('none');
  });

  test('resets auto-dismiss timer on repeated calls', () => {
    jest.useFakeTimers();
    showErrorBanner('first');
    jest.advanceTimersByTime(3000); // 3 s in — not yet dismissed

    showErrorBanner('second');     // should restart the 5-second timer
    jest.advanceTimersByTime(3000); // 3 more seconds — still within new 5-s window
    expect(document.getElementById('error-banner').style.display).toBe('block');

    jest.advanceTimersByTime(2001); // now past 5 s from the second call
    expect(document.getElementById('error-banner').style.display).toBe('none');

    jest.useRealTimers();
  });
});
