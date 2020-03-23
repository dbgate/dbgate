import { QueryResult } from "./query";
import { SqlDialect } from "./dialect";
import { SqlDumper } from "./dumper";
import { DatabaseInfo } from "./dbinfo";

export interface EngineDriver {
  engine: string;
  connect(nativeModules, { server, port, user, password, database }): any;
  query(pool: any, sql: string): Promise<QueryResult>;
  getVersion(pool: any): Promise<{ version: string }>;
  listDatabases(
    pool: any
  ): Promise<
    {
      name: string;
    }[]
  >;
  analyseFull(pool: any): Promise<DatabaseInfo>;
  // analyseIncremental(pool: any): Promise<void>;
  dialect: SqlDialect;
  createDumper(): SqlDumper;
}
