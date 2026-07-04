# Implementation Plan: To-do List Life Dashboard

## Overview

This plan implements the To-do List Life Dashboard — a single-page vanilla JS/HTML/CSS web app with four widgets: Greeting, Focus Timer, To-Do List, and Quick Links. All state is persisted to `localStorage`. Tasks are ordered so each builds on the previous: file structure first, shared utilities second, then each widget, then tests, then QA.

## Tasks

- [x] 1. Set up project file structure
  - Create `index.html` at the project root with the standard HTML5 boilerplate, linking `css/style.css` and `js/app.js`.
  - Create `css/style.css` as an empty file.
  - Create `js/app.js` as an empty file.
  - **Acceptance criteria**: Opening `index.html` in a browser shows a blank page with no console errors; no external scripts, CDN links, or frameworks present.

- [x] 2. Implement StorageManager utility
  - In `js/app.js`, implement a `StorageManager` object with `load(key)` and `save(key, data)` methods.
  - `load` reads from `localStorage`, parses JSON, and returns the array; returns `null` and calls `showErrorBanner` on failure or invalid JSON.
  - `save` serialises data to JSON and writes to `localStorage`; returns `{ ok: true }` on success or `{ ok: false, error }` on failure and calls `showErrorBanner`.
  - Implement a `showErrorBanner(message)` helper that displays a `#error-banner` div with `role="alert"` and auto-dismisses after 5 seconds.
  - **Acceptance criteria**: `StorageManager.save('test', [{a:1}])` followed by `StorageManager.load('test')` returns `[{a:1}]`; mocking `localStorage` to throw results in the error banner being shown.

- [ ] 3. Build the HTML skeleton and CSS base styles
  - Add the four widget sections to `index.html`: `#greeting-widget`, `#timer-widget`, `#todo-widget`, `#links-widget`.
  - Add the `#error-banner` element (role="alert", aria-live="assertive").
  - In `css/style.css`, define CSS custom properties for the colour scheme, font family, and spacing scale.
  - Set `body { font-size: 16px }` and implement a responsive grid layout that places all four widgets on one page without horizontal scroll at 1024 px+, and remains usable from 320 px to 1920 px.
  - **Acceptance criteria**: All four widget containers are visible at 1024 px+ with no horizontal scrollbar; layout reflows cleanly at 320 px; consistent colour scheme and spacing across widgets.

- [ ] 4. Implement GreetingWidget — time, date, and greeting display
  - Implement `GreetingWidget.formatTime(date)` returning a string matching `^\d{2}:\d{2} (AM|PM)$` (12-hour, zero-padded).
  - Implement `GreetingWidget.formatDate(date)` returning a string in `"Day, Month DD, YYYY"` format.
  - Implement `GreetingWidget.getGreeting(hour)` applying the boundary rules: 5–11 → "Good Morning", 12–16 → "Good Afternoon", 17–20 → "Good Evening", 21–4 → "Good Night"; fall back to "Good Morning" on error.
  - Implement `GreetingWidget.init()` that renders immediately and starts a 1-second `setInterval` calling `_tick()`, which updates the time, date, and greeting in the DOM.
  - **Acceptance criteria**: Displays correct time, date, and greeting on load; time updates every new minute; greeting changes when the hour boundary is crossed without a page reload.

- [x] 5. Implement FocusTimer — countdown and display
  - Implement `FocusTimer.formatDisplay(totalSeconds)` returning `MM:SS` with zero-padding (e.g., `"25:00"`, `"04:59"`).
  - Implement `FocusTimer.init()` that renders `25:00` in `#timer-widget` and stores `remainingSeconds = 1500`, `running = false`, `intervalId = null` in closure.
  - Implement `FocusTimer._tick()` that decrements `remainingSeconds`, updates the display, and calls `_onComplete()` when it reaches 0.
  - Implement `FocusTimer._playChime()` using the Web Audio API (`AudioContext`) to generate a brief chime tone — no external audio files.
  - Implement `FocusTimer._flash()` that adds a CSS animation class to the timer display for a visual flash effect.
  - Implement `FocusTimer._onComplete()` that stops the interval, calls `_flash()`, and calls `_playChime()`.
  - **Acceptance criteria**: Timer shows `25:00` on load; `formatDisplay(0)` returns `"00:00"`; `formatDisplay(65)` returns `"01:05"`; timer flashes and plays chime at countdown completion.

- [x] 6. Implement FocusTimer — Start, Stop, Reset controls
  - Add Start, Stop, and Reset `<button>` elements inside `#timer-widget` in `index.html`.
  - Implement `FocusTimer.start()`: ignored if `running === true`; otherwise sets `running = true`, starts `setInterval(_tick, 1000)`.
  - Implement `FocusTimer.stop()`: ignored if `running === false`; otherwise clears the interval and sets `running = false` without changing `remainingSeconds`.
  - Implement `FocusTimer.reset()`: calls `stop()`, sets `remainingSeconds = 1500`, updates display to `25:00`.
  - Wire button click listeners to `start()`, `stop()`, `reset()` in `init()`.
  - **Acceptance criteria**: Start begins countdown; Stop pauses without reset; Reset restores `25:00`; double-start does not create duplicate intervals; Stop while stopped is a no-op.

- [ ] 7. Implement TodoList — data model and rendering
  - Define the `Task` schema: `{ id, text, completed }`.
  - Implement `TodoList._validateText(text)` returning `{ ok: true, trimmed }` for non-empty strings after trim, and `{ ok: false }` for empty/whitespace-only.
  - Implement `TodoList._persist()` calling `StorageManager.save('todo-life-dashboard:tasks', tasks)` and showing an error banner on failure.
  - Implement `TodoList._render()` that clears and rebuilds the task list DOM from the `tasks` array; each task item includes a checkbox, display text, Edit button, and Delete button; completed tasks show strikethrough styling.
  - Implement `TodoList.init()` that calls `StorageManager.load('todo-life-dashboard:tasks')`, initialises `tasks` from the result (or `[]` on null), and calls `_render()`.
  - **Acceptance criteria**: Tasks saved in a previous session are displayed on load; empty `localStorage` renders an empty list; invalid JSON renders empty list with error banner.

- [x] 8. Implement TodoList — Add task
  - Add a text `<input>` (maxlength 500), an Add `<button>`, and an error-indication area inside `#todo-widget` in `index.html`.
  - Implement `TodoList.addTask(text)`: call `_validateText`; on failure apply `aria-invalid` and a red-border CSS class to the input and return early; on success create a new `Task` object, push to `tasks`, call `_render()` and `_persist()`, clear the input.
  - Wire the Add button click and Enter keypress on the input to `addTask(input.value)`.
  - **Acceptance criteria**: Valid text adds task and clears input; whitespace-only shows error state on input; task is present in `localStorage` immediately after addition.

- [ ] 9. Implement TodoList — Edit task
  - Implement `TodoList.editTask(id, newText)`: find task by id; call `_validateText(newText)`; on failure restore original text and return to display mode without saving; on success update `task.text = trimmed`, call `_render()` and `_persist()`.
  - In `_render()`, wire Edit button click to switch that task item into edit mode (replace text span with a pre-filled input + Save and Cancel buttons).
  - Wire Save button and Enter keypress to `editTask(id, input.value)`; wire Cancel button and Escape keypress to `_render()` without saving.
  - **Acceptance criteria**: Editing a task updates its text and persists it; saving whitespace restores original text; Cancel discards changes; Escape discards changes.

- [-] 10. Implement TodoList — Complete and Delete tasks
  - Implement `TodoList.toggleTask(id)`: find task by id, flip `completed`, call `_render()` and `_persist()`.
  - Implement `TodoList.deleteTask(id)`: filter out the task with that id, call `_render()` and `_persist()`.
  - In `_render()`, wire checkbox change to `toggleTask(id)` and Delete button click to `deleteTask(id)`.
  - Add `window.addEventListener('beforeunload', () => TodoList._persist())` in `TodoList.init()` to ensure final write on page close.
  - **Acceptance criteria**: Checking a task applies strikethrough; unchecking removes it; deletion removes only the target task; changes are persisted to `localStorage`; closing the page triggers a final persist.

- [ ] 11. Implement QuickLinks — data model and rendering
  - Define the `Link` schema: `{ id, label, url }`.
  - Implement `QuickLinks._validateUrl(url)` returning `true` if `url` starts with `http://` or `https://` and is parseable by the `URL` constructor; `false` otherwise.
  - Implement `QuickLinks._persist()` calling `StorageManager.save('todo-life-dashboard:links', links)` and showing an error banner on failure.
  - Implement `QuickLinks._render()` that clears and rebuilds the links grid; each link renders as a `<button>` with a label and a visible Delete button; an empty collection renders an empty-state message.
  - Implement `QuickLinks.init()` that loads from `localStorage`, initialises `links` (or `[]`), and calls `_render()`.
  - **Acceptance criteria**: Links saved in a previous session are displayed on load; all links deleted shows empty state message; invalid JSON shows error banner and renders empty panel.

- [ ] 12. Implement QuickLinks — Add, Open, and Delete links
  - Add a label `<input>` (maxlength 50), a URL `<input>` (maxlength 2048), and an Add `<button>` inside `#links-widget` in `index.html`.
  - Implement `QuickLinks.addLink(label, url)`: reject if label is empty or `_validateUrl(url)` is false (highlight offending field); otherwise create a new `Link` object, push to `links`, call `_render()` and `_persist()`.
  - Implement `QuickLinks.openLink(url)`: call `_validateUrl(url)`; if invalid, show error banner and return; otherwise call `window.open(url, '_blank')`.
  - Implement `QuickLinks.deleteLink(id)`: filter out the link, call `_render()` and `_persist()`.
  - In `_render()`, wire link button click to `openLink(link.url)` and Delete button click to `deleteLink(link.id)`.
  - Wire the Add button to `addLink(labelInput.value, urlInput.value)`.
  - **Acceptance criteria**: Valid label + http(s) URL adds a link button; missing or invalid URL rejects without changing the panel; clicking a link button opens the URL in a new tab; a malformed stored URL shows error and does not open a tab; Delete removes only the target link.

- [ ] 13. Write property-based tests
  - Set up `tests/properties.test.js` using **fast-check** as the PBT library.
  - Property 1 — `fc.integer({ min: 0, max: 23 })` → `getGreeting(hour)` is in `{Good Morning, Good Afternoon, Good Evening, Good Night}` and matches the correct boundary. Tag: `// Feature: todo-life-dashboard, Property 1: Greeting maps every hour to a message`.
  - Property 2 — `fc.date()` → `formatTime(date)` matches `^\d{2}:\d{2} (AM|PM)$`. Tag: Property 2.
  - Property 3 — `fc.integer({ min: 0, max: 1500 })` → `formatDisplay(n)` matches `^\d{2}:\d{2}$`. Tag: Property 3.
  - Property 4 — `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` → after `addTask(text)`, `localStorage` contains task with trimmed text and `completed: false`. Tag: Property 4.
  - Property 5 — `fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 })` → `_validateText(s).ok === false`, task list unchanged. Tag: Property 5.
  - Property 6 — random task + valid `newText` → after `editTask(id, newText)`, task text equals `newText.trim()`, `completed` unchanged. Tag: Property 6.
  - Property 7 — random task with arbitrary `completed` → toggle twice → `completed` equals original. Tag: Property 7.
  - Property 8 — `fc.array(taskArb, { minLength: 1 })` → `deleteTask(randomId)` → length decreases by 1, target absent, others intact. Tag: Property 8.
  - Property 9 — `fc.webUrl()` and `fc.string()` → `_validateUrl` returns `true` for http/https, `false` for others. Tag: Property 9.
  - Property 10 — valid label + URL → after `addLink`, `localStorage` contains link with correct label and url. Tag: Property 10.
  - Property 11 — `fc.array(fc.object())` → `save(key, data)` then `load(key)` returns deeply equal array. Tag: Property 11.
  - Each property test must run a minimum of **100 iterations**.
  - **Acceptance criteria**: All 11 property tests pass with 100+ iterations each.

- [ ] 14. Write unit tests for edge cases and state machine
  - Set up `tests/unit.test.js` for example-based unit tests.
  - Test `getGreeting` at every boundary hour: 0, 4, 5, 11, 12, 16, 17, 20, 21, 23.
  - Test `formatDisplay` at 0, 1, 59, 60, 1499, 1500.
  - Test `_validateText`: empty string, single space, tab-only, single non-whitespace character, 500-character string.
  - Test `_validateUrl`: `http://example.com`, `https://example.com`, `ftp://x`, no scheme, empty string.
  - Test `StorageManager.load` when `localStorage` contains invalid JSON — expect `null` returned and error banner shown.
  - Test timer state transitions: start from stopped; stop while running; resume from paused; stop while stopped (no-op); reset while running.
  - **Acceptance criteria**: All unit tests pass.

- [ ] 15. Cross-browser and responsive QA
  - Open `index.html` directly in Chrome 120+, Firefox 120+, Edge 120+, and Safari 17+; verify all four widgets render and function correctly with no console errors.
  - Test `localStorage` unavailability (incognito mode) — verify the error banner appears and the app still renders.
  - Add tasks and links, refresh the page — verify data persists correctly.
  - Run the timer to completion — verify the visual flash and audio chime fire.
  - Resize the viewport from 320 px to 1920 px — verify no horizontal overflow and all widgets remain usable.
  - Verify initial render completes within 2 seconds and all UI interactions respond within 100 ms.
  - **Acceptance criteria**: All manual QA checks pass in all four target browsers.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4, 5, 7, 11] },
    { "wave": 5, "tasks": [6, 8, 12] },
    { "wave": 6, "tasks": [9] },
    { "wave": 7, "tasks": [10] },
    { "wave": 8, "tasks": [13, 14] },
    { "wave": 9, "tasks": [15] }
  ]
}
```

## Notes

- All JavaScript must live in `js/app.js` (Requirement 14.4) — no modules, no bundler.
- No external frameworks, CDN scripts, or build tools are permitted (Requirement 14.1).
- `crypto.randomUUID()` is available in Chrome 92+, Firefox 95+, Edge 92+, Safari 15.4+. Fallback: `Date.now().toString()`.
- Web Audio API (`AudioContext`) is used for the chime — no external audio file needed.
- `localStorage` keys: `"todo-life-dashboard:tasks"` and `"todo-life-dashboard:links"`.
- Timer state is intentionally not persisted between sessions (Requirement 3.1 specifies initialisation to 25:00 on load).
- The property-based test suite (Task 13) requires **fast-check** as a dev dependency and can be run with Node.js.
