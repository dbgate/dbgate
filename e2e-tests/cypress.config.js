const { defineConfig } = require('cypress');
const killPort = require('kill-port');
const { clearDataWithBackup } = require('./e2eTestTools');
const waitOn = require('wait-on');
const { exec } = require('child_process');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here

      on('before:spec', async details => {
        await clearDataWithBackup();
        
        if (config.isInteractive) {
          await killPort(3000);
          serverProcess = exec('yarn start');
          await waitOn({ resources: ['http://localhost:3000'] });
          serverProcess.stdout.on('data', data => {
            console.log(data.toString());
          });
          serverProcess.stderr.on('data', data => {
            console.error(data.toString());
          });
        }
      });
    },
  },
});
