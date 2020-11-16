import types from "dbgate-types";

declare function getDriver(
  connection: string | { engine: string }
): types.EngineDriver;

export = getDriver;
