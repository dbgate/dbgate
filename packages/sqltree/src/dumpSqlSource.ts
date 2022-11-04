import { Source, FromDefinition, Relation } from './types';
import type { SqlDumper } from 'dbgate-types';
import { dumpSqlSelect } from './dumpSqlCommand';
import { dumpSqlCondition } from './dumpSqlCondition';

export function dumpSqlSourceDef(dmp: SqlDumper, source: Source) {
  let sources = 0;
  if (source.name != null) sources++;
  if (source.subQuery != null) sources++;
  if (source.subQueryString != null) sources++;
  if (sources != 1) throw new Error('sqltree.Source should have exactly one source');

  if (source.name != null) {
    dmp.put('%f', source.name);
  }
  if (source.subQuery) {
    dmp.put('(');
    dumpSqlSelect(dmp, source.subQuery);
    dmp.put(')');
  }
  if (source.subQueryString) {
    dmp.put('(');
    dmp.putRaw(source.subQueryString);
    dmp.put(')');
  }
  if (source.alias) {
    dmp.put(' %i', source.alias);
  }
}

export function dumpSqlSourceRef(dmp: SqlDumper, source: Source) {
  if (source.alias) {
    dmp.put('%i', source.alias);
    return true;
  } else if (source.name) {
    dmp.put('%f', source.name);
    return true;
  }
  return false;
}

export function dumpSqlRelation(dmp: SqlDumper, from: Relation) {
  dmp.put('&n %k ', from.joinType);
  dumpSqlSourceDef(dmp, from);
  if (from.conditions && from.conditions.length > 0) {
    dmp.put(' ^on ');
    dmp.putCollection(' ^and ', from.conditions, cond => dumpSqlCondition(dmp, cond));
  }
}

export function dumpSqlFromDefinition(dmp: SqlDumper, from: FromDefinition) {
  dumpSqlSourceDef(dmp, from);
  dmp.put(' ');
  if (from.relations) from.relations.forEach(rel => dumpSqlRelation(dmp, rel));
}
