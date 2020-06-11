const dbgateApi = require('@dbgate/api');

async function run() {
  const csvReader = await dbgateApi.csvReader({
    fileName: 'test.csv',
    // header: false,
  });

  const tableWriter = await dbgateApi.tableWriter({
    connection: {
      server: 'localhost',
      engine: 'mssql',
      user: 'sa',
      password: 'Pwd2020Db',
      database: 'Chinook',
    },
    schemaName: 'dbo',
    pureName: 'Genre2',
    createIfNotExists: true,
    truncate: true,
  });

  // const tableWriter = await dbgateApi.tableWriter({
  //   connection: {
  //     server: 'localhost',
  //     engine: 'mysql',
  //     user: 'root',
  //     password: 'test',
  //     port: '3307',
  //     database: 'Chinook',
  //   },
  //   pureName: 'importedTable'
  // });

  const consoleWriter = await dbgateApi.consoleObjectWriter();

  // await dbgateApi.copyStream(csvReader, consoleWriter);
  await dbgateApi.copyStream(csvReader, tableWriter);
}

dbgateApi.runScript(run);
