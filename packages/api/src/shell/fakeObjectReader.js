const stream = require('stream');

async function fakeObjectReader({ delay = 0 } = {}) {
  const pass = new stream.PassThrough({
    objectMode: true,
  });
  function doWrite() {
    pass.write({ id: 1, country: 'Czechia' });
    pass.write({ id: 2, country: 'Austria' });
    pass.write({ id: 3, country: 'Germany' });
    pass.write({ id: 4, country: 'Romania' });
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
