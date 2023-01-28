const { createLogger } = require('pinomin');

const logger = createLogger('runAndExit');

async function runAndExit(promise) {
  try {
    await promise;
    logger.info('Success');
    process.exit();
  } catch (err) {
    logger.error({ err }, 'Processing failed');
    process.exit(1);
  }
}

module.exports = runAndExit;
