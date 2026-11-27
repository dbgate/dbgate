const fs = require('fs-extra');
const path = require('path');
const ageSeconds = 3600;

async function cleanDirectory(directory, age = undefined) {
  const files = await fs.readdir(directory);
  const now = new Date().getTime();

  for (const file of files) {
    const full = path.join(directory, file);
    const stat = await fs.stat(full);
    const mtime = stat.mtime.getTime();
    const expirationTime = mtime + (age || ageSeconds) * 1000;
    if (now > expirationTime) {
      if (stat.isDirectory()) {
        await fs.rmdir(full, { recursive: true });
      } else {
        await fs.unlink(full);
      }
    }
  }
}

// cleanDirectory removes entries by mtime, so anything still in use (a running script's directory,
// a data file being read) must have its mtime refreshed to survive the periodic sweep.
function touchInUse(...paths) {
  const now = new Date();
  for (const file of paths) {
    try {
      fs.utimesSync(file, now, now);
    } catch (err) {
      // already removed or not created yet, nothing to protect
    }
  }
}

// Refreshes the given paths repeatedly until the returned function is called.
function keepInUse(paths, intervalMs = 5 * 60 * 1000) {
  const timer = setInterval(() => touchInUse(...paths), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = cleanDirectory;
module.exports.touchInUse = touchInUse;
module.exports.keepInUse = keepInUse;
