import { EngineDriver, SqlDumper } from "@dbgate/types";

class Command {
  toSql(driver: EngineDriver) {
    const dumper = driver.createDumper();
    this.dumpSql(dumper);
    return dumper.s;
  }

  dumpSql(dumper: SqlDumper) {}
}

export default Command;
