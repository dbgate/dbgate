const path = require('path');

describe('Add connection', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:3000');
    cy.contains('Database not selected');
  });

  it('adds connection', () => {
    const runOnCI = Cypress.env('runOnCI');

    cy.visit('http://localhost:3000');
    // cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('Pwd2020Db');
    if (runOnCI) {
      cy.get('[data-testid=ConnectionDriverFields_server]').clear().type('mysql');
    } else {
      cy.get('[data-testid=ConnectionDriverFields_port]').clear().type('16004');
    }
    cy.get('[data-testid=ConnectionDriverFields_displayName]').clear().type('test-mysql-1');
    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
    cy.contains('performance_schema');
  });

  it('SSH connection - user + password', () => {
    const runOnCI = Cypress.env('runOnCI');

    cy.visit('http://localhost:3000');
    cy.contains('Connections');

    // cy.realPress('F1');
    // cy.realType('Close all');
    // cy.realPress('Enter');

    cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('root');

    cy.get('[data-testid=ConnectionDriverFields_displayName]').clear().type('test-mysql-ssh-1');

    cy.get('[data-testid=ConnectionTab_tabSshTunnel]').click();
    cy.get('[data-testid=ConnectionSshTunnelFields_useSshTunnel]').check();
    cy.get('[data-testid=ConnectionSshTunnelFields_sshLogin]').clear().type('root');
    cy.get('[data-testid=ConnectionSshTunnelFields_sshPassword]').clear().type('root');
    if (runOnCI) {
      cy.get('[data-testid=ConnectionSshTunnelFields_sshHost]').clear().type('mysql-ssh-login');
    } else {
      cy.get('[data-testid=ConnectionSshTunnelFields_sshPort]').clear().type('16006');
    }
    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
    cy.contains('performance_schema');
  });

  it('SSH connection - keyfile', () => {
    const runOnCI = Cypress.env('runOnCI');

    cy.visit('http://localhost:3000');
    cy.contains('Connections');

    // cy.realPress('F1');
    // cy.realType('Close all');
    // cy.realPress('Enter');

    cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('root');

    cy.get('[data-testid=ConnectionDriverFields_displayName]').clear().type('test-mysql-ssh-2');

    cy.get('[data-testid=ConnectionTab_tabSshTunnel]').click();
    cy.get('[data-testid=ConnectionSshTunnelFields_useSshTunnel]').check();
    cy.get('[data-testid=ConnectionSshTunnelFields_sshMode]').select('Key file');
    cy.get('[data-testid=ConnectionSshTunnelFields_sshLogin]').clear()
    cy.get('[data-testid=ConnectionSshTunnelFields_sshLogin]').type('root');
    cy.get('[data-testid=ConnectionSshTunnelFields_sshKeyfile]')
      .clear()
      .type(path.join(Cypress.config('fileServerFolder'), 'cypress', 'e2e', 'mykey'));
    if (runOnCI) {
      cy.get('[data-testid=ConnectionSshTunnelFields_sshHost]').clear().type('mysql-ssh-keyfile');
    } else {
      cy.get('[data-testid=ConnectionSshTunnelFields_sshPort]').clear().type('16008');
    }
    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
    cy.contains('performance_schema');
  });

  // it('import chinook DB', () => {
  //   cy.visit('http://localhost:3000');
  //   cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
  // });
});
