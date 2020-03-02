import types from "@dbgate/types";

export default function getDriver(
  connection: string | { engine: string }
): types.EngineDriver;
