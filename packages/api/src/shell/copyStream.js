const EnsureStreamHeaderStream = require('../utility/EnsureStreamHeaderStream');

function copyStream(input, output) {
  return new Promise((resolve, reject) => {
    const finisher = output['finisher'] || output;
    finisher.on('finish', resolve);
    finisher.on('error', reject);

    if (output.requireFixedStructure) {
      const ensureHeader = new EnsureStreamHeaderStream();
      input.pipe(ensureHeader);
      ensureHeader.pipe(output);
    } else {
      input.pipe(output);
    }
  });
}

module.exports = copyStream;
