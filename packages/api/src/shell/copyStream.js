const EnsureStreamHeaderStream = require('../utility/EnsureStreamHeaderStream');

function copyStream(input, output) {
  return new Promise((resolve, reject) => {
    const ensureHeader = new EnsureStreamHeaderStream();
    const finisher = output['finisher'] || output;
    finisher.on('finish', resolve);
    finisher.on('error', reject);
    input.pipe(ensureHeader);
    ensureHeader.pipe(output);
  });
}

module.exports = copyStream;
