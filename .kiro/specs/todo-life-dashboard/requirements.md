# Requirements Document

## Introduction

The To-do List Life Dashboard is a single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub in the browser — displaying the current time and date with a contextual greeting, a 25-minute focus timer, a persistent to-do list, and a customizable quick-links panel. All data is stored client-side using the browser's Local Storage API. The app requires no backend, no build tools, and no framework setup.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-of-day greeting message.
- **Timer**: The UI component that implements a 25-minute countdown focus timer.
- **Todo_List**: The UI component that manages the collection of user tasks.
- **Task**: A single item in the Todo_List, consisting of a text description and a completion state.
- **Quick_Links**: The UI component that displays a grid of user-defined shortcut buttons to external URLs.
- **Link**: A single item in the Quick_Links panel, consisting of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used to persist all Dashboard data client-side.
- **Modern_Browser**: Chrome, Firefox, Edge, or Safari in a version released within the last two years.

---

## Requirements

### Requirement 1: Current Time and Date Display

**User Story:** As a user, I want to see the current time and date on the dashboard, so that I always know when I am without checking another app.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in 12-hour HH:MM AM/PM format (e.g., "09:45 AM").
2. WHEN a new minute begins, THE Greeting_Widget SHALL update the displayed time to reflect the new current minute.
3. THE Greeting_Widget SHALL display the current local date in "Day, Month DD, YYYY" format (e.g., "Monday, June 30, 2025").

---

### Requirement 2: Time-of-Day Greeting

**User Story:** As a user, I want a greeting that reflects the time of day, so that the dashboard feels personal and contextual.

#### Acceptance Criteria

1. WHEN the local hour on the client device's timezone is between 05:00 and 11:59, THE Greeting_Widget SHALL display "Good Morning".
2. WHEN the local hour on the client device's timezone is between 12:00 and 16:59, THE Greeting_Widget SHALL display "Good Afternoon".
3. WHEN the local hour on the client device's timezone is between 17:00 and 20:59, THE Greeting_Widget SHALL display "Good Evening".
4. WHEN the local hour on the client device's timezone is between 21:00 and 04:59, THE Greeting_Widget SHALL display "Good Night".
5. WHEN the local hour crosses a greeting boundary while the Dashboard is displayed, THE Greeting_Widget SHALL update the displayed greeting to match the new time-of-day range without requiring a page reload.
6. IF the client device's timezone is unavailable, THEN THE Greeting_Widget SHALL default to displaying "Good Morning".

---

### Requirement 3: Focus Timer — Countdown

**User Story:** As a user, I want a 25-minute focus timer, so that I can work in focused intervals.

#### Acceptance Criteria

1. WHEN the Dashboard first loads, THE Timer SHALL initialise to 25 minutes and 00 seconds (25:00) in a stopped state.
2. WHEN the user activates the Start control, THE Timer SHALL begin counting down one second at a time.
3. WHILE the Timer is counting down, THE Timer SHALL display the remaining time in MM:SS format.
4. WHEN the Timer reaches 00:00, THE Timer SHALL stop automatically, flash the timer display visually, and play a chime sound to notify the user.
5. IF the Timer is already running and the user activates the Start control again, THEN THE Timer SHALL ignore the activation and continue counting down unchanged.

---

### Requirement 4: Focus Timer — Controls

**User Story:** As a user, I want Start, Stop, and Reset controls for the timer, so that I can manage my focus sessions flexibly.

#### Acceptance Criteria

1. WHEN the user activates the Start control and the Timer is in a stopped state, THE Timer SHALL begin the countdown from 25:00.
2. WHEN the user activates the Start control and the Timer is in a paused state, THE Timer SHALL resume the countdown from the remaining time.
3. WHILE the Timer is running, WHEN the user activates the Stop control, THE Timer SHALL pause the countdown without resetting the remaining time.
4. IF the user activates the Stop control while the Timer is not running, THEN THE Timer SHALL ignore the activation and remain in its current state.
5. WHEN the user activates the Reset control, THE Timer SHALL stop any running countdown and restore the display to 25:00 in a stopped state.
6. IF the user activates the Start control WHILE the Timer is already running, THEN THE Timer SHALL ignore the activation and continue counting down unchanged.

---

### Requirement 5: To-Do List — Adding Tasks

**User Story:** As a user, I want to add tasks to my to-do list, so that I can track what needs to be done.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input field (maximum 500 characters) and an Add control for creating new Tasks.
2. WHEN the user submits a non-empty Task description via the Add control or by pressing the Enter key, THE Todo_List SHALL trim leading and trailing whitespace, append the new Task to the list with a completion state of incomplete, and clear the input field.
3. IF the user attempts to submit an empty or whitespace-only Task description, THEN THE Todo_List SHALL reject the submission, display a visible error indication on the input field, and leave the list unchanged.
4. WHEN a new Task is added, THE Todo_List SHALL persist the updated task collection to Local_Storage.
5. IF a Local_Storage write fails when saving a new Task, THEN THE Todo_List SHALL display an error message to the user indicating that the task could not be saved.

---

### Requirement 6: To-Do List — Editing Tasks

**User Story:** As a user, I want to edit existing tasks, so that I can correct or update task descriptions.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an Edit control for each Task.
2. WHEN the user activates the Edit control for a Task, THE Todo_List SHALL replace the Task's display text with an editable input field (maximum 500 characters) pre-filled with the current Task description, and display Save and Cancel controls.
3. WHEN the user confirms the edit by pressing Enter or activating the Save control with a non-empty value, THE Todo_List SHALL update the Task description, trim leading and trailing whitespace, and return to display mode.
4. IF the user confirms the edit with an empty or whitespace-only value, THEN THE Todo_List SHALL reject the change and restore the original Task description in display mode.
5. WHEN the user activates the Cancel control or presses Escape during editing, THE Todo_List SHALL discard the change, restore the original Task description, and return to display mode without saving.
6. WHEN a Task is successfully edited, THE Todo_List SHALL persist the updated task collection to Local_Storage.
7. IF a Local_Storage write fails when saving an edited Task, THEN THE Todo_List SHALL display an error message to the user indicating that the change could not be saved.

---

### Requirement 7: To-Do List — Completing Tasks

**User Story:** As a user, I want to mark tasks as done, so that I can track my progress.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a completion toggle (checkbox) for each Task.
2. WHEN the user activates the completion toggle for an incomplete Task, THE Todo_List SHALL update the Task's completion state to complete and apply strikethrough styling to the Task's text.
3. WHEN the user activates the completion toggle for a complete Task, THE Todo_List SHALL update the Task's completion state to incomplete and remove the strikethrough styling.
4. WHEN a Task's completion state changes, THE Todo_List SHALL persist the updated task collection to Local_Storage.
5. IF a Local_Storage write fails when saving a completion state change, THEN THE Todo_List SHALL display an error message to the user indicating that the change could not be saved.

---

### Requirement 8: To-Do List — Deleting Tasks

**User Story:** As a user, I want to delete tasks, so that I can remove items that are no longer relevant.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a Delete control for each Task.
2. WHEN the user activates the Delete control for a Task, THE Todo_List SHALL immediately remove that Task from the list with no change to the order or state of the remaining Tasks.
3. WHEN a Task is deleted, THE Todo_List SHALL persist the updated task collection to Local_Storage.
4. IF a Local_Storage write fails when saving after a deletion, THEN THE Todo_List SHALL display an error message to the user indicating that the deletion could not be saved, while the Task remains visually removed from the list.

---

### Requirement 9: To-Do List — Persistence

**User Story:** As a user, I want my tasks to be saved automatically, so that I do not lose them when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Todo_List SHALL read any previously saved tasks from Local_Storage and render them.
2. WHEN the task collection changes (task added, edited, deleted, or completion status toggled), THE Todo_List SHALL serialise the task collection as JSON and write it to Local_Storage.
3. IF Local_Storage is unavailable or returns data that cannot be parsed as valid JSON on load, THEN THE Todo_List SHALL initialise with an empty task collection and display an error message indicating that saved tasks could not be loaded.
4. WHEN the user closes or refreshes the browser, THE Todo_List SHALL write the current task collection to Local_Storage before the page unloads.

---

### Requirement 10: Quick Links — Adding Links

**User Story:** As a user, I want to add shortcut buttons to my favourite websites, so that I can open them quickly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input field for a Link label (maximum 50 characters), an input field for a Link URL (maximum 2048 characters), and an Add control.
2. WHEN the user submits both a non-empty label and a non-empty URL that conforms to a valid URL format (starting with http:// or https://), THE Quick_Links SHALL add a new Link button to the panel.
3. IF the user submits a missing label, a missing URL, or a URL that does not conform to a valid URL format, THEN THE Quick_Links SHALL reject the submission and leave the panel unchanged.
4. WHEN a new Link is added, THE Quick_Links SHALL persist the updated link collection to Local_Storage.

---

### Requirement 11: Quick Links — Opening Links

**User Story:** As a user, I want clicking a quick-link button to open the target website, so that I can navigate there with one click.

#### Acceptance Criteria

1. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
2. IF the stored URL for a Link is missing or malformed at activation time, THEN THE Quick_Links SHALL display an error message to the user and not attempt to open a new tab.

---

### Requirement 12: Quick Links — Deleting Links

**User Story:** As a user, I want to remove quick links I no longer need, so that my panel stays tidy.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a visible Delete control for each Link button in the panel.
2. WHEN the user activates the Delete control for a Link, THE Quick_Links SHALL immediately remove that Link from the panel with no change to the order or state of the remaining Links.
3. WHEN a Link is deleted, THE Quick_Links SHALL persist the updated link collection to Local_Storage.
4. IF a Local_Storage write fails when saving after a deletion, THEN THE Quick_Links SHALL display an error message to the user indicating that the deletion could not be saved.
5. WHEN all Links are deleted, THE Quick_Links SHALL display an empty state message indicating that no links have been added yet.

---

### Requirement 13: Quick Links — Persistence

**User Story:** As a user, I want my quick links to be saved automatically, so that they are still there after a browser refresh.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Quick_Links SHALL read any previously saved links from Local_Storage and render them.
2. WHEN the link collection changes (link added or deleted), THE Quick_Links SHALL serialise the link collection as JSON and write it to Local_Storage.
3. IF Local_Storage is unavailable or returns data that cannot be parsed as valid JSON on load, THEN THE Quick_Links SHALL initialise with an empty link collection and display an error message indicating that saved links could not be loaded.

---

### Requirement 14: Technology Stack

**User Story:** As a developer, I want the Dashboard built with plain HTML, CSS, and Vanilla JavaScript, so that it runs without any build step, framework, or server.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript — no external frameworks, libraries, CDN-linked scripts, or build tooling are permitted.
2. THE Dashboard SHALL operate without a backend server, running entirely from static files opened directly in a Modern_Browser (Chrome 120+, Firefox 120+, Edge 120+, Safari 17+).
3. THE Dashboard SHALL use only one CSS file located at `css/style.css`.
4. THE Dashboard SHALL use only one JavaScript file located at `js/app.js`.

---

### Requirement 15: Browser Compatibility and Performance

**User Story:** As a user, I want the dashboard to load fast and work in any modern browser, so that I can use it anywhere.

#### Acceptance Criteria

1. THE Dashboard SHALL function correctly in Chrome, Firefox, Edge, and Safari Modern_Browser versions.
2. THE Dashboard SHALL complete its initial render within 2 seconds on a standard desktop connection.
3. WHEN the user interacts with any control, THE Dashboard SHALL reflect the change visually within 100 milliseconds.

---

### Requirement 16: Visual Design and Layout

**User Story:** As a user, I want a clean, readable interface with a clear visual hierarchy, so that I can use the dashboard comfortably.

#### Acceptance Criteria

1. THE Dashboard SHALL present all four widgets (Greeting_Widget, Timer, Todo_List, Quick_Links) on a single page without requiring horizontal scrolling on a viewport width of 1024px or wider.
2. THE Dashboard SHALL apply a consistent colour scheme, font family, and spacing across all widgets.
3. THE Dashboard SHALL remain usable and visually coherent on viewport widths between 320px and 1920px (responsive layout).
4. THE Dashboard SHALL use a minimum body font size of 16px for all user-facing text.
