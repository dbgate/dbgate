# dbgate-engines

JavaScript library implementing MySQL, MS SQL and PostgreSQL operations. Server as abstraction layer for other DbGate packages, which could be database-engine independend. It can be used both on frontent (in browser) and on backend (in nodejs), but connection to real database is allowed only on backend.

## Installation

    yarn add dbgate-engines

## Usage
```javascript
const engines = require('dbgate-engines');
// driver supports operations of EngineDriver listed belowe
const driver = engine('mysql'); 
```

In most cases, you don't use driver methods directly, but you pass driver instance into other dbgate packages.

## Driver definition


```typescript
export interface EngineDriver {
  // works on both frontend and backend
  engine: string;
  dialect: SqlDialect;
  createDumper(): SqlDumper;

  // works only on backend
  connect(nativeModules, { server, port, user, password, database }): any;
  query(pool: any, sql: string): Promise<QueryResult>;
  stream(pool: any, sql: string, options: StreamOptions);
  readQuery(pool: any, sql: string, structure?: TableInfo): Promise<stream.Readable>;
  writeTable(pool: any, name: NamedObjectInfo, options: WriteTableOptions): Promise<stream.Writeable>;
  analyseSingleObject(
    pool: any,
    name: NamedObjectInfo,
    objectTypeField: keyof DatabaseInfo
  ): Promise<TableInfo | ViewInfo | ProcedureInfo | FunctionInfo | TriggerInfo>;
  analyseSingleTable(pool: any, name: NamedObjectInfo): Promise<TableInfo>;
  getVersion(pool: any): Promise<{ version: string }>;
  listDatabases(
    pool: any
  ): Promise<
    {
      name: string;
    }[]
  >;
  analyseFull(pool: any): Promise<DatabaseInfo>;
  analyseIncremental(pool: any, structure: DatabaseInfo): Promise<DatabaseInfo>;
}

```