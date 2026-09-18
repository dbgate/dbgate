const path = require('path');
const fs = require('fs');
const { jsldir, archivedir, resolveArchiveFolder, uploadsdir } = require('./directories');
const platformInfo = require('./platformInfo');

// Same shape the upload endpoint (controllers/uploads.js) requires for the name it
// generates with crypto.randomUUID() before writing the file into uploadsdir().
const UPLOAD_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalize = p => (process.platform === 'win32' ? p.toLowerCase() : p);

// A file:// jslid built from a web/Docker upload always points at
// <uploadsdir()>/<uuid>, where the uuid is generated server-side, never chosen by the
// client. This checks a candidate path against exactly that shape: the last path
// segment must look like such a uuid, and the directory holding it must really be
// uploadsdir(), even behind a symlink. realpathSync is used on the full path when the
// file already exists (so a symlinked file, not only a symlinked parent directory,
// cannot point outside uploadsdir()), and falls back to resolving just the parent
// directory for a target that is about to be created for the first time.
function isUploadedFilePath(rawPath) {
  const base = path.basename(rawPath);
  if (!UPLOAD_NAME_RE.test(base) || path.join(path.dirname(rawPath), base) !== path.normalize(rawPath)) {
    return false;
  }

  let realDir;
  try {
    realDir = fs.existsSync(rawPath)
      ? path.dirname(fs.realpathSync(rawPath))
      : fs.realpathSync(path.dirname(rawPath));
  } catch {
    return false;
  }

  let realUploadsDir;
  try {
    realUploadsDir = fs.realpathSync(uploadsdir());
  } catch {
    return false;
  }

  return normalize(realDir) === normalize(realUploadsDir);
}

function getJslFileName(jslid) {
  const archiveMatch = jslid.match(/^archive:\/\/([^/]+)\/(.*)$/);
  if (archiveMatch) {
    return path.join(resolveArchiveFolder(archiveMatch[1]), `${archiveMatch[2]}.jsonl`);
  }
  const fileMatch = jslid.match(/^file:\/\/(.*)$/);
  if (fileMatch) {
    // file:// jslids point at an arbitrary path on the local filesystem. The Electron
    // desktop app relies on this to open a file chosen through its own native picker,
    // which already has unrestricted local disk access, so it keeps working unchanged
    // there. Outside Electron, the only legitimate producer of a file:// jslid is the
    // upload endpoint, which always writes into uploadsdir() under a server-generated
    // name (see packages/web/src/utility/uploadFiles.ts). Any other file:// path
    // reaching here over the web/Docker API is client-supplied and is rejected.
    if (!platformInfo.isElectron && !isUploadedFilePath(fileMatch[1])) {
      throw new Error('DBGM-00000 Forbidden jslid scheme');
    }
    return fileMatch[1];
  }
  return path.join(jsldir(), `${jslid}.jsonl`);
}

module.exports = getJslFileName;
