import { EngineDriver, SqlDumper } from "@dbgate/types";

export class Command {
  toSql(driver: EngineDriver) {
    const dumper = driver.createDumper();
    this.dumpSql(dumper);
    return dumper.s;
  }

  dumpSql(dumper: SqlDumper) {}
}
