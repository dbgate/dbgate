describe('Initialization', () => {
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

  // it('SSH connection', () => {
  //   const runOnCI = Cypress.env('runOnCI');

  //   cy.get('body')
  //     .trigger('keydown', {
  //       key: 'F1',
  //       code: 'F1',
  //       which: 112,
  //       keyCode: 112,
  //       bubbles: true,
  //     })
  //     .trigger('keyup', {
  //       key: 'F1',
  //       code: 'F1',
  //       which: 112,
  //       keyCode: 112,
  //       bubbles: true,
  //     });
  //   cy.get('body').type('Close all');
  //   cy.get('body').type('{enter}');

  //   cy.visit('http://localhost:3000');
  //   cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
  //   cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
  //   cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
  //   cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('root');

  //   cy.get('[data-testid=ConnectionSshTunnelFields_sshLogin]').clear().type('root');
  //   cy.get('[data-testid=ConnectionSshTunnelFields_sshPassword]').clear().type('root');
  //   if (runOnCI) {
  //     cy.get('[data-testid=ConnectionSshTunnelFields_sshHost]').clear().type('mysql-ssh');
  //   } else {
  //     cy.get('[data-testid=ConnectionSshTunnelFields_sshPort]').clear().type('16006');
  //   }
  //   cy.get('[data-testid=ConnectionDriverFields_displayName]').clear().type('test-mysql-ssh-1');
  //   cy.get('[data-testid=ConnectionTab_buttonSave]').click();
  //   cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
  //   cy.contains('performance_schema');
  // });

  // it('import chinook DB', () => {
  //   cy.visit('http://localhost:3000');
  //   cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
  // });
});
