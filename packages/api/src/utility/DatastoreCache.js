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
    let entry;
    for (;;) {
      entry = this.entries.get(key);
      if (!entry) break;
      if (entry.closing) {
        // The reader is still being released. Don't reuse or replace the datastore until the file
        // handle is really gone, otherwise we would open a second reader over the same file.
        if (existingOnly) return;
        await entry.closing.catch(() => {}); // the error is reported by whoever started the close
        continue;
      }
      if (existingOnly || entry.datastore.formatterFunction == formatterFunction) break;
      await this.close(key);
    }
    if (!entry) {
      if (existingOnly) return;
      entry = { datastore: this.create(key, formatterFunction), active: 0, lastUsed: Date.now(), closing: null };
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
    if (entry.closing) return entry.closing;
    entry.closing = (async () => {
      if (entry.active) {
        await new Promise(resolve => {
          entry.onIdle = resolve;
        });
      }
      try {
        await entry.datastore._closeReader();
      } finally {
        // Drop the entry only once the reader is closed, so that callers waiting on entry.closing
        // (and callers of close itself) are guaranteed the file handle is released on return.
        if (this.entries.get(key) === entry) this.entries.delete(key);
      }
    })();
    return entry.closing;
  }

  async trim() {
    const closing = [];
    let size = 0;
    for (const entry of this.entries.values()) {
      if (!entry.closing) size += 1;
    }
    for (const [key, entry] of this.entries) {
      if (entry.active || entry.closing) continue;
      if (size > this.maxEntries || Date.now() - entry.lastUsed >= this.idleMs) {
        closing.push(this.close(key).catch(this.onError));
        size -= 1;
      }
    }
    await Promise.all(closing);
  }
}

module.exports = DatastoreCache;
