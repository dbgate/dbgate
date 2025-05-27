   const driver = require('./driver');
   
   module.exports = {
     packageName: 'dbgate-plugin-db2',
     // Export as an array for consistency with other plugins
     drivers: [driver],
     initialize(dbgateEnv) {
       // Initialize the driver with dbgateEnv
       driver.initialize && driver.initialize(dbgateEnv);
       
       // Log initialization for debugging
       console.log("[DB2] Plugin initialized");
     },
   };