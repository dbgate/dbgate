const { fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const logger = getLogger('tableWriter');

/**
 * Creates writer object for {@link copyStream} function. This writer object writes data to table. Table could be created if not exists.
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect)
 * @param {string} options.pureName - table name
 * @param {string} options.schemaName - schema name
 * @param {object} options.driver - driver object
 * @param {boolean} options.dropIfExists - drop table if exists
 * @param {boolean} options.truncate - truncate table before insert
 * @param {boolean} options.createIfNotExists - create table if not exists
 * @param {boolean} options.commitAfterInsert - commit transaction after insert
 * @returns {Promise<writerType>} - writer object
 */
async function tableWriter({ connection, schemaName, pureName, driver, systemConnection, ...options }) {
  logger.info(`Writing table ${fullNameToString({ schemaName, pureName })}`);

  if (!driver) {
    driver = requireEngineDriver(connection);
  }
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));

  logger.info(`Connected.`);
  return await driver.writeTable(dbhan, { schemaName, pureName }, options);
}

module.exports = tableWriter;
