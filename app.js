const STORAGE_KEY = "home-reset-state-v1";

const dailyTasks = [
  { id: "make-bed", label: "Make the bed" },
  { id: "dishes-counters", label: "Clear dishes and wipe the counters" },
  { id: "ten-minute-tidy", label: "Do a 10-minute tidy" },
  { id: "bathroom-wipe", label: "Wipe the bathroom sink" },
  { id: "floor-check", label: "Check high-traffic floors" },
  { id: "trash-laundry", label: "Check the trash and laundry" }
];

const weeklySchedule = [
  {
    key: "sunday",
    day: "Sunday",
    room: "Kitchen",
    description: "Clear the busiest surfaces and reset the heart of the home.",
    tasks: [
      { id: "clear-counters", label: "Clear and wipe all counters" },
      { id: "sink-stovetop", label: "Clean the sink and stovetop" },
      { id: "appliances", label: "Wipe appliance fronts" },
      { id: "fridge-check", label: "Remove old food from the fridge" },
      { id: "kitchen-floor", label: "Sweep and mop the floor" }
    ]
  },
  {
    key: "monday",
    day: "Monday",
    room: "Bathrooms",
    description: "A focused disinfect, scrub, and restock.",
    tasks: [
      { id: "toilet", label: "Disinfect the toilet" },
      { id: "sink-mirror", label: "Clean the sink and mirror" },
      { id: "tub-shower", label: "Scrub the tub or shower" },
      { id: "bathroom-floor", label: "Sweep and mop the floor" },
      { id: "towels-supplies", label: "Replace towels and restock supplies" }
    ]
  },
  {
    key: "tuesday",
    day: "Tuesday",
    room: "Bedrooms",
    description: "Make each bedroom feel calm and ready for rest.",
    tasks: [
      { id: "bed-linens", label: "Change or straighten the bed linens" },
      { id: "bedroom-dust", label: "Dust furniture and lamps" },
      { id: "clothes-away", label: "Put away clothes and shoes" },
      { id: "nightstands", label: "Clear and wipe nightstands" },
      { id: "bedroom-floor", label: "Vacuum or sweep the floor" }
    ]
  },
  {
    key: "wednesday",
    day: "Wednesday",
    room: "Living Areas",
    description: "Reset the spaces where you relax and spend time.",
    tasks: [
      { id: "living-declutter", label: "Return loose items to their homes" },
      { id: "living-dust", label: "Dust tables, shelves, and décor" },
      { id: "electronics", label: "Wipe screens and electronics" },
      { id: "upholstery", label: "Straighten and vacuum upholstery" },
      { id: "living-floor", label: "Vacuum or sweep the floor" }
    ]
  },
  {
    key: "thursday",
    day: "Thursday",
    room: "Floors & Laundry",
    description: "Finish the cleaning week with fresh floors and clothes.",
    tasks: [
      { id: "gather-laundry", label: "Gather and sort the laundry" },
      { id: "wash-laundry", label: "Wash the next load" },
      { id: "fold-away", label: "Fold and put away clean clothes" },
      { id: "vacuum-carpets", label: "Vacuum rugs and carpeted rooms" },
      { id: "mop-hard-floors", label: "Sweep and mop hard floors" }
    ]
  }
];

const monthlySchedule = [
  {
    key: "week-1",
    week: "Week 1",
    focus: "Fridge & Pantry",
    description: "Clear expired items, wipe shelves, and make food easier to find.",
    tasks: [
      { id: "expired-food", label: "Discard expired food" },
      { id: "fridge-shelves", label: "Wipe fridge shelves and drawers" },
      { id: "pantry-shelves", label: "Wipe pantry shelves" },
      { id: "group-food", label: "Group similar foods together" },
      { id: "shopping-list", label: "Add needed staples to the shopping list" }
    ]
  },
  {
    key: "week-2",
    week: "Week 2",
    focus: "Baseboards & Doors",
    description: "Catch the edges and touchpoints that daily cleaning misses.",
    tasks: [
      { id: "dust-baseboards", label: "Dust the baseboards" },
      { id: "wipe-doors", label: "Wipe door faces and frames" },
      { id: "handles", label: "Disinfect handles and knobs" },
      { id: "switches", label: "Clean light switches" },
      { id: "wall-marks", label: "Spot-clean wall marks" }
    ]
  },
  {
    key: "week-3",
    week: "Week 3",
    focus: "Windows & Blinds",
    description: "Let in more light with a quick window refresh.",
    tasks: [
      { id: "dust-blinds", label: "Dust blinds or shades" },
      { id: "window-glass", label: "Clean the inside window glass" },
      { id: "window-sills", label: "Wipe window sills" },
      { id: "window-tracks", label: "Vacuum window tracks" },
      { id: "screens-curtains", label: "Check screens and curtains" }
    ]
  },
  {
    key: "week-4",
    week: "Week 4",
    focus: "Closets & Decluttering",
    description: "Finish the month by making one storage area easier to use.",
    tasks: [
      { id: "choose-closet", label: "Choose one closet or storage area" },
      { id: "donation-bag", label: "Fill one donation bag" },
      { id: "sort-items", label: "Group similar items together" },
      { id: "wipe-shelves", label: "Wipe shelves and containers" },
      { id: "return-items", label: "Return loose items to their homes" }
    ]
  }
];

const now = new Date();
const periodKeys = {
  day: localDateKey(now),
  week: weekStartKey(now),
  month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
};

let state = loadState();
let statusTimer;

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekStartKey(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return localDateKey(start);
}

function emptyState() {
  return {
    daily: { period: periodKeys.day, completed: [] },
    weekly: { period: periodKeys.week, completed: {} },
    monthly: { period: periodKeys.month, completed: {} }
  };
}

function loadState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    saved = null;
  }

  const next = saved && typeof saved === "object" ? saved : emptyState();

  if (!next.daily || next.daily.period !== periodKeys.day) {
    next.daily = { period: periodKeys.day, completed: [] };
  }
  if (!next.weekly || next.weekly.period !== periodKeys.week) {
    next.weekly = { period: periodKeys.week, completed: {} };
  }
  if (!next.monthly || next.monthly.period !== periodKeys.month) {
    next.monthly = { period: periodKeys.month, completed: {} };
  }

  next.daily.completed = Array.isArray(next.daily.completed) ? next.daily.completed : [];
  next.weekly.completed = next.weekly.completed && typeof next.weekly.completed === "object" ? next.weekly.completed : {};
  next.monthly.completed = next.monthly.completed && typeof next.monthly.completed === "object" ? next.monthly.completed : {};

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function saveState(message = "Progress saved") {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showStatus(message);
}

function showStatus(message) {
  const status = document.querySelector("#status-message");
  status.textContent = message;
  status.classList.add("is-visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => status.classList.remove("is-visible"), 1800);
}

function currentWeeklyFocus() {
  const dayIndex = now.getDay();
  return dayIndex <= 4 ? weeklySchedule[dayIndex] : null;
}

function currentMonthlyFocus() {
  const weekIndex = Math.min(3, Math.ceil(now.getDate() / 7) - 1);
  return monthlySchedule[weekIndex];
}

function completedFor(section, key) {
  if (section === "daily") return state.daily.completed;
  const bucket = state[section].completed[key];
  return Array.isArray(bucket) ? bucket : [];
}

function updateCompleted(section, key, taskId, checked) {
  const current = completedFor(section, key);
  const next = checked
    ? [...new Set([...current, taskId])]
    : current.filter((id) => id !== taskId);

  if (section === "daily") {
    state.daily.completed = next;
  } else {
    state[section].completed[key] = next;
  }

  saveState(checked ? "Task completed" : "Task reopened");
  renderAll();
}

function taskCard({ section, key, kicker, title, description, tasks, current = false }) {
  const completed = completedFor(section, key);
  const count = tasks.filter((task) => completed.includes(task.id)).length;
  const percent = Math.round((count / tasks.length) * 100);

  const card = document.createElement("article");
  card.className = `task-card${current ? " is-current" : ""}${count === tasks.length ? " is-complete" : ""}`;

  const header = document.createElement("div");
  header.className = "task-card-header";

  const titleRow = document.createElement("div");
  titleRow.className = "task-card-title-row";

  const titleCopy = document.createElement("div");
  const cardKicker = document.createElement("p");
  cardKicker.className = "card-kicker";
  cardKicker.textContent = kicker;
  const heading = document.createElement("h3");
  heading.textContent = title;
  titleCopy.append(cardKicker, heading);
  titleRow.appendChild(titleCopy);

  if (current) {
    const badge = document.createElement("span");
    badge.className = "today-badge";
    badge.textContent = "Current";
    titleRow.appendChild(badge);
  }

  const cardDescription = document.createElement("p");
  cardDescription.className = "task-card-description";
  cardDescription.textContent = description;

  const progress = document.createElement("div");
  progress.className = "task-progress";
  progress.innerHTML = `
    <div class="task-progress-copy"><span>Progress</span><strong>${count} of ${tasks.length}</strong></div>
    <div class="progress-track" role="progressbar" aria-label="${title} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
      <span class="progress-fill" style="width: ${percent}%"></span>
    </div>
  `;

  header.append(titleRow, cardDescription, progress);

  const list = document.createElement("ul");
  list.className = "task-list";
  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    const label = document.createElement("label");
    label.className = "task-label";

    const checkbox = document.createElement("input");
    checkbox.className = "task-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = completed.includes(task.id);
    checkbox.addEventListener("change", () => updateCompleted(section, key, task.id, checkbox.checked));

    const text = document.createElement("span");
    text.textContent = task.label;

    label.append(checkbox, text);
    item.appendChild(label);
    list.appendChild(item);
  });

  card.append(header, list);
  return card;
}

function renderToday() {
  const grid = document.querySelector("#today-grid");
  const weekly = currentWeeklyFocus();
  const monthly = currentMonthlyFocus();
  grid.replaceChildren();

  grid.appendChild(taskCard({
    section: "daily",
    key: "daily",
    kicker: "Every day",
    title: "Everyday reset",
    description: "Six small tasks to keep the house moving.",
    tasks: dailyTasks,
    current: true
  }));

  if (weekly) {
    grid.appendChild(taskCard({
      section: "weekly",
      key: weekly.key,
      kicker: weekly.day,
      title: weekly.room,
      description: weekly.description,
      tasks: weekly.tasks,
      current: true
    }));
  } else {
    const rest = document.createElement("article");
    rest.className = "task-card rest-card";
    rest.innerHTML = "<div><p class=\"card-kicker\">Weekend reset</p><h3>Rest or catch up</h3><p>Your room-by-room schedule runs Sunday through Thursday. Use today however it helps most.</p></div>";
    grid.appendChild(rest);
  }

  grid.appendChild(taskCard({
    section: "monthly",
    key: monthly.key,
    kicker: `${monthly.week} focus`,
    title: monthly.focus,
    description: "Work through these extras anytime this week.",
    tasks: monthly.tasks,
    current: true
  }));

  renderTodayProgress(weekly, monthly);
}

function renderTodayProgress(weekly, monthly) {
  const todaySets = [
    { tasks: dailyTasks, completed: state.daily.completed },
    { tasks: monthly.tasks, completed: completedFor("monthly", monthly.key) }
  ];
  if (weekly) {
    todaySets.splice(1, 0, { tasks: weekly.tasks, completed: completedFor("weekly", weekly.key) });
  }

  const total = todaySets.reduce((sum, set) => sum + set.tasks.length, 0);
  const complete = todaySets.reduce(
    (sum, set) => sum + set.tasks.filter((task) => set.completed.includes(task.id)).length,
    0
  );
  const percent = total ? Math.round((complete / total) * 100) : 0;
  const progress = document.querySelector("#today-progress");
  document.querySelector("#today-progress-text").textContent = `${complete} of ${total}`;
  progress.setAttribute("aria-valuenow", String(percent));
  progress.querySelector(".progress-fill").style.width = `${percent}%`;

  const weeklyCopy = weekly ? `${weekly.room.toLowerCase()} day` : "a rest or catch-up day";
  document.querySelector("#today-summary").textContent = `It’s ${weeklyCopy}, plus your everyday reset and monthly focus.`;
}

function renderWeekly() {
  const grid = document.querySelector("#weekly-grid");
  const todayKey = currentWeeklyFocus()?.key;
  grid.replaceChildren();
  weeklySchedule.forEach((entry) => {
    grid.appendChild(taskCard({
      section: "weekly",
      key: entry.key,
      kicker: entry.day,
      title: entry.room,
      description: entry.description,
      tasks: entry.tasks,
      current: entry.key === todayKey
    }));
  });
}

function renderMonthly() {
  const grid = document.querySelector("#monthly-grid");
  const currentKey = currentMonthlyFocus().key;
  grid.replaceChildren();
  monthlySchedule.forEach((entry) => {
    grid.appendChild(taskCard({
      section: "monthly",
      key: entry.key,
      kicker: entry.week,
      title: entry.focus,
      description: entry.description,
      tasks: entry.tasks,
      current: entry.key === currentKey
    }));
  });
}

function renderAll() {
  renderToday();
  renderWeekly();
  renderMonthly();
}

function activateTab(name, moveFocus = false) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && moveFocus) button.focus();
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
}

function setupTabs() {
  const buttons = [...document.querySelectorAll(".tab-button")];
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + buttons.length) % buttons.length;
      activateTab(buttons[nextIndex].dataset.tab, true);
    });
  });
}

function resetToday() {
  state.daily.completed = [];
  const weekly = currentWeeklyFocus();
  const monthly = currentMonthlyFocus();
  if (weekly) state.weekly.completed[weekly.key] = [];
  state.monthly.completed[monthly.key] = [];
  saveState("Today’s tasks were reset");
  renderAll();
}

function resetWeek() {
  state.weekly.completed = {};
  saveState("Weekly tasks were reset");
  renderAll();
}

function resetMonth() {
  state.monthly.completed = {};
  saveState("Monthly tasks were reset");
  renderAll();
}

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(now);

document.querySelector("#reset-today").addEventListener("click", resetToday);
document.querySelector("#reset-week").addEventListener("click", resetWeek);
document.querySelector("#reset-month").addEventListener("click", resetMonth);

setupTabs();
activateTab("today");
renderAll();

