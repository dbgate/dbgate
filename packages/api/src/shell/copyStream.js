const EnsureStreamHeaderStream = require('../utility/EnsureStreamHeaderStream');
const ColumnMapTransformStream = require('../utility/ColumnMapTransformStream');
const streamPipeline = require('../utility/streamPipeline');

/**
 * Copies reader to writer. Used for import, export tables and transfer data between tables
 * @param {readerType} input - reader object
 * @param {writerType} output - writer object
 * @param {object} options - options
 * @returns {Promise}
 */
async function copyStream(input, output, options) {
  const { columns, progressName } = options || {};

  if (progressName) {
    process.send({
      msgtype: 'progress',
      progressName,
      status: 'running',
    });
  }

  const transforms = [];
  if (columns) {
    transforms.push(new ColumnMapTransformStream(columns));
  }
  if (output.requireFixedStructure) {
    transforms.push(new EnsureStreamHeaderStream());
  }

  try {
    await streamPipeline(input, transforms, output);

    if (progressName) {
      process.send({
        msgtype: 'progress',
        progressName,
        status: 'done',
      });
    }
  } catch (err) {
    process.send({
      msgtype: 'copyStreamError',
      copyStreamError: {
        message: err.message,
        ...err,
      },
    });

    if (progressName) {
      process.send({
        msgtype: 'progress',
        progressName,
        status: 'error',
      });
    }

    throw err;
  }
}

module.exports = copyStream;
