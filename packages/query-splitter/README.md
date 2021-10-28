[![NPM version](https://img.shields.io/npm/v/dbgate-query-splitter.svg)](https://www.npmjs.com/package/dbgate-query-splitter)

# dbgate-query-splitter

Splits long SQL query into into particular statements. Designed to have zero dependencies and to be fast. Also supports nodejs-streams.

Supports following SQL dialects:

- MySQL
- PostgreSQL
- SQLite
- Microsoft SQL Server

## Usage

```js
import { splitQuery, mysqlSplitterOptions, mssqlSplitterOptions, postgreSplitterOptions } from 'dbgate-query-splitter';

const output = splitQuery('SELECT * FROM `table1`;SELECT * FROM `table2`;', mysqlSplitterOptions);

// output is ['SELECT * FROM `table1`', 'SELECT * FROM `table2`']
```

## Streaming support in nodejs
Function splitQueryStream accepts input stream and query options. Result is object stream, each object for one splitted query.
Tokens must not be divided into more input chunks. This can be accomplished eg. when input stream emits one chunk per line (eg. using byline module)

```js
const { mysqlSplitterOptions, mssqlSplitterOptions, postgreSplitterOptions } = require('dbgate-query-splitter');
const { splitQueryStream } = require('dbgate-query-splitter/lib/splitQueryStream');
const fs = require('fs');
const byline = require('byline');

const fileStream = fs.createReadStream('INPUT_FILE_NAME', 'utf-8');
const lineStream = byline(fileStream);
const splittedStream = splitQueryStream(lineStream, mysqlSplitterOptions);

```

## Contributing

Please run tests before pushing any changes.

```sh
yarn test
```

## Supported syntax

- Comments
- Dollar strings (PostgreSQL)
- GO separators (MS SQL)
- Custom delimiter, setby DELIMITER keyword (MySQL)
