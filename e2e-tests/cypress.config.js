const { defineConfig } = require('cypress');
const { clearDataWithBackup } = require('./e2eTestTools');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here

      on('before:spec', async details => {
        clearDataWithBackup();
        // await axios.default.post('http://localhost:3000/connections/reload-connection-list', {});
      });
    },
  },
});
