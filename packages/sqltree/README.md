# @dbgate/sqltree

JavaScript/TypeScript SQL query-builder library

@dbgate/sqltree hold query definition in RAW JSON objects.

## Sample usage

```javascript
const { treeToSql, dumpSqlSelect } = require('@dbgate/sqltree');
const engines = require('@dbgate/engines');

const select = {
  commandType: 'select',
  from: { name: 'Album' },
  columns: [
      {
        exprType: 'column',
        columnName: 'name',
      }
  ]
  })),
  orderBy: [
    {
      exprType: 'column',
      columnName: 'id',
      direction: 'ASC',
    },
  ],
};

const sql = treeToSql(engines('mysql'), select, dumpSqlSelect);
console.log('Generated SQL', sqll);

```

## Installation

    yarn add @dbgate/sqltree
