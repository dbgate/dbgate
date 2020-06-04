function copyStream(input, output) {
  return new Promise((resolve, reject) => {
    const finisher = output['finisher'] || output;
    finisher.on('finish', resolve);
    finisher.on('error', reject);
    input.pipe(output);
  });
}

module.exports = copyStream;
