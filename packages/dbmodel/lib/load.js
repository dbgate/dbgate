const _ = require('lodash');
const dbgateApi = require('dbgate-api');

async function load({ connection, outputDir }) {
  await dbgateApi.loadDatabase(connection, outputDir);

  // await connect(options);
  // const { client } = options;
  // const loadFunc = require(`./clients/${client}/load`);
  // options.databaseStructure = await loadFunc(options);
  // if (options.loadDataCondition) {
  //   const { tables } = options.databaseStructure;
  //   for (const tableName of _.keys(tables)) {
  //     const table = tables[tableName];
  //     if (!options.loadDataCondition(table)) continue;
  //     const data = await query(options, `SELECT * FROM [${tableName}]`);
  //     table.data = data;
  //   }
  // }
  // return options;
}

module.exports = load;
