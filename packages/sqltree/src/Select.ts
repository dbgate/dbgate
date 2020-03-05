import { Command } from "./Command";
import { NamedObjectInfo, RangeDefinition, SqlDumper } from "@dbgate/types";

export class Select extends Command {
  topRecords: number;
  from: NamedObjectInfo;
  range: RangeDefinition;
  distinct = false;
  selectAll = false;

  dumpSql(dumper: SqlDumper) {
    dumper.put("^select ");
    if (this.topRecords) {
      dumper.put("^top %s ", this.topRecords);
    }
    if (this.distinct) {
      dumper.put("^distinct ");
    }
    if (this.selectAll) {
      dumper.put("* ");
    } else {
      // TODO
    }
    dumper.put("^from %f ", this.from);
    if (this.range) {
      dumper.put("^limit %s ^offset %s ", this.range.limit, this.range.offset);
    }
  }
}
