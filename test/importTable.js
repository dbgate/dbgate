const dbgateApi = require('@dbgate/api');

async function run() {
  const csvReader = await dbgateApi.csvReader({
    fileName: 'test.csv',
    // header: false,
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

  await dbgateApi.copyStream(csvReader, consoleWriter);
}

dbgateApi.runScript(run);
