import types from "@dbgate/types";

export function getDriver(
  connection: string | { engine: string }
): types.EngineDriver;
