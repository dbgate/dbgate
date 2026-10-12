// Database object names become file and folder names when a model is exported. They come from
// the database, and a name like "../../x" is valid in most of them, so path separators (and the
// characters Windows treats specially in paths) are replaced, and so is a name made only of dots
// - a schema called ".." would otherwise be a folder one level up.
function objectFileName(name) {
  const res = String(name ?? '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_');
  return /^\.*$/.test(res) ? res.replace(/\./g, '_') || '_' : res;
}

// Different objects can still get the same file name - tables of the same name in two schemas,
// names differing only in case (one file on Windows and macOS), or names that objectFileName maps
// to the same text. Returns a function giving a name not used yet in the folder ("orders.sql",
// then "orders_2.sql", ...), so that one object does not silently overwrite another.
function createUniqueFileNamer() {
  const usedByDir = new Map();
  return (dir, baseName, suffix = '') => {
    if (!usedByDir.has(dir)) usedByDir.set(dir, new Set());
    const used = usedByDir.get(dir);
    let name = baseName;
    for (let index = 2; used.has(`${name}${suffix}`.toLowerCase()); index++) {
      name = `${baseName}_${index}`;
    }
    used.add(`${name}${suffix}`.toLowerCase());
    return `${name}${suffix}`;
  };
}

module.exports = objectFileName;
module.exports.createUniqueFileNamer = createUniqueFileNamer;
