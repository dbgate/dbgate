import { Source } from "./types";
import { SqlDumper } from "@dbgate/types";
import { dumpSqlSelect } from "./dumpSqlCommand";

export function dumpSqlSourceDef(dmp: SqlDumper, source: Source) {
  let sources = 0;
  if (source.name != null) sources++;
  if (source.subQuery != null) sources++;
  if (source.subQueryString != null) sources++;
  if (sources != 1)
    throw new Error("sqltree.Source should have exactly one source");

  if (source.name != null) {
    dmp.put("%f", source.name);
  }
  if (source.subQuery) {
    dmp.put("(");
    dumpSqlSelect(dmp, source.subQuery);
    dmp.put(")");
  }
  if (source.subQueryString) {
    dmp.put("(");
    dmp.putRaw(source.subQueryString);
    dmp.put(")");
  }
  if (source.alias) {
    dmp.put(" %i", this.alias);
  }
}

export function dumpSqlSourceRef(dmp: SqlDumper, source: Source) {
  if (source.alias) {
    dmp.put("%i", source.alias);
    return true;
  } else if (source.name) {
    dmp.put("%f", source.name);
    return true;
  }
  return false;
}
