const stream = require('stream');
const _ = require('lodash');

function streamPipeline(...processedStreams) {
  const streams = _.flattenDeep(processedStreams);
  return new Promise((resolve, reject) => {
    // @ts-ignore
    stream.pipeline(...streams, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = streamPipeline;
