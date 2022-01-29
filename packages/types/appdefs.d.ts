interface ApplicationCommand {
  name: string;
  sql: string;
}

interface ApplicationQuery {
  name: string;
  sql: string;
}

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

export interface ApplicationDefinition {
  name: string;

  queries: ApplicationQuery[];
  commands: ApplicationCommand[];
  virtualReferences: VirtualReferenceDefinition[];
  dictionaryDescriptions: DictionaryDescriptionDefinition[];
}
