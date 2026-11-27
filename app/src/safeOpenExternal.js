const path = require('path');
const url = require('url');

// links coming from the renderer may only open these protocols in the OS
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

// local files may be opened only if the user has just chosen them in a save dialog (eg. opening an exported file)
const savedDialogFiles = new Set();

function registerSavedDialogFile(filePath) {
  if (filePath) savedDialogFiles.add(path.resolve(filePath));
}

function fileUrlToLocalPath(target) {
  // the frontend sends 'file:///' + filePath, eg. file:///C:\dir\file.html or file:////home/user/file.html
  const rest = target.replace(/^file:\/*/i, '');
  return path.resolve(process.platform === 'win32' ? rest : '/' + rest);
}

function getSafeExternalUrl(target) {
  if (typeof target !== 'string') return null;

  if (/^file:/i.test(target)) {
    const filePath = fileUrlToLocalPath(target);
    return savedDialogFiles.has(filePath) ? url.pathToFileURL(filePath).href : null;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return null;
  }
  return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? parsed.href : null;
}

function safeOpenExternal(shell, target) {
  const safeUrl = getSafeExternalUrl(target);
  if (!safeUrl) {
    console.warn('DBGM-00000 Refused to open external link', String(target).substring(0, 200));
    return;
  }
  return shell.openExternal(safeUrl);
}

module.exports = {
  safeOpenExternal,
  registerSavedDialogFile,
  getSafeExternalUrl,
};
