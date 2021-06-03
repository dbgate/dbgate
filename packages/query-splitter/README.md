[![NPM version](https://img.shields.io/npm/v/dbgate-query-splitter.svg)](https://www.npmjs.com/package/dbgate-query-splitter)

dbgate-query-splitter
====================

Splits long SQL query into into particular statements. Designed to have zero dependencies and to be fast.

Supports following SQL dialects:
* MySQL
* PostgreSQL
* SQLite
* Microsoft SQL Server

## Usage

```js
import { splitQuery, mysqlSplitterOptions, mssqlSplitterOptions, postgreSplitterOptions } from 'dbgate-query-splitter';

const output = splitQuery('SELECT * FROM `table1`;SELECT * FROM `table2`;', mysqlSplitterOptions);

// output is ['SELECT * FROM `table1`', 'SELECT * FROM `table2`']

```

## Contributing
Please run tests before pushing any changes.

```sh
yarn test
```

## Supported syntax
* Comments
* Dollar strings (PostgreSQL)
* GO separators (MS SQL)
* Custom delimiter, setby DELIMITER keyword (MySQL)
