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

module.exports = cleanDirectory;
