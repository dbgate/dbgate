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
    // fs.writeFile/fs.copyFile follow an existing symlink; lstat (no-follow) lets us refuse to
    // write through one instead of landing outside the managed directory.
    if (fs.lstatSync(resolvedPath).isSymbolicLink()) {
      return false;
    }
  } catch (err) {
    // destination does not exist yet - nothing to follow
  }
  return true;
}

module.exports = {
  checkSecureDirectories,
  checkSecureFilePathsWithoutDirectory,
  checkSecureDirectoriesInScript,
  checkSecureExportFilePath,
};
