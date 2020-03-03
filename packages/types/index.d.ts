import { ChildProcess } from "child_process";
import { DatabaseInfo } from "./dbinfo";
export interface OpenedDatabaseConnection {
  conid: string;
  database: string;
  structure: DatabaseInfo;
  subprocess: ChildProcess;
}

export interface StoredConnection {
  engine: string;
  server: string;
  port?: number;
  user: string;
  password: string;
  displayName: string;
}

export * from "./engines";
export * from "./dbinfo";
export * from "./query";
export * from "./dialect";
export * from "./dumper";
