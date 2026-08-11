const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
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

// fs.constants.O_NOFOLLOW/O_DIRECTORY are undefined on Windows, so the fd-anchored strategy
// below can't even attempt to run there. macOS does define both constants, but has no
// equivalent of Linux's /proc/self/fd/<fd> for reopening a path relative to an already-held
// directory descriptor (its /dev/fd/<fd> only re-exposes that single fd, not a traversable
// directory), so beneathFdPath() above intentionally only implements the Linux case. On every
// platform other than Linux we fall back to a plain open, re-checking checkSecureExportFilePath
// immediately beforehand to shrink (not eliminate) the TOCTOU window - refusing the write
// outright there would silently break every export-to-disk feature on non-Linux web/Docker
// deployments, which is worse than the narrowed race this falls back to.
function platformSupportsNoFollowOpen() {
  return process.platform === 'linux' && !!fs.constants.O_NOFOLLOW && !!fs.constants.O_DIRECTORY;
}

/**
 * Without O_NOFOLLOW the open() call below transparently follows a symlink planted at
 * filePath, so a swap timed exactly against this open cannot be prevented outright on these
 * platforms. This narrows the exposure instead: once the handle is open, its identity (dev
 * + inode) is fixed regardless of what happens to the path afterwards. The check below uses
 * lstat(), not stat() - stat() follows a symlink exactly like open() just did, so if one is
 * sitting at filePath, both the handle and stat() would consistently resolve to the same
 * external target and a dev/ino comparison alone would never catch it. lstat() reports on
 * filePath itself, so a planted symlink is caught directly via isSymbolicLink(); the dev/ino
 * comparison then only has to catch a same-name regular file having been swapped out for a
 * different regular file. A swap timed between this check and the caller's write is still
 * possible in theory, but that requires hitting a second, much narrower window right after
 * the first - and the write itself goes through the already-open fd, not the path, so such a
 * later swap cannot redirect it (the worst it does is fail this check and abort, since by
 * then filePath itself would need to be a symlink to trip it).
 *
 * Opens without O_TRUNC on purpose: the 'w' shorthand truncates as part of open() itself, so a
 * symlink planted at filePath would have already destroyed the external target's contents by
 * the time the checks below run, even though the write of new content still gets refused. The
 * handle is truncated explicitly, only once it has been verified.
 * @param {string} filePath
 */
async function plainExportOpen(filePath) {
  const fileHandle = await fs.promises.open(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT, 0o644);
  try {
    const [handleStat, pathLstat] = await Promise.all([fileHandle.stat(), fs.promises.lstat(filePath)]);
    if (pathLstat.isSymbolicLink()) {
      throw new SecureExportWriteRefusedError('Refused to write export file: destination is a symlink');
    }
    if (handleStat.dev !== pathLstat.dev || handleStat.ino !== pathLstat.ino) {
      throw new SecureExportWriteRefusedError(
        'Refused to write export file: destination identity changed while opening it'
      );
    }
    await fileHandle.truncate(0);
  } catch (err) {
    await fileHandle.close();
    throw err;
  }
  return fileHandle;
}

// Opens an export destination that has already passed checkSecureExportFilePath. When noFollow
// is set, access is anchored to a directory descriptor that is itself opened with O_NOFOLLOW
// and re-verified (by real path) against the managed directories, and the destination file is
// then opened beneath that descriptor with O_NOFOLLOW - so neither the managed root nor the
// destination file can be a symlink, and nothing swapped in after this function started can
// redirect the write.
/**
 * @param {string} filePath
 * @param {boolean} noFollow
 * @param {(fileHandle: import('fs').promises.FileHandle) => Promise<any>} callback
 */
async function withExportFileHandle(filePath, noFollow, callback) {
  if (!noFollow || !platformSupportsNoFollowOpen()) {
    if (noFollow && !checkSecureExportFilePath(filePath)) {
      throw new SecureExportWriteRefusedError('Refused to write export file outside managed data directories');
    }
    const fileHandle = await plainExportOpen(filePath);
    try {
      return await callback(fileHandle);
    } finally {
      await fileHandle.close();
    }
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
      return await callback(fileHandle);
    } finally {
      await fileHandle.close();
    }
  } finally {
    await dirHandle.close();
  }
}

async function writeExportFile(filePath, data, { noFollow }) {
  await withExportFileHandle(filePath, noFollow, fileHandle => fileHandle.writeFile(data));
}

// Streaming variant for exports that should not be buffered entirely in memory. The verified
// file and directory descriptors remain open until the producer has finished writing.
async function writeExportFileStream(filePath, producer, { noFollow }) {
  await withExportFileHandle(filePath, noFollow, async fileHandle => {
    const output = fs.createWriteStream(filePath, { fd: fileHandle.fd, autoClose: false });
    try {
      await producer(output);
    } catch (err) {
      output.destroy();
      throw err;
    }
  });
}

async function copyExportFile(sourceFilePath, targetFilePath, { noFollow }) {
  await writeExportFileStream(
    targetFilePath,
    output => pipeline(fs.createReadStream(sourceFilePath), output),
    { noFollow }
  );
}

module.exports = {
  checkSecureDirectories,
  checkSecureFilePathsWithoutDirectory,
  checkSecureDirectoriesInScript,
  checkSecureExportFilePath,
  writeExportFile,
  writeExportFileStream,
  copyExportFile,
  SecureExportWriteRefusedError,
};
