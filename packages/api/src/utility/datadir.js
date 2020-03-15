const os = require('os');
const path = require('path');
const fs = require('fs');

let created = false;

module.exports = function datadir() {
  const dir = path.join(os.homedir(), 'dbgate-data');
  if (!created) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating data directory ${dir}`)
      fs.mkdirSync(dir);
    }
    created = true;
  }

  return dir;
};
