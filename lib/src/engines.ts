import { QueryResult } from "./query";

export interface EngineDriver {
    connect({ server, port, user, password });
    query(pool, sql: string): Promise<QueryResult>;
    getVersion(pool): Promise<string>;
    listDatabases(pool): Promise<{ name: string }[]>;
    analyseFull(pool): Promise<void>;
    analyseIncremental(pool): Promise<void>;
  }
  