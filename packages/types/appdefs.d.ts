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

interface ApplicationDefinition {
  name: string;

  queries: ApplicationQuery[];
  commands: ApplicationCommand[];
  virtualReferences: VirtualReferenceDefinition[];
}
