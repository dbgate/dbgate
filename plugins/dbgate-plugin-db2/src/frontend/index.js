   const driver = require('./driver');
const Dumper = require('./Dumper');

module.exports = {
  packageName: 'dbgate-plugin-db2',
  drivers: [driver],
  dumpers: [
    {
      engine: 'db2@dbgate-plugin-db2',
      dumper: Dumper,
    },
  ],
};