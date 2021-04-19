[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![NPM version](https://img.shields.io/npm/v/dbgate-plugin-excel.svg)](https://www.npmjs.com/package/dbgate-plugin-excel)

# dbgate-plugin-excel

MS Excel import/export plugin for DbGate


## Usage without DbGate

Export from fake object reader into MS Excel file. Fake object file can be replaced with other reader/writer factory functions, as described in 
[dbgate-api package](https://www.npmjs.com/package/dbgate-api)

```javascript
const dbgateApi = require('dbgate-api');
const dbgatePluginExcel = require("dbgate-plugin-excel");

dbgateApi.registerPlugins(dbgatePluginExcel);


async function run() {
  const reader = await dbgateApi.fakeObjectReader();
  const writer = await dbgatePluginExcel.shellApi.writer({ fileName: 'myfile1.xlsx', sheetName: 'Sheet 1' });
  await dbgateApi.copyStream(reader, writer);
  console.log('Finished job script');
}
dbgateApi.runScript(run);


```

## Factory functions

### shellApi.reader
Reads tabular data from one sheet in MS Excel file.
```js
  const reader = await dbgatePluginExcel.shellApi.reader({
    fileName: 'test.xlsx',
    sheetName: 'Album',
    limitRows: null
  });
```

### shellApi.writer
Writes tabular data into MS excel file. There could be more writes into the some file in one script, if property sheetName is different.
```js
  const reader = await dbgatePluginExcel.shellApi.writer({
    fileName: 'test.xlsx',
    sheetName: 'Album',
  });
```
