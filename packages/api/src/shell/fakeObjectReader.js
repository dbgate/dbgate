const stream = require('stream');

async function fakeObjectReader({ delay = 0 } = {}) {
  const pass = new stream.PassThrough({
    objectMode: true,
  });
  function doWrite() {
    pass.write({ id: 1, country: 'Czechia' });
    pass.write({ id: 2, country: 'Austria' });
    pass.write({ country: 'Germany', id: 3 });
    pass.write({ country: 'Romania', id: 4 });
    pass.write({ country: 'Great Britain', id: 5 });
    pass.write({ country: 'Bosna, Hecegovina', id: 6 });
    pass.end();
  }

  if (delay) {
    setTimeout(doWrite, delay);
  } else {
    doWrite();
  }

  return pass;
}

module.exports = fakeObjectReader;
