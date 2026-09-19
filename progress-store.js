import { dailyTasks, weeklySchedule, monthlySchedule } from "./tasks.js";

export const LEGACY_KEY = "home-reset-state-v1";
const PREFIX = "home-reset-state-v2";
const sections = ["daily", "weekly", "monthly"];
const catalogs = {
  daily: dailyTasks.map((task) => task.id),
  weekly: weeklySchedule.flatMap((group) => group.tasks.map((task) => `${group.key}:${task.id}`)),
  monthly: monthlySchedule.flatMap((group) => group.tasks.map((task) => `${group.key}:${task.id}`))
};

export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function periodKeys(date = new Date()) {
  const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return { daily: localDateKey(date), weekly: localDateKey(sunday), monthly: localDateKey(date).slice(0, 7) };
}

const validDocument = (id) => /^(daily|weekly)-\d{4}-\d{2}-\d{2}$|^monthly-\d{4}-\d{2}$/.test(id);
const sectionOf = (id) => id.split("-")[0];
const taskKey = (section, group, task) => section === "daily" ? task : `${group}:${task}`;
const isMap = (value) => value && typeof value === "object" && !Array.isArray(value);

function cleanTasks(id, tasks) {
  if (!validDocument(id) || !isMap(tasks)) return {};
  return Object.fromEntries(catalogs[sectionOf(id)]
    .filter((key) => typeof tasks[key] === "boolean")
    .map((key) => [key, tasks[key]]));
}

export function migrateLegacy(saved) {
  const documents = {};
  for (const section of sections) {
    const entry = saved?.[section];
    const id = `${section}-${entry?.period}`;
    if (!validDocument(id)) continue;
    const tasks = {};
    for (const key of catalogs[section]) {
      const [group, task] = section === "daily" ? [null, key] : key.split(":");
      const completed = section === "daily" ? entry.completed : entry.completed?.[group];
      if (Array.isArray(completed) && completed.includes(task)) tasks[key] = true;
    }
    documents[id] = tasks;
  }
  return documents;
}

// Pure merge used inside a Firestore transaction. Old device checkmarks fill
// missing fields only; an explicit cloud reset (false) must never be resurrected.
export function mergeChanges(remote, imports, changes) {
  const next = { ...remote };
  for (const [key, checked] of Object.entries(imports)) {
    if (checked === true && !Object.hasOwn(next, key)) next[key] = true;
  }
  return { ...next, ...changes };
}

export class ProgressStore {
  constructor({ storage, projectId = "local", now = () => new Date(), onChange = () => {} }) {
    this.storage = storage;
    this.now = now;
    this.onChange = onChange;
    this.projectId = projectId;
    this.storageOK = true;
    this.ownerKey = `${PREFIX}:${projectId}:last-user`;
    const owner = this.read(this.ownerKey);
    this.owner = typeof owner === "string" ? owner : null;
    this.generation = 0;
    this.stops = [];
    this.received = new Set();
    this.confirmed = {};
    this.online = true;
    this.data = this.load();
    this.persist();
  }

  read(key) {
    try {
      const raw = this.storage.getItem(key);
      try { return JSON.parse(raw); } catch { return null; }
    } catch {
      this.storageOK = false;
      return null;
    }
  }

  write(key, value) {
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      this.storageOK = false;
      return false;
    }
  }

  cacheKey(owner = this.owner) {
    return owner ? `${PREFIX}:${this.projectId}:user:${owner}` : `${PREFIX}:guest`;
  }

  load() {
    const saved = this.read(this.cacheKey());
    const next = { documents: {}, pending: {}, imports: {} };
    const documents = saved?.documents ?? (!this.owner ? migrateLegacy(this.read(LEGACY_KEY)) : {});
    for (const [id, tasks] of Object.entries(isMap(documents) ? documents : {})) {
      if (validDocument(id)) next.documents[id] = cleanTasks(id, tasks);
    }
    if (this.owner) {
      for (const [id, tasks] of Object.entries(isMap(saved?.pending) ? saved.pending : {})) {
        if (!validDocument(id) || !isMap(tasks)) continue;
        for (const key of catalogs[sectionOf(id)]) {
          const entry = tasks[key];
          if (typeof entry?.checked === "boolean" && typeof entry?.token === "string") {
            (next.pending[id] ??= {})[key] = entry;
            (next.documents[id] ??= {})[key] = entry.checked;
          }
        }
      }
      for (const [id, tasks] of Object.entries(isMap(saved?.imports) ? saved.imports : {})) {
        const imported = Object.fromEntries(Object.entries(cleanTasks(id, tasks)).filter(([, checked]) => checked));
        if (Object.keys(imported).length) next.imports[id] = imported;
      }
    }
    return next;
  }

  persist() { this.write(this.cacheKey(), this.data); }
  emit() { this.onChange(); }
  documentId(section) { return `${section}-${periodKeys(this.now())[section]}`; }
  currentDocuments() { return sections.map((section) => this.documentId(section)); }

  completed(section, group) {
    const tasks = this.data.documents[this.documentId(section)] ?? {};
    const prefix = section === "daily" ? "" : `${group}:`;
    return Object.keys(tasks).filter((key) => tasks[key] && key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  }

  set(section, group, task, checked) {
    const key = taskKey(section, group, task);
    if (!catalogs[section]?.includes(key) || typeof checked !== "boolean") return;
    this.record(this.documentId(section), { [key]: checked });
  }

  reset(section, group) {
    const keys = catalogs[section].filter((key) => !group || section === "daily" || key.startsWith(`${group}:`));
    this.record(this.documentId(section), Object.fromEntries(keys.map((key) => [key, false])));
  }

  record(id, changes) {
    this.data.documents[id] = { ...this.data.documents[id], ...changes };
    if (this.owner) {
      for (const [key, checked] of Object.entries(changes)) {
        (this.data.pending[id] ??= {})[key] = { checked, token: crypto.randomUUID() };
      }
    }
    this.failure = null;
    this.persist(); // Save the outbox before attempting any network request.
    this.emit();
    void this.flush();
  }

  setUser(uid) {
    this.disconnect();
    if (uid !== this.owner) {
      this.owner = uid;
      this.data = this.load();
    }
    this.write(this.ownerKey, uid);
    if (uid && !this.read(`${PREFIX}:guest-claimed`)) {
      const guest = this.read(this.cacheKey(null));
      const documents = guest?.documents ?? migrateLegacy(this.read(LEGACY_KEY));
      for (const [id, tasks] of Object.entries(isMap(documents) ? documents : {})) {
        const imported = Object.fromEntries(Object.entries(cleanTasks(id, tasks)).filter(([, checked]) => checked));
        if (Object.keys(imported).length) this.data.imports[id] = { ...imported, ...this.data.imports[id] };
      }
      // Only the first account on this browser claims the old guest progress.
      // Persist that claim after the import queue so an interruption is retryable.
      if (this.write(this.cacheKey(), this.data)) this.write(`${PREFIX}:guest-claimed`, { uid, projectId: this.projectId });
    }
    this.persist();
    this.emit();
  }

  disconnect() {
    this.generation += 1;
    this.stops.forEach((stop) => stop());
    this.stops = [];
    this.backend = null;
    this.received.clear();
    this.confirmed = {};
    this.failure = null;
  }

  connect(backend) {
    this.disconnect();
    if (!this.owner) return;
    this.backend = backend;
    const generation = this.generation;
    this.watched = this.currentDocuments();
    this.stops = this.watched.map((id) => backend.watch(id, (tasks) => {
      if (generation !== this.generation) return;
      const pending = Object.fromEntries(Object.entries(this.data.pending[id] ?? {}).map(([key, entry]) => [key, entry.checked]));
      this.confirmed[id] = cleanTasks(id, tasks);
      this.data.documents[id] = { ...this.confirmed[id], ...pending };
      this.received.add(id);
      this.persist();
      this.emit();
    }, (error) => {
      if (generation !== this.generation) return;
      this.failure = error;
      this.emit();
    }));
    this.emit();
    void this.flush();
  }

  refreshPeriods() {
    if (this.backend && this.currentDocuments().join() !== this.watched.join()) this.connect(this.backend);
  }

  setOnline(online) {
    this.online = online;
    if (online && this.backend) this.retry();
    this.emit();
  }

  retry() {
    if (this.backend) this.connect(this.backend);
  }

  hasPending() {
    return Object.keys(this.data.pending).length > 0 || Object.keys(this.data.imports).length > 0;
  }

  status() {
    if (!this.owner) return "local";
    if (!this.online) return "offline";
    if (this.failure) return "error";
    if (!this.backend) return "connecting";
    if (this.hasPending() || this.inFlight) return "saving";
    return this.received.size === 3 ? "synced" : "connecting";
  }

  async flush() {
    if (!this.backend || !this.owner || !this.online || this.inFlight) return;
    const backend = this.backend;
    const generation = this.generation;
    this.inFlight = true;
    this.emit();
    try {
      while (this.hasPending()) {
        const id = Object.keys(this.data.pending)[0] ?? Object.keys(this.data.imports)[0];
        const pending = { ...this.data.pending[id] };
        const imports = { ...this.data.imports[id] };
        const changes = Object.fromEntries(Object.entries(pending).map(([key, entry]) => [key, entry.checked]));
        await backend.commit(id, { imports, changes });
        if (generation !== this.generation) return;
        // A newer click during this request must remain in the durable outbox.
        for (const [key, entry] of Object.entries(pending)) {
          if (this.data.pending[id]?.[key]?.token === entry.token) delete this.data.pending[id][key];
        }
        if (!Object.keys(this.data.pending[id] ?? {}).length) delete this.data.pending[id];
        delete this.data.imports[id];
        // A newer server update may have arrived while this write was awaiting
        // acknowledgement. Remove the optimistic overlay when it is acknowledged.
        if (this.confirmed[id]) {
          const remaining = Object.fromEntries(Object.entries(this.data.pending[id] ?? {}).map(([key, entry]) => [key, entry.checked]));
          this.data.documents[id] = { ...this.confirmed[id], ...remaining };
        }
        this.persist();
        this.emit();
      }
      this.failure = null;
    } catch (error) {
      if (generation === this.generation) this.failure = error;
    } finally {
      this.inFlight = false;
      this.emit();
      // Do not overlap a replacement connection with a transaction still in
      // progress on the old one (for example after midnight or a retry).
      if (generation !== this.generation) void this.flush();
    }
  }
}
