import { mysqlSplitterOptions, mssqlSplitterOptions, postgreSplitterOptions } from './options';
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

test('delimiter test', () => {
  const input = 'SELECT 1;\n DELIMITER $$\n SELECT 2; SELECT 3; \n DELIMITER ;';
  const output = splitQuery(input, mysqlSplitterOptions);
  expect(output).toEqual(['SELECT 1', 'SELECT 2; SELECT 3;']);
});

test('one line comment test', () => {
  const input = 'SELECT 1 -- comment1;comment2\n;SELECT 2';
  const output = splitQuery(input, mysqlSplitterOptions);
  expect(output).toEqual(['SELECT 1 -- comment1;comment2', 'SELECT 2']);
});

test('multi line comment test', () => {
  const input = 'SELECT 1 /* comment1;comment2\ncomment3*/;SELECT 2';
  const output = splitQuery(input, mysqlSplitterOptions);
  expect(output).toEqual(['SELECT 1 /* comment1;comment2\ncomment3*/', 'SELECT 2']);
});

test('dollar string', () => {
  const input = 'CREATE PROC $$ SELECT 1; SELECT 2; $$ ; SELECT 3';
  const output = splitQuery(input, postgreSplitterOptions);
  expect(output).toEqual(['CREATE PROC $$ SELECT 1; SELECT 2; $$', 'SELECT 3']);
});
