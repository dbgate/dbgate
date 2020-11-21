import { ChildProcess } from 'child_process';
import { DatabaseInfo } from './dbinfo';
export interface OpenedDatabaseConnection {
  conid: string;
  database: string;
  structure: DatabaseInfo;
  subprocess: ChildProcess;
  disconnected?: boolean;
  status?: {
    name: string;
    message?: string;
  };
}

export interface OpenedSession {
  sesid: string;
  conid: string;
  database: string;
  subprocess: ChildProcess;
}

export interface OpenedRunner {
  runid: string;
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

export * from './engines';
export * from './dbinfo';
export * from './query';
export * from './dialect';
export * from './dumper';
export * from './dbtypes';
export * from './fileformat';
