import { SqlDumper } from "@dbgate/types";
import { Command, Select } from "./types";
import { dumpSqlExpression } from "./dumpSqlExpression";
import { dumpSqlFromDefinition } from "./dumpSqlSource";

export function dumpSqlSelect(dmp: SqlDumper, select: Select) {
  dmp.put("^select ");
  if (select.topRecords) {
    dmp.put("^top %s ", select.topRecords);
  }
  if (select.distinct) {
    dmp.put("^distinct ");
  }
  if (select.selectAll) {
    dmp.put("* ");
  }
  if (select.columns) {
    if (select.selectAll) dmp.put("&n,");
    dmp.put("&>&n");
    dmp.putCollection(",&n", select.columns, fld => {
      dumpSqlExpression(dmp, fld.expr);
      if (fld.alias) dmp.put(" %i", fld.alias);
    });
    dmp.put("&n&<");
  }
  dmp.put("^from ");
  dumpSqlFromDefinition(dmp, select.from);
  if (select.range) {
    dmp.put("^limit %s ^offset %s ", select.range.limit, select.range.offset);
  }
}

export function dumpSqlCommand(dmp: SqlDumper, command: Command) {
  switch (command.commandType) {
    case "select":
      dumpSqlSelect(dmp, command);
      break;
  }
}
