interface ApplicationCommand {
  name: string;
  sql: string;
}

interface ApplicationQuery {
  name: string;
  sql: string;
}

interface ApplicationDefinition {
  name: string;

  queries: ApplicationQuery[];
  commands: ApplicationCommand[];
}
