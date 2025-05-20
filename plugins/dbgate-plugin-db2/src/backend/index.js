   const driver = require('./driver');
   
   module.exports = {
     packageName: 'dbgate-plugin-db2',
     drivers: [driver],
     initialize(dbgateEnv) {
       driver.initialize && driver.initialize(dbgateEnv);
     },
   };