class Command {
  /** @param driver {import('dbgate').EngineDriver}  */
  toSql(driver) {
    const dumper = driver.createDumper();
    this.dumpSql(dumper);
    return dumper.s;
  }

  /** @param dumper {import('dbgate').SqlDumper}  */
  dumpSql(dumper) {}
}

module.exports = Command;
