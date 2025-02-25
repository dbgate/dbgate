const { defineConfig } = require('cypress');
const killPort = require('kill-port');
const waitOn = require('wait-on');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    // trashAssetsBeforeRuns: false,

    setupNodeEvents(on, config) {
      // implement node event listeners here

      on('before:spec', async details => {
        // console.log('********************* DETAILS *********************', JSON.stringify(details));

        if (config.isInteractive) {
          try {
            await killPort(3000);
          } catch (e) {
            console.warn('Error killing process on port 3000:', e.message);
          }
          switch (details.fileName) {
            case 'add-connection':
              serverProcess = exec('yarn start:add-connection');
              break;
            case 'portal':
              serverProcess = exec('yarn start:portal');
              break;
            case 'oauth':
              serverProcess = exec('yarn start:oauth');
              break;
            case 'browse-data':
              serverProcess = exec('yarn start:browse-data');
              break;
            case 'team':
              serverProcess = exec('yarn start:team');
              break;
            case 'multi-sql':
              serverProcess = exec('yarn start:multi-sql');
              break;
          }

          await waitOn({ resources: ['http://localhost:3000'] });
          serverProcess.stdout.on('data', data => {
            console.log(data.toString());
          });
          serverProcess.stderr.on('data', data => {
            console.error(data.toString());
          });
        }
      });

      on('after:screenshot', details => {
        if (details.name) {
          fs.renameSync(details.path, path.resolve(__dirname, `screenshots/${details.name}.png`));
        }
      });
      // on('task', {
      //   renameFile({ from, to }) {
      //     fs.renameSync(from, to);
      //   },
      // });
    },
  },
});
