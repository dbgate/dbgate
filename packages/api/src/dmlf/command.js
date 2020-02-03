class Command {
  /** @param driver {import('@dbgate/types').EngineDriver}  */
  toSql(driver) {
    const dumper = driver.createDumper();
    this.dumpSql(dumper);
    return dumper.s;
  }

  /** @param dumper {import('@dbgate/types').SqlDumper}  */
  dumpSql(dumper) {}
}

module.exports = Command;
