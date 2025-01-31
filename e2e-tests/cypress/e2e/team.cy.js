beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

describe('Team edition tests', () => {
  it('Data archive editor - macros', () => {
    cy.testid('LoginPage_linkAdmin').click();
    cy.testid('LoginPage_password').type('adminpwd');
    cy.testid('LoginPage_submitLogin').click();

    cy.testid('AdminMenuWidget_itemConnections').click();
    cy.contains('New connection').click();
    cy.contains('New connection').click();
    cy.contains('New connection').click();
    cy.testid('ConnectionDriverFields_connectionType').select('PostgreSQL');
    cy.themeshot('connadmin');

    cy.testid('AdminMenuWidget_itemRoles').click();
    cy.contains('Permissions').click();
    cy.themeshot('roleadmin');

    cy.testid('AdminMenuWidget_itemAuthentication').click();
    cy.contains('Add authentication').click();
    cy.contains('Use database login').click();
    cy.contains('Add authentication').click();
    cy.contains('OAuth 2.0').click();
    cy.themeshot('authadmin');
  });
});
