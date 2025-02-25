import { ParameterInfo, SchedulerEventInfo, TriggerInfo } from './dbinfo';

export type TestObjectInfo = {
  type: string;
  create1: string;
  create2: string;
  drop1: string;
  drop2: string;
};

export type TestEngineInfo = {
  label: string;
  connection: {
    engine: string;
    server?: string;
    databaseUrl?: string;
    serviceName?: string;
    password?: string;
    user?: string;
    port?: number;
  };

  removeNotNull?: boolean;

  skipOnCI?: boolean;
  skipIncrementalAnalysis?: boolean;
  skipDataModifications?: boolean;
  skipReferences?: boolean;
  skipIndexes?: boolean;
  skipNullability?: boolean;
  skipUnique?: boolean;
  skipAutoIncrement?: boolean;
  skipPkColumnTesting?: boolean;
  skipDataDuplicator?: boolean;
  skipDeploy?: boolean;
  skipStringLength?: boolean;
  skipChangeColumn?: boolean;
  skipDefaultValue?: boolean;
  skipNonPkRename?: boolean;
  skipPkDrop?: boolean;
  skipOrderBy?: boolean;
  skipImportModel?: boolean;

  forceSortResults?: boolean;
  forceSortStructureColumns?: boolean;
  alterTableAddColumnSyntax?: boolean;
  dbSnapshotBySeconds?: boolean;
  setNullDefaultInsteadOfDrop?: boolean;

  useTextTypeForStrings?: boolean;

  supportRenameSqlObject?: boolean;
  supportSchemas?: boolean;

  defaultSchemaName?: string;

  generateDbFile?: boolean;
  dbSnapshotBySeconds?: boolean;
  dumpFile?: string;
  dumpChecks?: Array<{ sql: string; res: string }>;

  parametersOtherSql?: string[];
  parameters?: Array<{
    testName: string;
    create: string;
    drop: string;
    objectTypeField: string;
    list: Array<Partial<ParameterInfo>>;
  }>;
  triggers?: Array<{
    testName: string;
    create: string;
    drop: string;
    triggerOtherCreateSql?: string;
    triggerOtherDropSql?: string;
    objectTypeField: string;
    expected: Partial<TriggerInfo>;
  }>;
  schedulerEvents?: Array<{
    create: string;
    drop: string;
    objectTypeField: string;
    expected: Partial<SchedulerEventInfo>;
  }>;

  objects?: Array<TestObjectInfo>;
};
