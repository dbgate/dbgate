const EnsureStreamHeaderStream = require('../utility/EnsureStreamHeaderStream');
const ColumnMapTransformStream = require('../utility/ColumnMapTransformStream');
const streamPipeline = require('../utility/streamPipeline');
const { getLogger, extractErrorLogData, RowProgressReporter, extractErrorMessage } = require('dbgate-tools');
const logger = getLogger('copyStream');
const stream = require('stream');

class ReportingTransform extends stream.Transform {
  constructor(reporter, options = {}) {
    super({ ...options, objectMode: true });
    this.reporter = reporter;
  }
  _transform(chunk, encoding, callback) {
    if (!chunk?.__isStreamHeader) {
      this.reporter.add(1);
    }
    this.push(chunk);
    callback();
  }
  _flush(callback) {
    this.reporter.finish();
    callback();
  }
}

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

  if (progressName) {
    const reporter = new RowProgressReporter(progressName, 'readRowCount');
    transforms.push(new ReportingTransform(reporter));
  }
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
        message: extractErrorMessage(err),
        ...err,
      },
    });

    if (progressName) {
      process.send({
        msgtype: 'progress',
        progressName,
        status: 'error',
        errorMessage: extractErrorMessage(err),
      });
    }

    logger.error(extractErrorLogData(err, { progressName }), 'Import/export job failed');
    // throw err;
  }
}

module.exports = copyStream;
