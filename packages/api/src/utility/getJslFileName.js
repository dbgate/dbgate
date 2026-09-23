const path = require('path');
const fs = require('fs');
const { jsldir, archivedir, uploadsdir, resolveArchiveFolder } = require('./directories');
const platformInfo = require('./platformInfo');

// A jslid is a client-supplied identifier for a JSON-lines dataset, and it is turned into a
// filesystem path that is then read from AND written to (jsldata.saveText, jsldata.saveRows,
// archive.saveJslData, ...). Two of its three forms can leave the managed data directories:
//
//   file://<path>          - an absolute path, verbatim
//   archive://<folder>/<x> - <x> is not restricted, so it can contain ../
//
// so the resolved path has to be confined here, once, rather than at each of the ~15 call
// sites. Confining at the call sites is what went wrong before: only jsldata.streamRows
// checked, and every other route stayed open.
//
// In the Electron app the user opens JSON-lines files from their own disk through a file
// dialog, so there is no boundary to enforce and any path is allowed - the same rule that
// files.loadFrom/saveAs already apply.
//
// Two levels of protection live here, and callers get different ones:
//
//   getJslFileName alone      confines the path. It answers where a jslid points at the moment
//                             it is asked, and hands back a name. A symlink swapped into that
//                             name afterwards is followed by whoever opens it.
//
//   openJslFileForWrite,      confine the path AND anchor the open to it, so the swap above
//   openJslFileForRead        cannot redirect the file that is actually opened. Callers work
//                             through the returned descriptor rather than the name.
//
// Only jsldata.saveText, jsldata.saveRows and jsldata.streamRows use the anchored form today.
// Every other caller - JsonLinesDatastore, archive.saveJslData's reader and copy, getStats,
// shell/jslDataReader, proc/restConnectionProcess - still opens the name it was given, so the
// confinement holds but the swap does not. Moving them over means changing six call sites
// across three processes and is deliberately left as its own change; until then, this module
// does not make all jsl access symlink-safe, only the three routes named above.

class InvalidJslPathError extends Error {
  constructor(jslid) {
    super(`DBGM-00000 Invalid jslid, resolves outside the allowed data directories: ${String(jslid).substring(0, 200)}`);
    this.name = 'InvalidJslPathError';
  }
}

function resolveJslPathUnchecked(jslid) {
  const archiveMatch = jslid.match(/^archive:\/\/([^/]+)\/(.*)$/);
  if (archiveMatch) {
    return path.join(resolveArchiveFolder(archiveMatch[1]), `${archiveMatch[2]}.jsonl`);
  }
  const fileMatch = jslid.match(/^file:\/\/(.*)$/);
  if (fileMatch) {
    return fileMatch[1];
  }
  return path.join(jsldir(), `${jslid}.jsonl`);
}

function realPathOrNull(target) {
  try {
    return fs.realpathSync(target);
  } catch (err) {
    return null;
  }
}

function realPathOrSelf(target) {
  // a managed root that does not exist yet is compared by its configured path
  return realPathOrNull(target) ?? path.resolve(target);
}

function isSymbolicLink(target) {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch (err) {
    return false;
  }
}

function normalizeForCompare(target) {
  return platformInfo.isWindows ? target.toLowerCase() : target;
}

function isInsideRoot(target, root) {
  return target == root || target.startsWith(root + path.sep);
}

/**
 * Resolves a path through the filesystem, so that a symlink anywhere along it - a symlinked
 * managed root, a symlinked directory planted inside one, or a symlink sitting at the final
 * component - is compared by the location it actually opens rather than by the string it was
 * reached through.
 *
 * A path whose tail does not exist yet, because a write is about to create it, is resolved down
 * to its deepest existing ancestor and the missing components are put back on. Resolving only
 * the immediate parent left a gap: when that did not exist either, the whole path fell back to
 * its lexical form, and a symlinked directory further up - jsl/linked -> outside, asked for as
 * jsl/linked/new/sub/file.jsonl - was then judged by the name it was reached through.
 *
 * Returns null when the path cannot be trusted at all: a dangling symlink, at the final
 * component or anywhere along the chain. It exists, so it is not a missing component to be put
 * back on, yet realpathSync cannot follow it, and a write through it would create whatever it
 * points at.
 */
function realResolve(filePath) {
  const resolved = path.resolve(filePath);
  const real = realPathOrNull(resolved);
  if (real != null) {
    return real;
  }
  if (isSymbolicLink(resolved)) {
    return null;
  }

  // path.resolve has already collapsed any '..', so the components put back on are plain names
  // that cannot climb out of the ancestor they are appended to
  const missing = [path.basename(resolved)];
  let ancestor = path.dirname(resolved);
  for (;;) {
    const realAncestor = realPathOrNull(ancestor);
    if (realAncestor != null) {
      return path.join(realAncestor, ...missing.reverse());
    }
    if (isSymbolicLink(ancestor)) {
      return null;
    }
    const parent = path.dirname(ancestor);
    if (parent == ancestor) {
      // reached the filesystem root without finding anything that exists
      return resolved;
    }
    missing.push(path.basename(ancestor));
    ancestor = parent;
  }
}

// uploadsdir is included because an uploaded .jsonl file is opened as file://<uploadsdir>/<id>
// by the web client (see utility/uploadFiles.ts)
function getManagedRoots() {
  return [jsldir(), archivedir(), uploadsdir()].map(root => normalizeForCompare(realPathOrSelf(root)));
}

/**
 * Whether an already resolved path lies inside a managed root. Takes a real path: the caller is
 * responsible for having resolved it, either through realResolve or from an open descriptor.
 */
function isInsideManagedRoots(realPath) {
  const target = normalizeForCompare(realPath);
  return getManagedRoots().some(root => isInsideRoot(target, root));
}

function isAllowedJslPath(filePath) {
  if (platformInfo.isElectron) {
    return true;
  }
  const real = realResolve(filePath);
  if (real == null) {
    return false;
  }
  return isInsideManagedRoots(real);
}

/**
 * @param {string} jslid
 * @returns {string} an absolute path inside the managed data directories
 * @throws {InvalidJslPathError} when the jslid resolves anywhere else
 */
function getJslFileName(jslid) {
  if (!jslid || typeof jslid != 'string') {
    throw new InvalidJslPathError(jslid);
  }
  const filePath = resolveJslPathUnchecked(jslid);
  if (!isAllowedJslPath(filePath)) {
    throw new InvalidJslPathError(jslid);
  }
  return filePath;
}

// Node exposes no fd-relative open (openat), so a path cannot be walked atomically and a
// symlink swapped into it between the check and the open would be followed. Holding the
// directory open and reaching the file through the kernel's own view of that descriptor is the
// way around it: /proc/self/fd/<dirfd> names the directory the fd actually refers to, whatever
// happens to the path it was reached through afterwards.
//
// utility/security.js does the same for export files and carries the full reasoning, including
// why macOS cannot join in - its /dev/fd/<fd> re-exposes the single descriptor rather than a
// traversable directory - and why Windows lacks the constants entirely. That implementation is
// not called here because its allow-list matches the export directories exactly, while a jslid
// legitimately resolves into an archive subfolder.
function beneathFdPath(fd) {
  return process.platform == 'linux' ? path.join('/proc/self/fd', String(fd)) : null;
}

function platformSupportsAnchoredOpen() {
  return process.platform == 'linux' && !!fs.constants.O_NOFOLLOW && !!fs.constants.O_DIRECTORY;
}

/**
 * Opens a path that isAllowedJslPath has already approved, on a platform that cannot anchor the
 * open to a directory descriptor. A swap timed exactly against this open cannot be prevented
 * outright there, so this narrows it instead: once the handle exists its identity is fixed, and
 * comparing it against an lstat of the same path catches a symlink planted at the final
 * component (which O_NOFOLLOW would have caught where it exists) as well as the file having been
 * replaced by a different one. lstat, not stat: stat would follow the same symlink the open just
 * followed and agree with it.
 */
async function openNarrowed(jslid, canonical, flags) {
  const handle = await fs.promises.open(canonical, flags | (fs.constants.O_NOFOLLOW || 0));
  try {
    const [handleStat, pathLstat] = await Promise.all([handle.stat(), fs.promises.lstat(canonical)]);
    if (pathLstat.isSymbolicLink()) {
      throw new InvalidJslPathError(jslid);
    }
    if (handleStat.dev !== pathLstat.dev || handleStat.ino !== pathLstat.ino) {
      throw new InvalidJslPathError(jslid);
    }
  } catch (err) {
    await handle.close();
    throw err;
  }
  return handle;
}

/**
 * Opens a jslid with the managed directory it lives in held open, so that nothing swapped into
 * the path afterwards can redirect the open.
 *
 * getJslFileName settles where the jslid points; this settles what is opened. The canonical path
 * is used rather than the one the caller shaped, so no directory symlink known at check time is
 * walked again. The directory is then opened with O_NOFOLLOW, its real location is read back
 * from the descriptor itself - not from the string it was reached through - and checked against
 * the managed roots, and the file is opened beneath that descriptor, again with O_NOFOLLOW. The
 * descriptor is what the containment check was made against, so the open cannot land elsewhere.
 *
 * @param {string} jslid
 * @param {number} flags the file open flags, O_NOFOLLOW is added
 * @returns {Promise<fs.promises.FileHandle>} an open handle the caller must close
 * @throws {InvalidJslPathError} when the jslid resolves outside the managed data directories, or
 *   when a symlink turned out to stand in the way
 */
async function openJslFileAnchored(jslid, flags) {
  const canonical = realResolve(getJslFileName(jslid));
  if (canonical == null) {
    throw new InvalidJslPathError(jslid);
  }

  if (!platformSupportsAnchoredOpen()) {
    return await openNarrowed(jslid, canonical, flags);
  }

  let dirHandle;
  try {
    dirHandle = await fs.promises.open(
      path.dirname(canonical),
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
    );
  } catch (err) {
    if (err?.code == 'ELOOP' || err?.code == 'ENOTDIR') {
      throw new InvalidJslPathError(jslid);
    }
    throw err;
  }

  try {
    const beneath = beneathFdPath(dirHandle.fd);
    const dirRealPath = realPathOrNull(beneath);
    if (!dirRealPath || !isInsideManagedRoots(dirRealPath)) {
      throw new InvalidJslPathError(jslid);
    }
    try {
      return await fs.promises.open(path.join(beneath, path.basename(canonical)), flags | fs.constants.O_NOFOLLOW);
    } catch (err) {
      if (err?.code == 'ELOOP') {
        throw new InvalidJslPathError(jslid);
      }
      throw err;
    }
  } finally {
    // the file handle is what the caller writes through, so the directory no longer has to be
    // held once it exists
    await dirHandle.close();
  }
}

/**
 * Opens a jslid for writing without letting a symlink redirect what is written.
 *
 * Deliberately opened without O_TRUNC: truncating as part of the open would already have
 * destroyed whatever file a redirected open landed on, even though the write itself is then
 * refused. The handle is truncated once it has been vouched for.
 *
 * The Electron app keeps following symlinks, because there the user picked the path from a
 * dialog on their own machine.
 *
 * @param {string} jslid
 * @returns {Promise<fs.promises.FileHandle>} an open, truncated handle the caller must close
 */
async function openJslFileForWrite(jslid) {
  if (platformInfo.isElectron) {
    return await fs.promises.open(getJslFileName(jslid), 'w');
  }

  const handle = await openJslFileAnchored(jslid, fs.constants.O_WRONLY | fs.constants.O_CREAT);
  try {
    await handle.truncate(0);
  } catch (err) {
    await handle.close();
    throw err;
  }
  return handle;
}

/**
 * Opens a jslid for reading through the same anchored path as a write.
 *
 * Streaming the client-shaped path instead leaves the read open to the same swap a write is:
 * approving a name and then handing that name back to createReadStream reads whatever the name
 * resolves to by then, not what was approved.
 *
 * @param {string} jslid
 * @returns {Promise<fs.promises.FileHandle>} an open handle the caller must close
 */
async function openJslFileForRead(jslid) {
  if (platformInfo.isElectron) {
    return await fs.promises.open(getJslFileName(jslid), 'r');
  }
  return await openJslFileAnchored(jslid, fs.constants.O_RDONLY);
}

module.exports = getJslFileName;
module.exports.isAllowedJslPath = isAllowedJslPath;
module.exports.openJslFileForWrite = openJslFileForWrite;
module.exports.openJslFileForRead = openJslFileForRead;
module.exports.InvalidJslPathError = InvalidJslPathError;
