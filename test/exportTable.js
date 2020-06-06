const dbgateApi = require('@dbgate/api');

async function run() {
  const queryReader = await dbgateApi.queryReader({
    connection: {
      server: 'localhost',
      engine: 'mysql',
      user: 'root',
      password: 'test',
      port: '3307',
      database: 'Chinook',
    },
    sql: 'SELECT * FROM Genre',
  });

  // const queryReader = await dbgateApi.fakeObjectReader({ delay: 1000 });

  const csvWriter = await dbgateApi.csvWriter({
    fileName: 'test.csv',
  });

  await dbgateApi.copyStream(queryReader, csvWriter);
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
