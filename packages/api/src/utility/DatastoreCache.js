// Cache idle readers, while keeping in-flight reads and sorts alive until they finish.
class DatastoreCache {
  constructor(create, onError, { maxEntries = 32, idleMs = 5 * 60 * 1000 } = {}) {
    this.create = create;
    this.onError = onError;
    this.maxEntries = maxEntries;
    this.idleMs = idleMs;
    this.entries = new Map();
    this.timer = setInterval(() => this.trim().catch(onError), 60 * 1000);
    this.timer.unref();
  }

  async use(key, formatterFunction, action, existingOnly = false) {
    let entry = this.entries.get(key);
    while (entry && !existingOnly && entry.datastore.formatterFunction != formatterFunction) {
      await this.close(key);
      entry = this.entries.get(key);
    }
    if (!entry) {
      if (existingOnly) return;
      entry = { datastore: this.create(key, formatterFunction), active: 0, lastUsed: Date.now() };
      this.entries.set(key, entry);
    }
    entry.active += 1;
    // Map insertion order gives us least recently used entries first.
    this.entries.delete(key);
    this.entries.set(key, entry);
    try {
      return await action(entry.datastore);
    } finally {
      entry.active -= 1;
      entry.lastUsed = Date.now();
      if (!entry.active) entry.onIdle?.();
      await this.trim();
    }
  }

  async close(key) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.entries.delete(key);
    if (entry.active)
      await new Promise(resolve => {
        entry.onIdle = resolve;
      });
    await entry.datastore._closeReader();
  }

  async trim() {
    const closing = [];
    for (const [key, entry] of this.entries) {
      if (entry.active) continue;
      if (this.entries.size > this.maxEntries || Date.now() - entry.lastUsed >= this.idleMs) {
        closing.push(this.close(key).catch(this.onError));
      }
    }
    await Promise.all(closing);
  }
}

module.exports = DatastoreCache;
