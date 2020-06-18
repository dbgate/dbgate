const dbgateApi = require('@dbgate/api');

async function run() {
  const var3 = await dbgateApi.excelSheetReader({
    fileName: '/home/jena/google-drive/Metrostav/e2-ciselniky/Číselníky 2. etapa - v01.xlsx',
    sheetName: 'Ucet',
  });
  const var4 = await dbgateApi.tableWriter({
    connection: { server: 'localhost', engine: 'mssql', user: 'sa', password: 'Pwd2020Db', database: 'Importy' },
    pureName: 'Ucet',
    createIfNotExists: true,
    dropIfExists: true,
  });
  await dbgateApi.copyStream(var3, var4);
}

dbgateApi.runScript(run);
