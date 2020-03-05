import { SqlDumper } from "@dbgate/types";
import { Expression, ColumnRefExpression } from "./types";
import { dumpSqlSourceRef } from "./dumpSqlSource";

function dumpSqlColumnRef(dumper: SqlDumper, expr: ColumnRefExpression) {
  if (expr.source) {
    if (dumpSqlSourceRef(dumper, expr.source)) {
      dumper.put(".");
    }
  }
  dumper.put("%i", expr.columnName);
}

export function dumpSqlExpression(dumper: SqlDumper, expr: Expression) {
  switch (expr.exprType) {
    case "column":
      dumpSqlColumnRef(dumper, expr as ColumnRefExpression);
      break;
  }
}
