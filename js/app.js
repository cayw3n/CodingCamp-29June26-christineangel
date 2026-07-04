/* ==========================================================================
   To-do Life Dashboard — app.js
   Single-file vanilla JS. No modules, no bundler, no external dependencies.
   ========================================================================== */

/* --------------------------------------------------------------------------
   showErrorBanner(message)
   Displays #error-banner with the given message. Auto-dismisses after 5 s.
   Also dismisses immediately on click.
   -------------------------------------------------------------------------- */
function showErrorBanner(message) {
  var banner = document.getElementById('error-banner');
  if (!banner) {
    // Create the banner if it isn't in the DOM yet (e.g. during tests)
    banner = document.createElement('div');
    banner.id = 'error-banner';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'assertive');
    // Insert as first child of body so it's always visible
    var body = document.body;
    if (body) {
      body.insertBefore(banner, body.firstChild);
    }
  }

  banner.textContent = message;
  banner.style.display = 'block';

  // Clear any pending auto-dismiss so repeated calls restart the timer
  if (banner._dismissTimer) {
    clearTimeout(banner._dismissTimer);
  }

  banner._dismissTimer = setTimeout(function () {
    banner.style.display = 'none';
    banner._dismissTimer = null;
  }, 5000);

  // Dismiss immediately on click
  banner.onclick = function () {
    clearTimeout(banner._dismissTimer);
    banner._dismissTimer = null;
    banner.style.display = 'none';
  };
}

/* --------------------------------------------------------------------------
   StorageManager
   Thin wrapper around localStorage with JSON serialisation and error
   handling. Used by TodoList and QuickLinks.
   -------------------------------------------------------------------------- */
var StorageManager = (function () {
  /**
   * load(key) → Array | null
   * Reads localStorage[key], parses JSON, returns the value.
   * Returns null and calls showErrorBanner on any error.
   */
  function load(key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) {
        // Key not present — return null without an error banner
        return null;
      }
      var parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      showErrorBanner('Failed to load data: ' + err.message);
      return null;
    }
  }

  /**
   * save(key, data) → { ok: true } | { ok: false, error }
   * Serialises data to JSON and writes to localStorage[key].
   * Returns { ok: false, error } and calls showErrorBanner on failure.
   */
  function save(key, data) {
    try {
      var serialised = JSON.stringify(data);
      localStorage.setItem(key, serialised);
      return { ok: true };
    } catch (err) {
      showErrorBanner('Failed to save data: ' + err.message);
      return { ok: false, error: err };
    }
  }

  return {
    load: load,
    save: save
  };
})();

/* --------------------------------------------------------------------------
   GreetingWidget
   Displays a live clock (#current-time), date (#current-date), and
   time-of-day greeting (#greeting-text).  Updates on a 1-second interval.
   -------------------------------------------------------------------------- */
var GreetingWidget = (function () {

  /**
   * formatTime(date) → string
   * Returns the time in 12-hour HH:MM AM/PM format, zero-padded.
   * Example: "09:45 AM", "12:00 PM", "01:30 AM"
   * Always matches: /^\d{2}:\d{2} (AM|PM)$/
   */
  function formatTime(date) {
    var hours = date.getHours();     // 0–23
    var minutes = date.getMinutes(); // 0–59
    var period = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour: 0 → 12, 13 → 1, 12 → 12
    var displayHours = hours % 12;
    if (displayHours === 0) {
      displayHours = 12;
    }

    var hh = displayHours < 10 ? '0' + displayHours : '' + displayHours;
    var mm = minutes < 10 ? '0' + minutes : '' + minutes;

    return hh + ':' + mm + ' ' + period;
  }

  /**
   * formatDate(date) → string
   * Returns the date in "Day, Month DD, YYYY" format.
   * Example: "Monday, June 30, 2025"
   */
  function formatDate(date) {
    var dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday'
    ];
    var monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    var dayName   = dayNames[date.getDay()];
    var monthName = monthNames[date.getMonth()];
    var day       = date.getDate();
    var year      = date.getFullYear();

    return dayName + ', ' + monthName + ' ' + day + ', ' + year;
  }

  /**
   * getGreeting(hour) → string
   * Maps an hour integer (0–23) to a greeting string:
   *   5–11  → "Good Morning"
   *   12–16 → "Good Afternoon"
   *   17–20 → "Good Evening"
   *   21–23, 0–4 → "Good Night"
   * Falls back to "Good Morning" on any error.
   */
  function getGreeting(hour) {
    try {
      var h = parseInt(hour, 10);
      if (isNaN(h)) {
        return 'Good Morning';
      }
      if (h >= 5 && h <= 11) {
        return 'Good Morning';
      }
      if (h >= 12 && h <= 16) {
        return 'Good Afternoon';
      }
      if (h >= 17 && h <= 20) {
        return 'Good Evening';
      }
      // 21–23 and 0–4 → Good Night
      return 'Good Night';
    } catch (err) {
      return 'Good Morning';
    }
  }

  /**
   * _tick()
   * Called every second by setInterval. Updates the DOM with the current
   * time, date, and greeting.
   */
  function _tick() {
    var now = new Date();

    var timeEl     = document.getElementById('current-time');
    var dateEl     = document.getElementById('current-date');
    var greetingEl = document.getElementById('greeting-text');

    if (timeEl) {
      timeEl.textContent = formatTime(now);
    }
    if (dateEl) {
      dateEl.textContent = formatDate(now);
    }
    if (greetingEl) {
      greetingEl.textContent = getGreeting(now.getHours());
    }
  }

  /**
   * init()
   * Renders immediately, then starts a 1-second interval.
   */
  function init() {
    _tick();
    setInterval(_tick, 1000);
  }

  return {
    formatTime:   formatTime,
    formatDate:   formatDate,
    getGreeting:  getGreeting,
    _tick:        _tick,
    init:         init
  };
})();

/* --------------------------------------------------------------------------
   FocusTimer
   25-minute countdown timer with chime and flash on completion.
   State held in closure: remainingSeconds, running, intervalId.
   -------------------------------------------------------------------------- */
var FocusTimer = (function () {

  var TOTAL_SECONDS = 1500; // 25 minutes

  // Closure state
  var remainingSeconds = TOTAL_SECONDS;
  var running          = false;
  var intervalId       = null;

  /**
   * formatDisplay(totalSeconds) → string
   * Converts a total-seconds integer to a zero-padded "MM:SS" string.
   * Examples: 1500 → "25:00", 65 → "01:05", 0 → "00:00"
   */
  function formatDisplay(totalSeconds) {
    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;
    var mm = mins < 10 ? '0' + mins : '' + mins;
    var ss = secs < 10 ? '0' + secs : '' + secs;
    return mm + ':' + ss;
  }

  /**
   * _playChime()
   * Uses the Web Audio API to generate a brief chime tone.
   * Gracefully no-ops when AudioContext is unavailable.
   */
  function _playChime() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      var ctx        = new AudioCtx();
      var oscillator = ctx.createOscillator();
      var gainNode   = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // A pleasant bell-like tone at 880 Hz (A5)
      oscillator.type      = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);

      // Fade out over ~1.2 seconds
      gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.2);

      // Clean up the AudioContext after the tone finishes
      oscillator.addEventListener('ended', function () {
        ctx.close();
      });
    } catch (err) {
      // AudioContext unavailable or suspended — silently ignore
    }
  }

  /**
   * _flash()
   * Adds the "flash" CSS class to #timer-display to trigger the
   * timer-flash keyframe animation, then removes it when the animation ends.
   */
  function _flash() {
    var display = document.getElementById('timer-display');
    if (!display) return;

    // Remove first in case a previous flash is still running
    display.classList.remove('flash');

    // Force a reflow so removing then re-adding actually restarts the animation
    void display.offsetWidth;

    display.classList.add('flash');

    display.addEventListener('animationend', function onEnd() {
      display.classList.remove('flash');
      display.removeEventListener('animationend', onEnd);
    });
  }

  /**
   * _onComplete()
   * Called when remainingSeconds reaches 0.
   * Stops the countdown interval, triggers the flash, and plays the chime.
   */
  function _onComplete() {
    clearInterval(intervalId);
    intervalId = null;
    running    = false;
    _flash();
    _playChime();
  }

  /**
   * _tick()
   * Decrements remainingSeconds, updates the display, and calls _onComplete()
   * when the countdown reaches 0.
   */
  function _tick() {
    if (remainingSeconds > 0) {
      remainingSeconds -= 1;
    }

    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatDisplay(remainingSeconds);
    }

    if (remainingSeconds === 0) {
      _onComplete();
    }
  }

  /**
   * start()
   * Begins the countdown. Ignored if already running (prevents duplicate
   * intervals). Sets running = true and starts a 1-second tick interval.
   * Req 4.1: Start from stopped → begin countdown from 25:00
   * Req 4.2: Start from paused → resume from remaining time
   * Req 4.6: Start while running → ignored (no duplicate intervals)
   */
  function start() {
    if (running) {
      return; // Already running — no duplicate interval
    }
    running    = true;
    intervalId = setInterval(_tick, 1000);
  }

  /**
   * stop()
   * Pauses the countdown without resetting remainingSeconds.
   * Ignored if already stopped (no-op).
   * Req 4.3: Stop while running → pause without reset
   * Req 4.4: Stop while not running → ignored
   */
  function stop() {
    if (!running) {
      return; // Already stopped — no-op
    }
    clearInterval(intervalId);
    intervalId = null;
    running    = false;
  }

  /**
   * reset()
   * Stops the countdown (if running) and restores the timer to 25:00.
   * Req 4.5: Reset → stop and restore to 25:00
   */
  function reset() {
    stop();
    remainingSeconds = TOTAL_SECONDS;

    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatDisplay(remainingSeconds);
    }
  }

  /**
   * init()
   * Renders "25:00" in #timer-display, initialises closure state,
   * and wires the Start / Stop / Reset button click listeners.
   */
  function init() {
    remainingSeconds = TOTAL_SECONDS;
    running          = false;
    intervalId       = null;

    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatDisplay(remainingSeconds);
    }

    // Wire button controls
    var btnStart = document.getElementById('timer-start');
    var btnStop  = document.getElementById('timer-stop');
    var btnReset = document.getElementById('timer-reset');

    if (btnStart) {
      btnStart.addEventListener('click', function () { start(); });
    }
    if (btnStop) {
      btnStop.addEventListener('click', function () { stop(); });
    }
    if (btnReset) {
      btnReset.addEventListener('click', function () { reset(); });
    }
  }

  return {
    formatDisplay: formatDisplay,
    init:          init,
    start:         start,
    stop:          stop,
    reset:         reset,
    _tick:         _tick,
    _playChime:    _playChime,
    _flash:        _flash,
    _onComplete:   _onComplete,
    // Expose internals for Task 6 (start/stop/reset) and tests
    _getState: function () {
      return {
        remainingSeconds: remainingSeconds,
        running:          running,
        intervalId:       intervalId
      };
    },
    _setIntervalId: function (id) { intervalId = id; },
    _setRunning:    function (v)  { running = v;     },
    _setRemaining:  function (v)  { remainingSeconds = v; }
  };
})();

/* --------------------------------------------------------------------------
   TodoList
   Manages the to-do task list with localStorage persistence.

   Task schema:
     { id: string, text: string, completed: boolean }

   localStorage key: "todo-life-dashboard:tasks"

   Public API (Tasks 7–10):
     TodoList.init()
     TodoList._validateText(text)
     TodoList._persist()
     TodoList._render()
     TodoList.addTask(text)       — Task 8
     TodoList.editTask(id, text)  — Task 9
     TodoList.toggleTask(id)      — Task 10
     TodoList.deleteTask(id)      — Task 10
   -------------------------------------------------------------------------- */
var TodoList = (function () {

  var STORAGE_KEY = 'todo-life-dashboard:tasks';

  // In-memory task array — array of Task objects
  var tasks = [];

  /**
   * _validateText(text) → { ok: true, trimmed: string } | { ok: false }
   * Returns { ok: true, trimmed } when text contains at least one non-whitespace
   * character after trimming.  Returns { ok: false } for empty or
   * whitespace-only strings.
   */
  function _validateText(text) {
    var trimmed = (text == null ? '' : String(text)).trim();
    if (trimmed.length === 0) {
      return { ok: false };
    }
    return { ok: true, trimmed: trimmed };
  }

  /**
   * _persist() → { ok: true } | { ok: false, error }
   * Saves the current tasks array to localStorage via StorageManager.
   * The error banner is shown by StorageManager.save() on failure.
   */
  function _persist() {
    return StorageManager.save(STORAGE_KEY, tasks);
  }

  /**
   * _render()
   * Clears and rebuilds the #todo-list <ul> from the tasks array.
   *
   * Each <li> has the structure (display mode):
   *   <li class="todo-item" data-id="{task.id}">
   *     <input type="checkbox" class="todo-checkbox" [checked]>
   *     <span class="todo-item-text [completed]">{task.text}</span>
   *     <div class="todo-item-actions">
   *       <button class="btn btn-sm btn-ghost todo-edit-btn" type="button">Edit</button>
   *       <button class="btn btn-sm btn-danger todo-delete-btn" type="button">Delete</button>
   *     </div>
   *   </li>
   *
   * When Edit is clicked, the item switches to edit mode:
   *   <li class="todo-item" data-id="{task.id}">
   *     <input type="checkbox" class="todo-checkbox" [checked] disabled>
   *     <input type="text" class="todo-edit-input" value="{task.text}">
   *     <div class="todo-item-actions">
   *       <button class="btn btn-sm btn-primary todo-save-btn" type="button">Save</button>
   *       <button class="btn btn-sm btn-ghost todo-cancel-btn" type="button">Cancel</button>
   *     </div>
   *   </li>
   *
   * Completed tasks receive class="completed" on the <span> for strikethrough.
   * Event wiring for checkbox/edit/delete is added in Tasks 9–10.
   */
  function _render() {
    var list = document.getElementById('todo-list');
    if (!list) return;

    // Clear existing items
    list.innerHTML = '';

    for (var i = 0; i < tasks.length; i++) {
      (function (task) {
        // <li>
        var li = document.createElement('li');
        li.className = 'todo-item';
        li.setAttribute('data-id', task.id);

        // <input type="checkbox">
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        if (task.completed) {
          checkbox.checked = true;
        }

        // <span> for task text
        var span = document.createElement('span');
        span.className = 'todo-item-text' + (task.completed ? ' completed' : '');
        span.textContent = task.text;

        // <div> for action buttons
        var actions = document.createElement('div');
        actions.className = 'todo-item-actions';

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-sm btn-ghost todo-edit-btn';
        editBtn.textContent = 'Edit';

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-sm btn-danger todo-delete-btn';
        deleteBtn.textContent = 'Delete';

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(actions);

        // Wire checkbox change → toggleTask
        checkbox.addEventListener('change', function () {
          toggleTask(task.id);
        });

        // Wire Delete button → deleteTask
        deleteBtn.addEventListener('click', function () {
          deleteTask(task.id);
        });

        // Wire Edit button → switch item into edit mode
        editBtn.addEventListener('click', function () {
          _enterEditMode(li, checkbox, task);
        });

        list.appendChild(li);
      })(tasks[i]);
    }
  }

  /**
   * _enterEditMode(li, checkbox, task)
   * Replaces the display span and action buttons with an edit input,
   * Save button, and Cancel button. Focuses the input.
   */
  function _enterEditMode(li, checkbox, task) {
    // Disable checkbox while editing to avoid accidental state changes
    checkbox.disabled = true;

    // Remove the display span and the actions div (last two children after checkbox)
    // li children: [checkbox, span, actionsDiv]
    var span       = li.querySelector('.todo-item-text');
    var actionsDiv = li.querySelector('.todo-item-actions');
    if (span)       li.removeChild(span);
    if (actionsDiv) li.removeChild(actionsDiv);

    // Create the edit input, pre-filled with current task text
    var editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-edit-input';
    editInput.value = task.text;
    editInput.maxLength = 500;
    editInput.setAttribute('aria-label', 'Edit task');

    // Create Save and Cancel buttons
    var newActions = document.createElement('div');
    newActions.className = 'todo-item-actions';

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-sm btn-primary todo-save-btn';
    saveBtn.textContent = 'Save';

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-sm btn-ghost todo-cancel-btn';
    cancelBtn.textContent = 'Cancel';

    newActions.appendChild(saveBtn);
    newActions.appendChild(cancelBtn);

    li.appendChild(editInput);
    li.appendChild(newActions);

    // Focus the input and position cursor at end
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    // Wire Save button → editTask
    saveBtn.addEventListener('click', function () {
      editTask(task.id, editInput.value);
    });

    // Wire Cancel button → _render() (discard)
    cancelBtn.addEventListener('click', function () {
      _render();
    });

    // Wire Enter key on the edit input → editTask
    // Wire Escape key on the edit input → _render() (discard)
    editInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        editTask(task.id, editInput.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        _render();
      }
    });
  }

  /**
   * addTask(text) — Task 8
   * Validates text via _validateText. On failure, marks the input with
   * aria-invalid and the "input-error" CSS class and shows the error hint,
   * then returns early.  On success, creates a new Task, pushes it to the
   * tasks array, calls _render() and _persist(), and clears the input.
   */
  function addTask(text) {
    var input    = document.getElementById('todo-input');
    var errorMsg = document.getElementById('todo-error');

    var result = _validateText(text);

    if (!result.ok) {
      // Show error state on the input
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        input.classList.add('input-error');
      }
      if (errorMsg) {
        errorMsg.removeAttribute('hidden');
      }
      return;
    }

    // Clear any previous error state
    if (input) {
      input.removeAttribute('aria-invalid');
      input.classList.remove('input-error');
    }
    if (errorMsg) {
      errorMsg.setAttribute('hidden', '');
    }

    // Generate a unique id: prefer crypto.randomUUID(), fall back to Date.now()
    var id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString();

    var newTask = { id: id, text: result.trimmed, completed: false };
    tasks.push(newTask);

    _render();
    _persist();

    // Clear the input field
    if (input) {
      input.value = '';
    }
  }

  /**
   * editTask(id, newText) — Task 9
   * Finds the task with the given id. Validates newText via _validateText.
   * On failure: restore original text display by calling _render() (returns to
   * display mode without saving the change).
   * On success: update task.text to the trimmed value, call _render() and _persist().
   */
  function editTask(id, newText) {
    var task = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        task = tasks[i];
        break;
      }
    }
    if (!task) return;

    var result = _validateText(newText);

    if (!result.ok) {
      // Validation failed: discard the edit and restore display mode
      _render();
      return;
    }

    // Update task text with trimmed value
    task.text = result.trimmed;
    _render();
    _persist();
  }

  /**
   * init()
   * Loads tasks from localStorage and renders the initial list.
   * Wires the Add button click and Enter keypress on the input to addTask().
   * Uses [] when the key is absent (null returned without error banner)
   * or when JSON is invalid (null returned WITH error banner from StorageManager).
   */
  function init() {
    var loaded = StorageManager.load(STORAGE_KEY);
    tasks = Array.isArray(loaded) ? loaded : [];
    _render();

    // Wire Add button
    var addBtn = document.getElementById('todo-add-btn');
    var input  = document.getElementById('todo-input');
    var form   = document.getElementById('todo-form');

    // Prevent default form submission and use addTask instead
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        addTask(input ? input.value : '');
      });
    } else {
      // Fallback: wire button click directly
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          addTask(input ? input.value : '');
        });
      }
    }

    // Also wire Enter keypress on the input (handles cases outside form submit)
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTask(input.value);
        }
      });

      // Clear error state as soon as the user starts typing again
      input.addEventListener('input', function () {
        input.removeAttribute('aria-invalid');
        input.classList.remove('input-error');
        var errorMsg = document.getElementById('todo-error');
        if (errorMsg) {
          errorMsg.setAttribute('hidden', '');
        }
      });
    }

    // Ensure a final persist when the user navigates away
    window.addEventListener('beforeunload', function () {
      _persist();
    });
  }

  /**
   * toggleTask(id) — Task 10
   * Finds the task with the given id, flips its completed flag,
   * then calls _render() and _persist().
   */
  function toggleTask(id) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) {
        tasks[i].completed = !tasks[i].completed;
        break;
      }
    }
    _render();
    _persist();
  }

  /**
   * deleteTask(id) — Task 10
   * Removes the task with the given id from the array,
   * then calls _render() and _persist().
   */
  function deleteTask(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; });
    _render();
    _persist();
  }

  return {
    init:          init,
    _validateText: _validateText,
    _persist:      _persist,
    _render:       _render,
    addTask:       addTask,
    editTask:      editTask,
    toggleTask:    toggleTask,
    deleteTask:    deleteTask,
    // Expose tasks array accessor for tests and Tasks 8–10
    _getTasks:     function () { return tasks; },
    _setTasks:     function (t) { tasks = t; }
  };
})();

/* --------------------------------------------------------------------------
   QuickLinks
   Manages bookmark-style quick links with localStorage persistence.

   Link schema:
     { id: string, label: string, url: string }

   localStorage key: "todo-life-dashboard:links"

   Public API (Tasks 11–12):
     QuickLinks.init()
     QuickLinks._validateUrl(url)
     QuickLinks._persist()
     QuickLinks._render()
     QuickLinks.addLink(label, url)   — Task 12
     QuickLinks.openLink(url)         — Task 12
     QuickLinks.deleteLink(id)        — Task 12
   -------------------------------------------------------------------------- */
var QuickLinks = (function () {

  var STORAGE_KEY = 'todo-life-dashboard:links';

  // In-memory links array — array of Link objects
  var links = [];

  /**
   * _validateUrl(url) → boolean
   * Returns true if url starts with "http://" or "https://" AND is parseable
   * by the URL constructor; returns false otherwise.
   */
  function _validateUrl(url) {
    if (typeof url !== 'string') return false;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * _persist() → { ok: true } | { ok: false, error }
   * Saves the current links array to localStorage via StorageManager.
   * The error banner is shown by StorageManager.save() on failure.
   */
  function _persist() {
    return StorageManager.save(STORAGE_KEY, links);
  }

  /**
   * _render()
   * Clears and rebuilds #links-grid from the links array.
   *
   * Each link renders as a container div with:
   *   - a <button class="link-btn"> with the link label (click → openLink)
   *   - a <button class="btn btn-sm btn-danger link-delete-btn"> "Delete" (click → deleteLink)
   *
   * When links is empty, shows #links-empty (the empty-state paragraph).
   */
  function _render() {
    var grid      = document.getElementById('links-grid');
    var emptyMsg  = document.getElementById('links-empty');
    if (!grid) return;

    // Clear existing rendered links (everything except the empty-state paragraph)
    var children = Array.prototype.slice.call(grid.children);
    for (var i = 0; i < children.length; i++) {
      if (children[i].id !== 'links-empty') {
        grid.removeChild(children[i]);
      }
    }

    if (links.length === 0) {
      if (emptyMsg) emptyMsg.removeAttribute('hidden');
      return;
    }

    // Hide empty-state message when there are links
    if (emptyMsg) emptyMsg.setAttribute('hidden', '');

    for (var j = 0; j < links.length; j++) {
      (function (link) {
        var container = document.createElement('div');
        container.className = 'link-item';
        container.setAttribute('data-id', link.id);

        // Link button — clicking opens the URL
        var linkBtn = document.createElement('button');
        linkBtn.type = 'button';
        linkBtn.className = 'btn link-btn';
        linkBtn.textContent = link.label;
        linkBtn.addEventListener('click', function () {
          openLink(link.url);
        });

        // Delete button — clicking removes this link
        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-sm btn-danger link-delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', 'Delete link ' + link.label);
        deleteBtn.addEventListener('click', function () {
          deleteLink(link.id);
        });

        container.appendChild(linkBtn);
        container.appendChild(deleteBtn);
        grid.appendChild(container);
      })(links[j]);
    }
  }

  /**
   * addLink(label, url) — Task 12
   * Validates label (non-empty after trim) and url (_validateUrl).
   * On failure: highlights the offending field(s) with aria-invalid and
   * the CSS class "input-error", shows #links-error, and returns early.
   * On success: creates a new Link object, pushes to links, calls _render()
   * and _persist(), and clears both inputs.
   */
  function addLink(label, url) {
    var labelInput = document.getElementById('link-label-input');
    var urlInput   = document.getElementById('link-url-input');
    var errorMsg   = document.getElementById('links-error');

    var trimmedLabel = (label == null ? '' : String(label)).trim();
    var labelOk      = trimmedLabel.length > 0;
    var urlOk        = _validateUrl(url);

    if (!labelOk || !urlOk) {
      // Highlight offending fields
      if (labelInput) {
        if (!labelOk) {
          labelInput.setAttribute('aria-invalid', 'true');
          labelInput.classList.add('input-error');
        } else {
          labelInput.removeAttribute('aria-invalid');
          labelInput.classList.remove('input-error');
        }
      }
      if (urlInput) {
        if (!urlOk) {
          urlInput.setAttribute('aria-invalid', 'true');
          urlInput.classList.add('input-error');
        } else {
          urlInput.removeAttribute('aria-invalid');
          urlInput.classList.remove('input-error');
        }
      }
      if (errorMsg) {
        errorMsg.removeAttribute('hidden');
      }
      return;
    }

    // Clear any previous error state
    if (labelInput) {
      labelInput.removeAttribute('aria-invalid');
      labelInput.classList.remove('input-error');
    }
    if (urlInput) {
      urlInput.removeAttribute('aria-invalid');
      urlInput.classList.remove('input-error');
    }
    if (errorMsg) {
      errorMsg.setAttribute('hidden', '');
    }

    // Generate a unique id
    var id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString();

    var newLink = { id: id, label: trimmedLabel, url: url };
    links.push(newLink);

    _render();
    _persist();

    // Clear inputs
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
  }

  /**
   * openLink(url) — Task 12
   * Validates the url via _validateUrl. If invalid, shows the error banner
   * and returns without opening a tab. If valid, calls window.open(url, '_blank').
   */
  function openLink(url) {
    if (!_validateUrl(url)) {
      showErrorBanner('Cannot open link: invalid or unsafe URL.');
      return;
    }
    window.open(url, '_blank');
  }

  /**
   * deleteLink(id) — Task 12
   * Filters out the link with the given id, then calls _render() and _persist().
   */
  function deleteLink(id) {
    links = links.filter(function (link) { return link.id !== id; });
    _render();
    _persist();
  }

  /**
   * init()
   * Loads links from localStorage, initialises the links array (or [] on null),
   * calls _render(), and wires the Add button to addLink().
   */
  function init() {
    var loaded = StorageManager.load(STORAGE_KEY);
    links = Array.isArray(loaded) ? loaded : [];
    _render();

    var labelInput = document.getElementById('link-label-input');
    var urlInput   = document.getElementById('link-url-input');
    var form       = document.getElementById('links-form');
    var addBtn     = document.getElementById('links-add-btn');

    // Prevent default form submission and use addLink instead
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
      });
    } else if (addBtn) {
      // Fallback: wire button click directly
      addBtn.addEventListener('click', function () {
        addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
      });
    }

    // Clear error state as the user types in either input
    if (labelInput) {
      labelInput.addEventListener('input', function () {
        labelInput.removeAttribute('aria-invalid');
        labelInput.classList.remove('input-error');
        var errorMsg = document.getElementById('links-error');
        if (errorMsg && !urlInput.classList.contains('input-error')) {
          errorMsg.setAttribute('hidden', '');
        }
      });
    }
    if (urlInput) {
      urlInput.addEventListener('input', function () {
        urlInput.removeAttribute('aria-invalid');
        urlInput.classList.remove('input-error');
        var errorMsg = document.getElementById('links-error');
        if (errorMsg && !labelInput.classList.contains('input-error')) {
          errorMsg.setAttribute('hidden', '');
        }
      });
    }
  }

  return {
    init:         init,
    _validateUrl: _validateUrl,
    _persist:     _persist,
    _render:      _render,
    addLink:      addLink,
    openLink:     openLink,
    deleteLink:   deleteLink,
    // Expose links array accessor for tests
    _getLinks:    function () { return links; },
    _setLinks:    function (l) { links = l; }
  };
})();

/* --------------------------------------------------------------------------
   Bootstrap — initialise widgets once the DOM is ready
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  GreetingWidget.init();
  FocusTimer.init();
  TodoList.init();
  QuickLinks.init();
});
