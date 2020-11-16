import { parseFilter } from './parseFilter';
import { FilterType } from './types';
import engines from 'dbgate-engines';
import { dumpSqlCondition, treeToSql } from 'dbgate-sqltree';

const ast = parseFilter(process.argv[2], process.argv[3] as FilterType);

console.log(JSON.stringify(ast, null, '  '));

console.log('***************** MS SQL ******************');
console.log(treeToSql(engines('mssql'), ast, dumpSqlCondition));

console.log('***************** MySql *******************');
console.log(treeToSql(engines('mysql'), ast, dumpSqlCondition));

console.log('***************** Postgre *****************');
console.log(treeToSql(engines('postgres'), ast, dumpSqlCondition));
