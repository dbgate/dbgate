// @ts-check

function runStreamItem(dbhan, sql, options, rowCounter, engine) {
  const stmt = dbhan.client.prepare(sql);
  console.log(stmt);
  console.log(stmt.reader);
  if (stmt.reader) {
    const columns = stmt.columns();
    // const rows = stmt.all();

    options.recordset(
      columns.map((col) => ({
        columnName: col.name,
        dataType: col.type,
      })),
      { engine }
    );

    for (const row of stmt.iterate()) {
      options.row(modifyRow(row, columns));
    }
  } else {
    const info = stmt.run();
    rowCounter.count += info.changes;
    if (!rowCounter.date) rowCounter.date = new Date().getTime();
    if (new Date().getTime() - rowCounter.date > 1000) {
      options.info({
        message: `${rowCounter.count} rows affected`,
        time: new Date(),
        severity: 'info',
        rowsAffected: rowCounter.count,
      });
      rowCounter.count = 0;
      rowCounter.date = null;
    }
  }
}

async function waitForDrain(stream) {
  return new Promise((resolve) => {
    stream.once('drain', () => {
      // console.log('CONTINUE DRAIN');
      resolve();
    });
  });
}

function modifyRow(row, columns) {
  columns.forEach((col) => {
    if (row[col.name] instanceof Uint8Array || row[col.name] instanceof ArrayBuffer) {
      row[col.name] = { $binary: { base64: Buffer.from(row[col.name]).toString('base64') } };
    }
  });
  return row;
}

module.exports = {
  runStreamItem,
  waitForDrain,
  modifyRow,
};
