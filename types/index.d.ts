import { ChildProcess } from "child_process";
import { DatabaseInfo } from "./dbinfo";
export interface OpenedDatabaseConnection {
  conid: string;
  database: string;
  structure: DatabaseInfo;
  subprocess: ChildProcess;
}
export * from "./engines";
export * from "./dbinfo";
export * from "./query";
