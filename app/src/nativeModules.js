const msnodesqlv8 = () => require('msnodesqlv8');

const win32Modules = {
  msnodesqlv8,
};

module.exports = {
  ...(process.platform == 'win32' ? win32Modules : {}),
};
