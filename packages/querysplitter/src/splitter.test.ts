import { mysqlSplitterOptions, mssqlSplitterOptions } from './options';
import { splitQuery } from './splitQuery';

test('simple query', () => {
  const output = splitQuery('select * from A');
  expect(output).toEqual(['select * from A']);
});

test('correct split 2 queries', () => {
  const output = splitQuery('SELECT * FROM `table1`;SELECT * FROM `table2`;', mysqlSplitterOptions);
  expect(output).toEqual(['SELECT * FROM `table1`', 'SELECT * FROM `table2`']);
});

test('correct split 2 queries - no end semicolon', () => {
  const output = splitQuery('SELECT * FROM `table1`;SELECT * FROM `table2`', mysqlSplitterOptions);
  expect(output).toEqual(['SELECT * FROM `table1`', 'SELECT * FROM `table2`']);
});

test('delete empty query', () => {
  const output = splitQuery(';;;\n;;SELECT * FROM `table1`;;;;;SELECT * FROM `table2`;;; ;;;', mysqlSplitterOptions);
  expect(output).toEqual(['SELECT * FROM `table1`', 'SELECT * FROM `table2`']);
});

test('should handle double backtick', () => {
  const input = ['CREATE TABLE `a``b` (`c"d` INT)', 'CREATE TABLE `a````b` (`c"d` INT)'];
  const output = splitQuery(input.join(';\n') + ';', mysqlSplitterOptions);
  expect(output).toEqual(input);
});

test('semicolon inside string', () => {
  const input = ['CREATE TABLE a', "INSERT INTO a (x) VALUES ('1;2;3;4')"];
  const output = splitQuery(input.join(';\n') + ';', mysqlSplitterOptions);
  expect(output).toEqual(input);
});

test('semicolon inside identyifier - mssql', () => {
  const input = ['CREATE TABLE [a;1]', "INSERT INTO [a;1] (x) VALUES ('1')"];
  const output = splitQuery(input.join(';\n') + ';', {
    ...mssqlSplitterOptions,
    allowSemicolon: true,
  });
  expect(output).toEqual(input);
});
