/**
 * Tests for TodoList — Task 7
 * Covers: _validateText, _persist, _render, init
 *
 * Run with:  npm test
 *
 * The jsdom environment provides window.localStorage and document.
 * app.js is evaluated in the global scope via vm.Script so all top-level
 * vars (TodoList, StorageManager, showErrorBanner) are accessible.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ─── helpers ────────────────────────────────────────────────────────────────

function loadApp() {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../js/app.js'),
    'utf8'
  );
  const script = new vm.Script(src);
  script.runInThisContext();
}

// ─── setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();

  // Remove any leftover error banner and todo-list from a previous test
  ['error-banner', 'todo-list'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Provide a #todo-list <ul> in the document for _render() to target
  const ul = document.createElement('ul');
  ul.id = 'todo-list';
  document.body.appendChild(ul);

  loadApp();
});

// ─── _validateText ───────────────────────────────────────────────────────────

describe('TodoList._validateText', () => {
  test('returns { ok: false } for an empty string', () => {
    expect(TodoList._validateText('')).toEqual({ ok: false });
  });

  test('returns { ok: false } for a single space', () => {
    expect(TodoList._validateText(' ')).toEqual({ ok: false });
  });

  test('returns { ok: false } for a tab-only string', () => {
    expect(TodoList._validateText('\t')).toEqual({ ok: false });
  });

  test('returns { ok: false } for a newline-only string', () => {
    expect(TodoList._validateText('\n')).toEqual({ ok: false });
  });

  test('returns { ok: false } for mixed whitespace', () => {
    expect(TodoList._validateText('  \t  \n  ')).toEqual({ ok: false });
  });

  test('returns { ok: false } for null', () => {
    expect(TodoList._validateText(null)).toEqual({ ok: false });
  });

  test('returns { ok: true, trimmed } for a single non-whitespace character', () => {
    expect(TodoList._validateText('a')).toEqual({ ok: true, trimmed: 'a' });
  });

  test('trims leading and trailing whitespace from valid text', () => {
    expect(TodoList._validateText('  hello world  ')).toEqual({ ok: true, trimmed: 'hello world' });
  });

  test('returns { ok: true, trimmed } for a 500-character string', () => {
    const text = 'x'.repeat(500);
    const result = TodoList._validateText(text);
    expect(result).toEqual({ ok: true, trimmed: text });
  });

  test('trimmed value preserves internal whitespace', () => {
    const result = TodoList._validateText('  buy milk  ');
    expect(result.trimmed).toBe('buy milk');
  });
});

// ─── _persist ────────────────────────────────────────────────────────────────

describe('TodoList._persist', () => {
  test('saves current tasks to localStorage under the correct key', () => {
    TodoList._setTasks([{ id: '1', text: 'test', completed: false }]);
    const result = TodoList._persist();
    expect(result).toEqual({ ok: true });

    const raw = localStorage.getItem('todo-life-dashboard:tasks');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw)).toEqual([{ id: '1', text: 'test', completed: false }]);
  });

  test('persists an empty tasks array without error', () => {
    TodoList._setTasks([]);
    const result = TodoList._persist();
    expect(result).toEqual({ ok: true });
    expect(JSON.parse(localStorage.getItem('todo-life-dashboard:tasks'))).toEqual([]);
  });

  test('returns { ok: false } and shows error banner when save fails', () => {
    TodoList._setTasks([{ id: '1', text: 'hello', completed: false }]);

    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });

    const result = TodoList._persist();
    expect(result.ok).toBe(false);

    const banner = document.getElementById('error-banner');
    expect(banner).not.toBeNull();
    expect(banner.style.display).toBe('block');

    Storage.prototype.setItem.mockRestore();
  });
});

// ─── _render ─────────────────────────────────────────────────────────────────

describe('TodoList._render', () => {
  test('renders an empty list when tasks is []', () => {
    TodoList._setTasks([]);
    TodoList._render();
    const list = document.getElementById('todo-list');
    expect(list.children.length).toBe(0);
  });

  test('renders the correct number of <li> items', () => {
    TodoList._setTasks([
      { id: '1', text: 'Task A', completed: false },
      { id: '2', text: 'Task B', completed: false }
    ]);
    TodoList._render();
    expect(document.getElementById('todo-list').children.length).toBe(2);
  });

  test('each <li> has class "todo-item" and data-id attribute', () => {
    TodoList._setTasks([{ id: 'abc', text: 'Do thing', completed: false }]);
    TodoList._render();
    const li = document.querySelector('#todo-list li');
    expect(li.classList.contains('todo-item')).toBe(true);
    expect(li.getAttribute('data-id')).toBe('abc');
  });

  test('renders a checkbox with class "todo-checkbox"', () => {
    TodoList._setTasks([{ id: '1', text: 'Task', completed: false }]);
    TodoList._render();
    const checkbox = document.querySelector('#todo-list .todo-checkbox');
    expect(checkbox).not.toBeNull();
    expect(checkbox.type).toBe('checkbox');
  });

  test('uncompleted task checkbox is not checked', () => {
    TodoList._setTasks([{ id: '1', text: 'Pending', completed: false }]);
    TodoList._render();
    const checkbox = document.querySelector('#todo-list .todo-checkbox');
    expect(checkbox.checked).toBe(false);
  });

  test('completed task checkbox is checked', () => {
    TodoList._setTasks([{ id: '1', text: 'Done', completed: true }]);
    TodoList._render();
    const checkbox = document.querySelector('#todo-list .todo-checkbox');
    expect(checkbox.checked).toBe(true);
  });

  test('task text is rendered in a span with class "todo-item-text"', () => {
    TodoList._setTasks([{ id: '1', text: 'Buy milk', completed: false }]);
    TodoList._render();
    const span = document.querySelector('#todo-list .todo-item-text');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('Buy milk');
  });

  test('completed task span has "completed" class for strikethrough', () => {
    TodoList._setTasks([{ id: '1', text: 'Done', completed: true }]);
    TodoList._render();
    const span = document.querySelector('#todo-list .todo-item-text');
    expect(span.classList.contains('completed')).toBe(true);
  });

  test('incomplete task span does NOT have "completed" class', () => {
    TodoList._setTasks([{ id: '1', text: 'Pending', completed: false }]);
    TodoList._render();
    const span = document.querySelector('#todo-list .todo-item-text');
    expect(span.classList.contains('completed')).toBe(false);
  });

  test('each item has an Edit button with class "todo-edit-btn"', () => {
    TodoList._setTasks([{ id: '1', text: 'Task', completed: false }]);
    TodoList._render();
    const btn = document.querySelector('#todo-list .todo-edit-btn');
    expect(btn).not.toBeNull();
    expect(btn.type).toBe('button');
    expect(btn.textContent).toBe('Edit');
  });

  test('each item has a Delete button with class "todo-delete-btn"', () => {
    TodoList._setTasks([{ id: '1', text: 'Task', completed: false }]);
    TodoList._render();
    const btn = document.querySelector('#todo-list .todo-delete-btn');
    expect(btn).not.toBeNull();
    expect(btn.type).toBe('button');
    expect(btn.textContent).toBe('Delete');
  });

  test('action buttons are inside a div with class "todo-item-actions"', () => {
    TodoList._setTasks([{ id: '1', text: 'Task', completed: false }]);
    TodoList._render();
    const actions = document.querySelector('#todo-list .todo-item-actions');
    expect(actions).not.toBeNull();
    expect(actions.querySelector('.todo-edit-btn')).not.toBeNull();
    expect(actions.querySelector('.todo-delete-btn')).not.toBeNull();
  });

  test('re-render clears previous items before rebuilding', () => {
    TodoList._setTasks([{ id: '1', text: 'Old', completed: false }]);
    TodoList._render();
    TodoList._setTasks([{ id: '2', text: 'New', completed: false }]);
    TodoList._render();

    const items = document.querySelectorAll('#todo-list .todo-item');
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('data-id')).toBe('2');
  });

  test('renders nothing when #todo-list element is missing', () => {
    // Should not throw when the list element is absent
    document.getElementById('todo-list').remove();
    expect(() => {
      TodoList._setTasks([{ id: '1', text: 'Task', completed: false }]);
      TodoList._render();
    }).not.toThrow();
  });
});

// ─── init ────────────────────────────────────────────────────────────────────

describe('TodoList.init', () => {
  test('renders an empty list when localStorage has no entry', () => {
    TodoList.init();
    expect(document.getElementById('todo-list').children.length).toBe(0);
  });

  test('loads and renders tasks saved in a previous session', () => {
    const saved = [
      { id: '1', text: 'Persisted task', completed: false },
      { id: '2', text: 'Completed task', completed: true }
    ];
    localStorage.setItem('todo-life-dashboard:tasks', JSON.stringify(saved));

    TodoList.init();

    const items = document.querySelectorAll('#todo-list .todo-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.todo-item-text').textContent).toBe('Persisted task');
    expect(items[1].querySelector('.todo-item-text').textContent).toBe('Completed task');
    expect(items[1].querySelector('.todo-checkbox').checked).toBe(true);
    expect(items[1].querySelector('.todo-item-text').classList.contains('completed')).toBe(true);
  });

  test('renders empty list and shows error banner for invalid JSON', () => {
    localStorage.setItem('todo-life-dashboard:tasks', '{ not valid json ]]]');

    TodoList.init();

    // Empty list
    expect(document.getElementById('todo-list').children.length).toBe(0);

    // Error banner shown by StorageManager
    const banner = document.getElementById('error-banner');
    expect(banner).not.toBeNull();
    expect(banner.style.display).toBe('block');
  });

  test('internal tasks array is populated from localStorage on init', () => {
    const saved = [{ id: '42', text: 'Load me', completed: false }];
    localStorage.setItem('todo-life-dashboard:tasks', JSON.stringify(saved));

    TodoList.init();

    expect(TodoList._getTasks()).toEqual(saved);
  });

  test('internal tasks array is [] when no data is in localStorage', () => {
    TodoList.init();
    expect(TodoList._getTasks()).toEqual([]);
  });
});

// ─── addTask ─────────────────────────────────────────────────────────────────

describe('TodoList.addTask', () => {
  beforeEach(() => {
    // Provide the todo-form UI elements for addTask to interact with
    ['todo-input', 'todo-add-btn', 'todo-error', 'todo-form'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    const form = document.createElement('form');
    form.id = 'todo-form';

    const input = document.createElement('input');
    input.id = 'todo-input';
    input.type = 'text';
    input.maxLength = 500;
    form.appendChild(input);

    const btn = document.createElement('button');
    btn.id = 'todo-add-btn';
    btn.type = 'submit';
    form.appendChild(btn);

    const err = document.createElement('p');
    err.id = 'todo-error';
    err.setAttribute('hidden', '');
    document.body.appendChild(form);
    document.body.appendChild(err);
  });

  test('valid text adds a task to the tasks array', () => {
    TodoList._setTasks([]);
    TodoList.addTask('Buy groceries');
    expect(TodoList._getTasks().length).toBe(1);
    expect(TodoList._getTasks()[0].text).toBe('Buy groceries');
  });

  test('valid text sets completed: false on the new task', () => {
    TodoList._setTasks([]);
    TodoList.addTask('Walk the dog');
    expect(TodoList._getTasks()[0].completed).toBe(false);
  });

  test('valid text clears the input field', () => {
    const input = document.getElementById('todo-input');
    input.value = 'Some task';
    TodoList._setTasks([]);
    TodoList.addTask(input.value);
    expect(input.value).toBe('');
  });

  test('valid text persists task to localStorage', () => {
    TodoList._setTasks([]);
    TodoList.addTask('Persist me');
    const raw = localStorage.getItem('todo-life-dashboard:tasks');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw);
    expect(stored.length).toBe(1);
    expect(stored[0].text).toBe('Persist me');
  });

  test('text is trimmed before being stored', () => {
    TodoList._setTasks([]);
    TodoList.addTask('  trimmed task  ');
    expect(TodoList._getTasks()[0].text).toBe('trimmed task');
  });

  test('whitespace-only text does NOT add a task', () => {
    TodoList._setTasks([]);
    TodoList.addTask('   ');
    expect(TodoList._getTasks().length).toBe(0);
  });

  test('whitespace-only text sets aria-invalid on the input', () => {
    const input = document.getElementById('todo-input');
    TodoList._setTasks([]);
    TodoList.addTask('   ');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  test('whitespace-only text adds input-error class to the input', () => {
    const input = document.getElementById('todo-input');
    TodoList._setTasks([]);
    TodoList.addTask('   ');
    expect(input.classList.contains('input-error')).toBe(true);
  });

  test('whitespace-only text makes the error message visible', () => {
    const err = document.getElementById('todo-error');
    TodoList._setTasks([]);
    TodoList.addTask('\t\n');
    expect(err.hasAttribute('hidden')).toBe(false);
  });

  test('whitespace-only text leaves localStorage unchanged', () => {
    TodoList._setTasks([]);
    const before = localStorage.getItem('todo-life-dashboard:tasks');
    TodoList.addTask('  ');
    const after = localStorage.getItem('todo-life-dashboard:tasks');
    expect(after).toBe(before);
  });

  test('each added task receives a unique id', () => {
    TodoList._setTasks([]);
    TodoList.addTask('Task one');
    TodoList.addTask('Task two');
    const tasks = TodoList._getTasks();
    expect(tasks[0].id).toBeTruthy();
    expect(tasks[1].id).toBeTruthy();
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });

  test('valid add clears aria-invalid from input if it was previously set', () => {
    const input = document.getElementById('todo-input');
    // First trigger an error
    TodoList.addTask('');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    // Now a valid add should clear it
    TodoList.addTask('Valid task');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.classList.contains('input-error')).toBe(false);
  });
});

// ─── editTask ─────────────────────────────────────────────────────────────────

describe('TodoList.editTask', () => {
  beforeEach(() => {
    // Start with one task in the list
    TodoList._setTasks([{ id: 'task-1', text: 'Original text', completed: false }]);
    TodoList._render();
  });

  test('updates task text to the trimmed value on success', () => {
    TodoList.editTask('task-1', 'Updated text');
    expect(TodoList._getTasks()[0].text).toBe('Updated text');
  });

  test('trims whitespace from new text before saving', () => {
    TodoList.editTask('task-1', '  trimmed  ');
    expect(TodoList._getTasks()[0].text).toBe('trimmed');
  });

  test('persists the updated task to localStorage', () => {
    TodoList.editTask('task-1', 'Persisted edit');
    const stored = JSON.parse(localStorage.getItem('todo-life-dashboard:tasks'));
    expect(stored[0].text).toBe('Persisted edit');
  });

  test('does not change task text when given whitespace-only input', () => {
    TodoList.editTask('task-1', '   ');
    expect(TodoList._getTasks()[0].text).toBe('Original text');
  });

  test('does not persist on whitespace-only input', () => {
    // No entry in localStorage before the failed edit
    TodoList.editTask('task-1', '   ');
    const raw = localStorage.getItem('todo-life-dashboard:tasks');
    // Either null (never persisted) or still has the original text
    if (raw !== null) {
      expect(JSON.parse(raw)[0].text).toBe('Original text');
    }
  });

  test('re-renders after a successful edit (display mode restored)', () => {
    // Put item into edit mode first by clicking Edit
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    // Now save via editTask
    TodoList.editTask('task-1', 'New text');
    // After save, the item should be back in display mode (span visible, no edit input)
    const span = document.querySelector('#todo-list .todo-item-text');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('New text');
    const editInput = document.querySelector('#todo-list .todo-edit-input');
    expect(editInput).toBeNull();
  });

  test('re-renders on validation failure (edit input removed, original text restored)', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    // Confirm edit mode is active
    expect(document.querySelector('#todo-list .todo-edit-input')).not.toBeNull();
    // Trigger validation failure
    TodoList.editTask('task-1', '   ');
    // Edit input should be gone, back to display mode
    expect(document.querySelector('#todo-list .todo-edit-input')).toBeNull();
    expect(document.querySelector('#todo-list .todo-item-text').textContent).toBe('Original text');
  });

  test('does not change completed state when editing text', () => {
    TodoList._setTasks([{ id: 'task-2', text: 'Done task', completed: true }]);
    TodoList._render();
    TodoList.editTask('task-2', 'Done task renamed');
    expect(TodoList._getTasks()[0].completed).toBe(true);
  });

  test('does nothing when id is not found', () => {
    TodoList.editTask('non-existent-id', 'Some text');
    expect(TodoList._getTasks()[0].text).toBe('Original text');
  });

  test('clicking Edit switches item to edit mode with pre-filled input', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    const editInput = document.querySelector('#todo-list .todo-edit-input');
    expect(editInput).not.toBeNull();
    expect(editInput.value).toBe('Original text');
  });

  test('clicking Edit shows Save and Cancel buttons', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    expect(document.querySelector('#todo-list .todo-save-btn')).not.toBeNull();
    expect(document.querySelector('#todo-list .todo-cancel-btn')).not.toBeNull();
  });

  test('clicking Save updates task text and returns to display mode', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    const editInput = document.querySelector('#todo-list .todo-edit-input');
    editInput.value = 'Saved via button';
    document.querySelector('#todo-list .todo-save-btn').click();
    expect(TodoList._getTasks()[0].text).toBe('Saved via button');
    expect(document.querySelector('#todo-list .todo-item-text').textContent).toBe('Saved via button');
  });

  test('clicking Cancel returns to display mode without saving', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    const editInput = document.querySelector('#todo-list .todo-edit-input');
    editInput.value = 'Cancelled change';
    document.querySelector('#todo-list .todo-cancel-btn').click();
    // Text should be unchanged
    expect(TodoList._getTasks()[0].text).toBe('Original text');
    // Back in display mode
    expect(document.querySelector('#todo-list .todo-item-text').textContent).toBe('Original text');
    expect(document.querySelector('#todo-list .todo-edit-input')).toBeNull();
  });

  test('pressing Enter in edit input saves the task', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    const editInput = document.querySelector('#todo-list .todo-edit-input');
    editInput.value = 'Enter saved';
    editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(TodoList._getTasks()[0].text).toBe('Enter saved');
  });

  test('pressing Escape in edit input discards changes', () => {
    const editBtn = document.querySelector('#todo-list .todo-edit-btn');
    editBtn.click();
    const editInput = document.querySelector('#todo-list .todo-edit-input');
    editInput.value = 'Escape discarded';
    editInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(TodoList._getTasks()[0].text).toBe('Original text');
    expect(document.querySelector('#todo-list .todo-edit-input')).toBeNull();
  });
});
