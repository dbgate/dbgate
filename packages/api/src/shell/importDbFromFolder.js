const path = require('path');
const fs = require('fs-extra');
const executeQuery = require('./executeQuery');
const { connectUtility } = require('../utility/connectUtility');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { getAlterDatabaseScript, DatabaseAnalyser } = require('dbgate-tools');
const importDbModel = require('../utility/importDbModel');
const jsonLinesReader = require('./jsonLinesReader');
const tableWriter = require('./tableWriter');
const copyStream = require('./copyStream');

/**
 * Deploys database model stored in modelFolder (table as yamls) to database
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} options.driver - driver object. If not provided, it will be loaded from connection
 * @param {string} options.folder - folder with model files (YAML files for tables, SQL files for views, procedures, ...)
 * @param {function[]} options.modelTransforms - array of functions for transforming model
 */
async function importDbFromFolder({ connection, systemConnection, driver, folder, modelTransforms }) {
  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read'));

  try {
    const model = await importDbModel(folder);

    let modelAdapted = {
      ...model,
      tables: model.tables.map(table => driver.adaptTableInfo(table)),
    };
    for (const transform of modelTransforms || []) {
      modelAdapted = transform(modelAdapted);
    }

    const modelNoFk = {
      ...modelAdapted,
      tables: modelAdapted.tables.map(table => ({
        ...table,
        foreignKeys: [],
      })),
    };

    const { sql } = getAlterDatabaseScript(
      DatabaseAnalyser.createEmptyStructure(),
      modelNoFk,
      {},
      DatabaseAnalyser.createEmptyStructure(),
      modelNoFk,
      driver
    );
    // console.log('CREATING STRUCTURE:', sql);
    await executeQuery({ connection, systemConnection: dbhan, driver, sql, logScriptItems: true });

    for (const table of model.tables) {
      const fileName = path.join(folder, `${table.pureName}.jsonl`);
      if (await fs.exists(fileName)) {
        const src = await jsonLinesReader({ fileName });
        const dst = await tableWriter({
          connection,
          pureName: table.pureName,
        });
        await copyStream(src, dst);
      }
    }

    const dmp = driver.createDumper();
    for (const table of modelAdapted.tables) {
      for (const fk of table.foreignKeys) {
        dmp.createForeignKey(fk);
      }
    }
    // create foreign keys
    await executeQuery({ connection, systemConnection: dbhan, driver, sql: dmp.s, logScriptItems: true });
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = importDbFromFolder;
