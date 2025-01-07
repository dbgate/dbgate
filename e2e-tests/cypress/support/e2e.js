// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

import 'cypress-real-events';

beforeEach(() => {
  // Replace 'my-database-name' with the actual IndexedDB name
  cy.window().then(win => {
    return new Promise((resolve, reject) => {
      const request = win.indexedDB.deleteDatabase('localforage');
      request.onsuccess = () => {
        // Database successfully deleted
        resolve();
      };
      request.onerror = () => {
        // Some error occurred
        reject(request.error);
      };
      request.onblocked = () => {
        // Might happen if there are open connections
        console.warn('IndexedDB deletion blocked');
        resolve();
      };
    });
  });
});
