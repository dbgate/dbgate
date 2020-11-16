const dbgateApi = require('dbgate-api');

async function run() {
  const csvReader = await dbgateApi.csvReader({
    fileName: 'test.csv',
    // header: false,
  });

  const excelReader = await dbgateApi.excelSheetReader({
    fileName: '/home/jena/Downloads/events-Jan_Prochazka.xlsx',
    sheetName: 'Events',
  });

  const jsonReader = await dbgateApi.jsonLinesReader({
    fileName: 'test.jsonl',
    header: false,
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
    pureName: 'Genre3',
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

  // await dbgateApi.copyStream(excelReader, consoleWriter);
  await dbgateApi.copyStream(jsonReader, tableWriter);
  // await dbgateApi.copyStream(csvReader, consoleWriter);
  // await dbgateApi.copyStream(csvReader, tableWriter);
}

dbgateApi.runScript(run);
