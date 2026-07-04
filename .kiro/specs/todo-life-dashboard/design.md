# Design Document: To-do List Life Dashboard

## Overview

The To-do List Life Dashboard is a single-page web application (SPA) built entirely with plain HTML5, CSS3, and Vanilla JavaScript (ES6+). It runs directly from the file system in a modern browser with zero build step, zero backend, and zero external dependencies.

The dashboard provides four self-contained widgets on one page:

- **Greeting Widget** — live clock, date, and time-of-day greeting
- **Focus Timer** — 25-minute countdown with Start / Stop / Reset controls and an audio chime
- **To-Do List** — add / edit / complete / delete tasks, persisted in `localStorage`
- **Quick Links** — add / open / delete bookmark buttons, persisted in `localStorage`

All state that must survive a page reload is serialised to JSON and written to `localStorage` immediately after every change.

---

## Architecture

The app is deliberately single-file JavaScript (`js/app.js`) with no module bundler, no import/export (to preserve `file://` compatibility), and no framework.

### High-Level Architecture

```
index.html
├── <link> css/style.css
└── <script> js/app.js
     ├── StorageManager   – thin wrapper around localStorage
     ├── GreetingWidget   – clock/date/greeting via setInterval
     ├── FocusTimer       – countdown via setInterval + AudioContext
     ├── TodoList         – CRUD + localStorage via StorageManager
     └── QuickLinks       – CRUD + localStorage via StorageManager
```

### Execution Model

1. `DOMContentLoaded` fires → each widget module initialises itself.
2. `GreetingWidget` starts a 1-second `setInterval` for the live clock; the greeting is recalculated every tick.
3. `FocusTimer` manages its own `setInterval` (started/stopped on user action).
4. `TodoList` and `QuickLinks` each call `StorageManager.load()` at startup, render from the returned array, and call `StorageManager.save()` after every mutation.
5. A `beforeunload` handler triggers a final `StorageManager.save()` for both data stores.

### Module Boundaries (within a single file)

Each widget is encapsulated in an IIFE or clearly-delimited block with a documented public interface. No global state leaks between widgets except the shared `StorageManager`.

---

## Components and Interfaces

### 1. StorageManager

A thin utility wrapping `localStorage` with JSON serialisation and error handling.



### 2. GreetingWidget

Owns the `#greeting-widget` DOM section.



### 3. FocusTimer

Owns the `#timer-widget` DOM section.


State is held in closure variables: `remainingSeconds`, `running`, `intervalId`.

### 4. TodoList

Owns the `#todo-widget` DOM section.



### 5. QuickLinks

Owns the `#links-widget` DOM section.



---

## Data Models

### Task

```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString()
  text:      string,   // 1–500 characters, trimmed
  completed: boolean   // false = incomplete, true = complete
}
```

Stored as a JSON array in `localStorage` under the key `"todo-life-dashboard:tasks"`.

### Link

```js
{
  id:    string,  // crypto.randomUUID() or Date.now().toString()
  label: string,  // 1–50 characters, trimmed
  url:   string   // valid http:// or https:// URL, max 2048 chars
}
```

Stored as a JSON array in `localStorage` under the key `"todo-life-dashboard:links"`.

### Timer State

Timer state (remaining seconds, running flag) is **not** persisted between sessions. It resets to `1500` (25 minutes) on every page load, matching Requirement 3.1.

### Greeting State

No persistence needed — derived from the live system clock on every tick.

---

## Correctness Properties

### Property 1: Greeting maps every hour to a message

For any integer hour in [0, 23], `GreetingWidget.getGreeting(hour)` SHALL return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, and the returned value SHALL match the boundary rules in Requirement 2.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

---

### Property 2: Time format is always valid HH:MM AM/PM

For any `Date` object, `GreetingWidget.formatTime(date)` SHALL return a string that matches the pattern `^\d{2}:\d{2} (AM|PM)$`.

**Validates: Requirement 1.1**

---

### Property 3: Timer display format is always valid MM:SS

For any integer `n` in [0, 1500] representing remaining seconds, `FocusTimer.formatDisplay(n)` SHALL return a string that matches the pattern `^\d{2}:\d{2}$`.

**Validates: Requirement 3.3**

---

### Property 4: Task addition round-trip (persistence)

For any non-empty trimmed string `text`, after calling `TodoList.addTask(text)`, reading the value stored under `"todo-life-dashboard:tasks"` from `localStorage` and parsing it as JSON SHALL yield an array whose last element has `text` equal to `text.trim()` and `completed` equal to `false`.

**Validates: Requirements 5.2, 5.4, 9.2**

---

### Property 5: Whitespace-only task descriptions are always rejected

For any string composed entirely of whitespace characters, `TodoList._validateText(s)` SHALL return `{ ok: false }`, and the task list SHALL remain unchanged.

**Validates: Requirement 5.3**

---

### Property 6: Task edit round-trip preserves identity

For any existing task with `id`, after calling `TodoList.editTask(id, newText)` with a valid non-empty `newText`, the task collection SHALL contain exactly one task with that `id`, its `text` SHALL equal `newText.trim()`, and its `completed` state SHALL be unchanged.

**Validates: Requirements 6.3, 6.6**

---

### Property 7: Completion toggle is an involution

For any task `t`, toggling its completion state twice SHALL leave `t.completed` equal to its original value. In other words, `toggle(toggle(t)).completed === t.completed`.

**Validates: Requirements 7.2, 7.3, 7.4**

---

### Property 8: Task deletion removes exactly the target task

For any task list of length `n` (n ≥ 1) and any valid `id` in that list, after calling `TodoList.deleteTask(id)`, the list SHALL have length `n − 1`, SHALL NOT contain any task with that `id`, and every other task SHALL be present with its state unmodified.

**Validates: Requirements 8.2, 8.3**

---

### Property 9: Link URL validation accepts only http/https

For any string `url`, `QuickLinks._validateUrl(url)` SHALL return `true` if and only if `url` starts with `http://` or `https://` and is a syntactically valid URL as defined by the WHATWG URL standard.

**Validates: Requirements 10.2, 10.3, 11.2**

---

### Property 10: Link addition round-trip (persistence)

For any valid label and URL pair, after calling `QuickLinks.addLink(label, url)`, reading the value stored under `"todo-life-dashboard:links"` from `localStorage` and parsing it as JSON SHALL yield an array whose last element has `label` equal to `label` and `url` equal to `url`.

**Validates: Requirements 10.2, 10.4, 13.2**

---

### Property 11: Storage load/save round-trip preserves data

For any array of objects `data`, calling `StorageManager.save(key, data)` followed immediately by `StorageManager.load(key)` SHALL return an array that is deeply equal to `data`.

**Validates: Requirements 9.1, 9.2, 13.1, 13.2**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| `localStorage` unavailable (private mode, quota) | `save()` or `load()` throws | Show non-blocking error banner; data kept in memory for the session |
| Invalid JSON in `localStorage` on load | `JSON.parse` throws | Initialise with empty collection; show error banner |
| Empty / whitespace task text | `_validateText` returns false | Add red border / `aria-invalid` on input; do not mutate state |
| Empty label or invalid URL for link | `_validateUrl` / label check fails | Highlight offending field; do not mutate state |
| Malformed URL at link-open time | `_validateUrl` returns false | Show error banner; suppress `window.open` |
| Timer completes | `remainingSeconds === 0` | Stop interval, flash display (CSS animation), play chime |

**Error Banner**: A `<div id="error-banner" role="alert" aria-live="assertive">` at the top of the page. It auto-dismisses after 5 seconds or on user click.

---

## Testing Strategy

### Unit Tests (example-based)

- `GreetingWidget.getGreeting(hour)` — one example per boundary: 0, 4, 5, 11, 12, 16, 17, 20, 21, 23
- `GreetingWidget.formatTime` / `formatDate` — representative examples
- `FocusTimer.formatDisplay` — 0, 1, 59, 60, 1499, 1500
- `TodoList._validateText` — empty string, spaces-only, single character, 500-char string
- `QuickLinks._validateUrl` — http, https, ftp, no-scheme, empty string
- `StorageManager.load` with invalid JSON → returns null and shows error banner
- Timer state transitions: start from stopped, stop while running, resume from paused, stop while stopped (no-op), reset while running

### Property-Based Tests

Library: **fast-check** (Node.js). Each property test runs a minimum of **100 iterations**.

| Property | Generator | Assertion |
|---|---|---|
| P1: Greeting maps every hour | `fc.integer({ min: 0, max: 23 })` | result ∈ {Good Morning, Good Afternoon, Good Evening, Good Night} AND matches boundary |
| P2: Time format | `fc.date()` | result matches `^\d{2}:\d{2} (AM|PM)$` |
| P3: Timer display | `fc.integer({ min: 0, max: 1500 })` | result matches `^\d{2}:\d{2}$` |
| P4: Task add round-trip | `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` | parsed localStorage has task with correct text, completed=false |
| P5: Whitespace rejection | `fc.stringOf(fc.constantFrom(' ','\t','\n'), { minLength: 1 })` | validateText returns false, list unchanged |
| P6: Task edit round-trip | random task + valid newText | task updated correctly, completed unchanged |
| P7: Toggle involution | random task with arbitrary completed | double-toggle restores original completed state |
| P8: Delete removes exactly one | `fc.array(taskArb, { minLength: 1 })` | length −1, target absent, others intact |
| P9: URL validation | `fc.webUrl()` / `fc.string()` | accepts http/https, rejects others |
| P10: Link add round-trip | valid label + URL | parsed localStorage has link with correct label and url |
| P11: Storage round-trip | `fc.array(fc.object())` | load after save returns deeply equal data |

### Integration / Smoke Tests (manual)

- Open `index.html` in Chrome, Firefox, Edge, Safari — verify all four widgets render without errors.
- Disable `localStorage` (incognito mode) — verify error banner appears, app still renders.
- Add tasks and links, refresh page — verify data is restored.
- Run timer to completion — verify flash and chime fire.
- Resize viewport from 320px to 1920px — verify no horizontal overflow.
