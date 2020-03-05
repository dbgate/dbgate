import { SqlDumper, NamedObjectInfo } from "@dbgate/types";
import { Select } from "./Select";

export class Source {
  name: NamedObjectInfo;
  alias: string;
  subQuery: Select;
  subQueryString: string;

  dumpSqlDef(dumper: SqlDumper) {
    let sources = 0;
    if (this.name != null) sources++;
    if (this.subQuery != null) sources++;
    if (this.subQueryString != null) sources++;
    if (sources != 1)
      throw new Error("sqltree.Source should have exactly one source");

    if (this.name != null) {
      dumper.put("%f", this.name);
    }
    if (this.subQuery) {
      dumper.put("(");
      this.subQuery.dumpSql(dumper);
      dumper.put(")");
    }
    if (this.subQueryString) {
      dumper.put("(");
      dumper.putRaw(this.subQueryString);
      dumper.put(")");
    }
    if (this.alias) {
      dumper.put(" %i", this.alias);
    }
  }

  dumpSqlRef(dumper: SqlDumper) {
    if (this.alias != null) {
      dumper.put("%i", this.alias);
      return true;
    } else if (this.name != null) {
      dumper.put("%f", this.name);
      return true;
    }
    return false;
  }
}

class Relation {
    source:Source;
    joinType: string;
    // conditions: 


    // dumpSqlRef(dumper: SqlDumper) {
        
    //     dumper.put("&n");
    //     dumper.putRaw(this.joinType);
    //     dumper.put(" ");
    //     this.source.dumpSqlDef(dumper)
    //     if (Conditions.Any())
    //     {
    //         dumper.put(" ^on ");
    //         bool was = false;
    //         foreach (var cond in Conditions)
    //         {
    //             if (was) dumper.put(" ^and ");
    //             cond.GenSql(dmp);
    //             was = true;
    //         }
    //     }
    // }

}

export class FromDefinition {
  source: Source;
  relations: Relation[] = [];
}
