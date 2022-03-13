const EnsureStreamHeaderStream = require('../utility/EnsureStreamHeaderStream');
const Stream = require('stream');
const ColumnMapTransformStream = require('../utility/ColumnMapTransformStream');

function copyStream(input, output, options) {
  const { columns } = options || {};

  const transforms = [];
  if (columns) {
    transforms.push(new ColumnMapTransformStream(columns));
  }
  if (output.requireFixedStructure) {
    transforms.push(new EnsureStreamHeaderStream());
  }

  // return new Promise((resolve, reject) => {
  //   Stream.pipeline(input, ...transforms, output, err => {
  //     if (err) {
  //       reject(err);
  //     } else {
  //       resolve();
  //     }
  //   });
  // });

  return new Promise((resolve, reject) => {
    const finisher = output['finisher'] || output;
    finisher.on('finish', resolve);
    finisher.on('error', reject);

    let lastStream = input;
    for (const tran of transforms) {
      lastStream.pipe(tran);
      lastStream = tran;
    }
    lastStream.pipe(output);

    //  if (output.requireFixedStructure) {
    //   const ensureHeader = new EnsureStreamHeaderStream();
    //   input.pipe(ensureHeader);
    //   ensureHeader.pipe(output);
    // } else {
    //   input.pipe(output);
    // }
  });
}

module.exports = copyStream;
