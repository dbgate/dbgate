// interface ApplicationCommand {
//   name: string;
//   sql: string;
// }

// interface ApplicationQuery {
//   name: string;
//   sql: string;
// }

interface VirtualReferenceDefinition {
  pureName: string;
  schemaName?: string;
  refSchemaName?: string;
  refTableName: string;
  columns: {
    columnName: string;
    refColumnName: string;
  }[];
}

interface DictionaryDescriptionDefinition {
  pureName: string;
  schemaName?: string;
  expression: string;
  columns: string[];
  delimiter: string;
}

interface ApplicationUsageRule {
  conditionGroup?: string;
  serverHostsRegex?: string;
  serverHostsList?: string[];
  databaseNamesRegex?: string;
  databaseNamesList?: string[];
  tableNamesRegex?: string;
  tableNamesList?: string[];
  columnNamesRegex?: string;
  columnNamesList?: string[];
}

export interface ApplicationDefinition {
  appid: string;
  applicationName: string;
  applicationIcon?: string;
  applicationColor?: string;
  usageRules?: ApplicationUsageRule[];
  files?: {
    [key: string]: {
      label: string;
      sql: string;
      type: 'query' | 'command';
    };
  };
  virtualReferences?: VirtualReferenceDefinition[];
  dictionaryDescriptions?: DictionaryDescriptionDefinition[];
}
