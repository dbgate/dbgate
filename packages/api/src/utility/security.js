const fs = require('fs');
const path = require('path');
const { filesdir, archivedir, uploadsdir, appdir } = require('../utility/directories');

function checkSecureFilePathsWithoutDirectory(...filePaths) {
  for (const filePath of filePaths) {
    if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
      return false;
    }
  }
  return true;
}

function checkSecureDirectories(...filePaths) {
  for (const filePath of filePaths) {
    if (!filePath.includes('/') && !filePath.includes('\\')) {
      // If the filePath does not contain any directory separators, it is considered secure
      continue;
    }
    const directory = path.dirname(filePath);
    if (directory != filesdir() && directory != uploadsdir() && directory != archivedir() && directory != appdir()) {
      return false;
    }
  }
  return true;
}

function findDisallowedFileNames(node, isAllowed, trace = '$', out = []) {
  if (node && typeof node === 'object') {
    if (node?.props?.fileName) {
      const name = node.props.fileName;
      const ok = isAllowed(name);
      if (!ok) out.push({ path: `${trace}.props.fileName`, value: name });
    }

    // depth-first scan of every property / array index
    for (const [key, val] of Object.entries(node)) {
      findDisallowedFileNames(val, isAllowed, `${trace}.${key}`, out);
    }
  }
  return out;
}

function checkSecureDirectoriesInScript(script) {
  const disallowed = findDisallowedFileNames(script, checkSecureDirectories);
  return disallowed.length == 0;
}

// server/web writes of a client-supplied, full file path must land inside a
// managed data directory
function checkSecureExportFilePath(filePath) {
  if (typeof filePath != 'string' || filePath.length == 0) {
    return false;
  }
  const resolvedPath = path.resolve(filePath);
  const directory = path.dirname(resolvedPath);
  // filesdir()/uploadsdir()/etc. may be relative (eg. a relative WORKSPACE_DIR), while
  // resolvedPath is always absolute - resolve both sides before comparing.
  const allowedDirs = [filesdir(), uploadsdir(), archivedir(), appdir()].map(dir => path.resolve(dir));
  if (!allowedDirs.includes(directory)) {
    return false;
  }
  try {
    // Cheap early rejection with a clear log message. This alone is racy (another process could
    // swap in a symlink between this check and the write) - writeExportFile below is what
    // actually closes that window, by opening with O_NOFOLLOW instead of stat-then-write.
    if (fs.lstatSync(resolvedPath).isSymbolicLink()) {
      return false;
    }
  } catch (err) {
    // destination does not exist yet - nothing to follow
  }
  return true;
}

// Thrown by writeExportFile only for the specific TOCTOU condition it exists to guard against
// (destination turned out to be a symlink, or the platform can't make that check atomically).
// Callers must only translate this error to a "refused" result - any other error from
// writeExportFile is a genuine I/O failure (disk full, permissions, missing directory, ...) and
// must propagate instead of being reported as if the security check had failed.
class SecureExportWriteRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SecureExportWriteRefusedError';
  }
}

// Writes an export destination that has already passed checkSecureExportFilePath. When
// noFollow is set, the open() and the symlink check are the same atomic syscall (O_NOFOLLOW),
// so a symlink swapped in after checkSecureExportFilePath returns (TOCTOU) still can't be
// followed - unlike a separate lstat-then-fs.writeFile, which leaves that window open.
// O_NOFOLLOW is undefined on Windows - there is no atomic no-follow write available, so we fail
// closed rather than silently falling back to a write that could follow a symlink.
async function writeExportFile(filePath, data, { noFollow }) {
  if (!noFollow) {
    await fs.promises.writeFile(filePath, data);
    return;
  }
  if (!fs.constants.O_NOFOLLOW) {
    throw new SecureExportWriteRefusedError(
      'Cannot guarantee a symlink-safe write on this platform (O_NOFOLLOW unavailable)'
    );
  }
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW;
  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, flags, 0o644);
  } catch (err) {
    if (err.code === 'ELOOP') {
      throw new SecureExportWriteRefusedError('Refused to write export file through a symbolic link');
    }
    throw err;
  }
  try {
    await fileHandle.writeFile(data);
  } finally {
    await fileHandle.close();
  }
}

module.exports = {
  checkSecureDirectories,
  checkSecureFilePathsWithoutDirectory,
  checkSecureDirectoriesInScript,
  checkSecureExportFilePath,
  writeExportFile,
  SecureExportWriteRefusedError,
};
