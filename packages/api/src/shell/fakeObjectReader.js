const stream = require('stream');

async function fakeObjectReader({ delay = 0, dynamicData = null } = {}) {
  const pass = new stream.PassThrough({
    objectMode: true,
  });
  function doWrite() {
    if (dynamicData) {
      pass.write({ __isStreamHeader: true, __isDynamicStructure: true });
      for (const item of dynamicData) {
        pass.write(item);
      }
      pass.end();
    } else {
      pass.write({ columns: [{ columnName: 'id' }, { columnName: 'country' }], __isStreamHeader: true });
      pass.write({ id: 1, country: 'Czechia' });
      pass.write({ id: 2, country: 'Austria' });
      pass.write({ country: 'Germany', id: 3 });
      pass.write({ country: 'Romania', id: 4 });
      pass.write({ country: 'Great Britain', id: 5 });
      pass.write({ country: 'Bosna, Hecegovina', id: 6 });
      pass.end();
    }
  }

  if (delay) {
    setTimeout(doWrite, delay);
  } else {
    doWrite();
  }

  return pass;
}

module.exports = fakeObjectReader;
