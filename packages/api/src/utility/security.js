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

function realPathOrNull(dir) {
  try {
    return fs.realpathSync(dir);
  } catch (err) {
    return null;
  }
}

// server/web writes of a client-supplied, full file path must land inside a
// managed data directory
function checkSecureExportFilePath(filePath) {
  if (typeof filePath != 'string' || filePath.length == 0) {
    return false;
  }
  const resolvedPath = path.resolve(filePath);
  const directory = path.dirname(resolvedPath);
  // Compare real (symlink-resolved) directories, not the raw configured ones - a managed root
  // that is itself a symlink (or has been replaced by one) would otherwise lexically match an
  // allowed directory while actually pointing somewhere else entirely.
  const realDirectory = realPathOrNull(directory);
  if (!realDirectory) {
    return false;
  }
  const allowedDirs = [filesdir(), uploadsdir(), archivedir(), appdir()].map(realPathOrNull).filter(Boolean);
  if (!allowedDirs.includes(realDirectory)) {
    return false;
  }
  try {
    // Cheap early rejection with a clear log message. This alone is racy (another process could
    // swap in a symlink between this check and the write) - writeExportFile below is what
    // actually closes that window, by opening a verified directory descriptor instead of
    // re-resolving the path from scratch.
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

// O_NOFOLLOW on the final open only protects the file's own name - it still walks every parent
// path component normally, so if the managed root (uploadsdir() etc.) is itself a symlink, or is
// swapped for one between checkSecureExportFilePath and this call, the "verified" path can still
// land outside every managed directory. Node has no public openat() binding, so the only way to
// truly anchor a write to a specific, already-verified directory is to hold that directory open
// (immune to its path entry being replaced afterwards) and resolve the final component through
// the kernel's per-process fd table rather than by re-walking the original path string.
// /proc/self/fd/<fd>/<name> (Linux) does exactly that. There is no equivalently reliable
// mechanism on other platforms, so everywhere else we fail closed.
function beneathFdPath(fd) {
  if (process.platform === 'linux') {
    return `/proc/self/fd/${fd}`;
  }
  return null;
}

// Writes an export destination that has already passed checkSecureExportFilePath. When noFollow
// is set, the write is anchored to a directory descriptor that is itself opened with O_NOFOLLOW
// and re-verified (by real path) against the managed directories, and the destination file is
// then opened beneath that descriptor with O_NOFOLLOW - so neither the managed root nor the
// destination file can be a symlink, and nothing swapped in after this function started can
// redirect the write.
async function writeExportFile(filePath, data, { noFollow }) {
  if (!noFollow) {
    await fs.promises.writeFile(filePath, data);
    return;
  }
  if (!fs.constants.O_NOFOLLOW || !fs.constants.O_DIRECTORY) {
    throw new SecureExportWriteRefusedError(
      'Cannot guarantee a symlink-safe write on this platform (O_NOFOLLOW/O_DIRECTORY unavailable)'
    );
  }

  const resolvedPath = path.resolve(filePath);
  const directory = path.dirname(resolvedPath);
  const baseName = path.basename(resolvedPath);

  let dirHandle;
  try {
    dirHandle = await fs.promises.open(
      directory,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
    );
  } catch (err) {
    if (err.code === 'ELOOP' || err.code === 'ENOTDIR') {
      throw new SecureExportWriteRefusedError(
        'Refused to write export file: managed directory is not a real directory'
      );
    }
    throw err;
  }

  try {
    const beneath = beneathFdPath(dirHandle.fd);
    if (!beneath) {
      throw new SecureExportWriteRefusedError(
        'Cannot guarantee a symlink-safe write on this platform (no beneath-directory open available)'
      );
    }

    // Re-derive the directory's real path from the fd we now hold - not from the string we were
    // given - and check it against the managed roots. This is the check that actually matters,
    // since it is made against the exact inode the write below will use.
    const dirRealPath = realPathOrNull(beneath);
    const allowedDirs = [filesdir(), uploadsdir(), archivedir(), appdir()].map(realPathOrNull).filter(Boolean);
    if (!dirRealPath || !allowedDirs.includes(dirRealPath)) {
      throw new SecureExportWriteRefusedError('Refused to write export file outside managed data directories');
    }

    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW;
    let fileHandle;
    try {
      fileHandle = await fs.promises.open(path.join(beneath, baseName), flags, 0o644);
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
  } finally {
    await dirHandle.close();
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
