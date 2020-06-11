const dbgateApi = require('@dbgate/api');

async function run() {
  // const queryReader = await dbgateApi.queryReader({
  //   connection: {
  //     server: 'localhost',
  //     engine: 'mysql',
  //     user: 'root',
  //     password: 'test',
  //     port: '3307',
  //     database: 'Chinook',
  //   },
  //   sql: 'SELECT * FROM Genre',
  // });

  const queryReader = await dbgateApi.queryReader({
    connection: {
      server: 'localhost',
      engine: 'mssql',
      user: 'sa',
      password: 'Pwd2020Db',
      database: 'Chinook',
    },
    sql: 'SELECT * FROM Genre',
  });

  // const queryReader = await dbgateApi.fakeObjectReader({ delay: 1000 });

  const csvWriter = await dbgateApi.csvWriter({
    fileName: 'test.csv',
    // header: false,
  });

  const jsonWriter = await dbgateApi.jsonLinesWriter({
    fileName: 'test.jsonl',
    header: false,
  });

  const consoleWriter = await dbgateApi.consoleObjectWriter();

  // await dbgateApi.copyStream(queryReader, csvWriter);
  await dbgateApi.copyStream(queryReader, jsonWriter);
  // await dbgateApi.copyStream(queryReader, consoleWriter);
}

dbgateApi.runScript(run);

// dbgateApi.runBatch([
//   {
//     type: 'copyStream',
//     source: {
//       type: 'queryReader',
//       connection: {
//         server: 'localhost',
//         engine: 'mysql',
//         user: 'root',
//         password: 'test',
//         port: '3307',
//         database: 'Chinook',
//       },
//       sql: 'SELECT * FROM Genre',
//     },
//     target: {
//       type: 'csvWriter',
//     },
//   },
// ]);
