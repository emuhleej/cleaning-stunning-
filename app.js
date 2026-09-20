import { dailyTasks, weeklySchedule, monthlySchedule } from "./tasks.js";
import { ProgressStore, localDateKey } from "./progress-store.js";
import { setupCloudControls } from "./cloud-controls.js";
import { firebaseConfig } from "./firebase-config.js";

let now = new Date();
let statusTimer;
let cloudControls;
const store = new ProgressStore({
  storage: { getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
  projectId: firebaseConfig.projectId || "local",
  onChange: () => { renderAll(); cloudControls?.render(); }
});

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
  return store.completed(section, key);
}

function updateCompleted(section, key, taskId, checked) {
  refreshDate();
  store.set(section, key, taskId, checked);
  showStatus(checked ? "Task completed" : "Task reopened");
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
    checkbox.dataset.task = `${section}:${key}:${task.id}`;
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
    { tasks: dailyTasks, completed: completedFor("daily", "daily") },
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
  const active = document.activeElement;
  const focusedTask = active?.dataset.task;
  const panelId = active?.closest(".tab-panel")?.id;
  renderToday();
  renderWeekly();
  renderMonthly();
  if (focusedTask && panelId) {
    [...document.querySelectorAll(`#${panelId} .task-checkbox`)]
      .find((checkbox) => checkbox.dataset.task === focusedTask)?.focus({ preventScroll: true });
  }
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
  refreshDate();
  store.reset("daily");
  const weekly = currentWeeklyFocus();
  const monthly = currentMonthlyFocus();
  if (weekly) store.reset("weekly", weekly.key);
  store.reset("monthly", monthly.key);
  showStatus("Today’s tasks were reset");
}

function resetWeek() {
  refreshDate();
  store.reset("weekly");
  showStatus("Weekly tasks were reset");
}

function resetMonth() {
  refreshDate();
  store.reset("monthly");
  showStatus("Monthly tasks were reset");
}

function renderDate() {
  document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric"
  }).format(now);
}

function refreshDate() {
  const next = new Date();
  if (localDateKey(next) === localDateKey(now)) return;
  now = next;
  store.refreshPeriods();
  renderDate();
  renderAll();
}

document.querySelector("#reset-today").addEventListener("click", resetToday);
document.querySelector("#reset-week").addEventListener("click", resetWeek);
document.querySelector("#reset-month").addEventListener("click", resetMonth);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDate(); });
window.addEventListener("focus", refreshDate);
window.setInterval(refreshDate, 60_000);

setupTabs();
activateTab("today");
renderDate();
renderAll();
cloudControls = setupCloudControls(store);
