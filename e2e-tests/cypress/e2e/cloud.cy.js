Cypress.on('uncaught:exception', (err, runnable) => {
  // if the error message matches the one about WorkerGlobalScope importScripts
  if (err.message.includes("Failed to execute 'importScripts' on 'WorkerGlobalScope'")) {
    // return false to let Cypress know we intentionally want to ignore this error
    return false;
  }
  // otherwise let Cypress throw the error
});

beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

describe('Cloud tests', () => {
  it('Private cloud', () => {
    cy.testid('WidgetIconPanel_cloudAccount').click();

    cy.origin('https://identity.dbgate.io', () => {
      cy.contains('Sign in with GitHub').click();
    });

    cy.origin('https://github.com', () => {
      cy.get('#login_field').type('dbgatetest');
      cy.get('#password').type('Pwd2020Db');
      cy.get('input[type="submit"]').click();
    });

    cy.wait(3000);

    cy.location('origin').then(origin => {
      if (origin === 'https://github.com') {
        // Still on github.com → an authorization step is waiting
        cy.origin('https://github.com', () => {
          // Try once, don't wait the full default timeout
          cy.get('button[data-octo-click="oauth_application_authorization"]', { timeout: 500, log: false }).click(); // if the button exists it will be clicked
          // if not, the short timeout elapses and we drop out
        });
      } else {
        // Already back on localhost – nothing to authorize
        cy.log('OAuth redirect skipped the Authorize screen');
      }
    });

    cy.themeshot('private-cloud-login');

    cy.contains('Testing Connections').rightclick();
    cy.contains('Administrate access').click();
    cy.contains('User email');
    cy.themeshot('administer-shared-folder');
  });
});
