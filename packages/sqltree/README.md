# dbgate-sqltree

JavaScript/TypeScript SQL query-builder library

dbgate-sqltree hold query definition in RAW JSON objects.

## Sample usage

```javascript
const { treeToSql, dumpSqlSelect } = require("dbgate-sqltree");
const dbgatePluginMysql = require("dbgate-plugin-mysql");

const select = {
  commandType: "select",
  from: {
    name: {
      pureName: "Album",
    },
  },
  columns: [
    {
      exprType: "column",
      columnName: "name",
    },
  ],
  orderBy: [
    {
      exprType: "column",
      columnName: "id",
      direction: "ASC",
    },
  ],
};

const sql = treeToSql(dbgatePluginMysql.driver, select, dumpSqlSelect);
console.log("Generated query:", sql);

```

See [TypeScript definitions](https://github.com/dbgate/dbgate/blob/master/packages/sqltree/src/types.ts) for complete list of available SQL command options.

## Installation

    yarn add dbgate-sqltree
