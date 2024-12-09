const { defineConfig } = require('cypress');
const { clearDataWithBackup } = require('./e2eTestTools');
const { exec } = require('child_process');
const waitOn = require('wait-on');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      let serverProcess;

      on('before:spec', async details => {
        console.log('******** BEFORE RUN ****************');
        clearDataWithBackup();

        serverProcess = exec('yarn start');
        await waitOn({ resources: ['http://localhost:3000'] });
        serverProcess.stdout.on('data', data => {
          console.log(data.toString());
        });
        serverProcess.stderr.on('data', data => {
          console.error(data.toString());
        });
      });

      on('after:spec', () => {
        console.log('******** AFTER RUN ****************', serverProcess);
        if (serverProcess) {
          console.log('Stopping local server...');
          serverProcess.kill();
        }
      });
    },
  },
});
