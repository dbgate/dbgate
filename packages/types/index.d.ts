import { ChildProcess } from 'child_process';
import { DatabaseInfo } from './dbinfo';
export interface OpenedDatabaseConnection {
  conid: string;
  database: string;
  structure: DatabaseInfo;
  analysedTime?: number;
  serverVersion?: any;
  subprocess: ChildProcess;
  disconnected?: boolean;
  status?: {
    name: string;
    message?: string;
    counter: number;
  };
}

export interface OpenedSession {
  sesid: string;
  conid: string;
  database: string;
  killOnDone?: boolean;
  loadingReader_jslid: string;
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
export * from './extensions';
export * from './alter-processor';
export * from './appdefs';
export * from './filter-type';
export * from './test-engines';
