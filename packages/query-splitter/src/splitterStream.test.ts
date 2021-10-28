import { mysqlSplitterOptions, mssqlSplitterOptions, postgreSplitterOptions, noSplitSplitterOptions } from './options';
import stream from 'stream';
import { splitQueryStream } from './splitQueryStream';

function createInputStream(...lines) {
  const pass = new stream.PassThrough({
    objectMode: true,
  });
  lines.forEach(line => pass.write(line));
  pass.end();
  return pass;
}

function streamToArray(streamSource) {
  return new Promise((resolve, reject) => {
    const res = [];
    streamSource.on('data', x => res.push(x));
    streamSource.on('end', () => resolve(res));
  });
}

test('stream: simple query', async () => {
  const output = await streamToArray(splitQueryStream(createInputStream('select * from A'), mysqlSplitterOptions));
  expect(output).toEqual(['select * from A']);
});

test('stream: query on 2 lines', async () => {
  const output = await streamToArray(splitQueryStream(createInputStream('select * ', 'from A'), mysqlSplitterOptions));
  expect(output).toEqual(['select * from A']);
});

test('stream: query on 2 lines', async () => {
  const output = await streamToArray(
    splitQueryStream(
      createInputStream('SELECT * ', 'FROM `table1`;', 'SELECT *', ' FROM `table2`'),
      mysqlSplitterOptions
    )
  );
  expect(output).toEqual(['SELECT * FROM `table1`', 'SELECT * FROM `table2`']);
});
