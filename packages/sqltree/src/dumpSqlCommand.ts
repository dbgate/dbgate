import { SqlDumper } from "@dbgate/types";
import { Command, Select } from "./types";

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
  } else {
    // TODO
  }
  dmp.put("^from %f ", select.from);
  if (select.range) {
    dmp.put("^limit %s ^offset %s ", select.range.limit, select.range.offset);
  }
}

export function dumpSqlCommand(dmp: SqlDumper, command: Command) {
  switch (command.commandType) {
    case "select":
      dumpSqlSelect(dmp, command as Select);
      break;
  }
}
