const { fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const logger = getLogger('tableWriter');

/**
 * Creates writer object for {@link copyStream} function. This writer object writes data to table. Table could be created if not exists.
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} options.driver - driver object. If not provided, it will be loaded from connection
 * @param {string} options.pureName - table name
 * @param {string} options.schemaName - schema name
 * @param {boolean} options.dropIfExists - drop table if exists
 * @param {boolean} options.truncate - truncate table before insert
 * @param {boolean} options.createIfNotExists - create table if not exists
 * @param {boolean} options.commitAfterInsert - commit transaction after insert
 * @param {string} options.progressName - name for reporting progress
 * @param {any} options.targetTableStructure - target table structure (don't analyse if given)
 * @returns {Promise<writerType>} - writer object
 */
async function tableWriter({ connection, schemaName, pureName, driver, systemConnection, ...options }) {
  logger.info(`Writing table ${fullNameToString({ schemaName, pureName })}`);

  if (!driver) {
    driver = requireEngineDriver(connection);
  }
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));

  try {
    return await driver.writeTable(dbhan, { schemaName, pureName }, options);
  } catch (err) {
    if (options.progressName) {
      process.send({
        msgtype: 'progress',
        progressName: options.progressName,
        status: 'error',
        errorMessage: err.message,
      });
    }

    throw err;
  }
}

module.exports = tableWriter;
