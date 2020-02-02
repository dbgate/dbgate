import { QueryResult } from "./query";
export interface EngineDriver {
  connect({
    server,
    port,
    user,
    password
  }: {
    server: any;
    port: any;
    user: any;
    password: any;
  }): any;
  query(pool: any, sql: string): Promise<QueryResult>;
  getVersion(pool: any): Promise<string>;
  listDatabases(
    pool: any
  ): Promise<
    {
      name: string;
    }[]
  >;
  analyseFull(pool: any): Promise<void>;
  analyseIncremental(pool: any): Promise<void>;
}
