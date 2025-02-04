beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

describe('Team edition tests', () => {
  it('Team edition screens', () => {
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

  it.only('OAuth authentication', () => {
    cy.testid('LoginPage_linkAdmin').click();
    cy.testid('LoginPage_password').type('adminpwd');
    cy.testid('LoginPage_submitLogin').click();
    cy.testid('AdminMenuWidget_itemAuthentication').click();
    // cy.testid('AdminAuthForm_disableButton_local').click();
    // cy.testid('AdminAuthForm_disableButton_none').click();
    cy.contains('Add authentication').click();
    cy.contains('OAuth 2.0').click();
    cy.testid('AdminAuthForm_oauthAuth_oauth').type('http://localhost:16009/dex/auth');
    cy.testid('AdminAuthForm_oauthToken_oauth').type('http://localhost:16009/dex/token');
    cy.testid('AdminAuthForm_oauthScope_oauth').type('openid');
    cy.testid('AdminAuthForm_oauthClient_oauth').type('my-app');
    cy.testid('AdminAuthForm_oauthClientSecret_oauth').type('my-secret');
    cy.testid('AdminAuthForm_oauthLoginField_oauth').type('username');
    cy.contains('Save').click();
    cy.testid('WidgetIconPanel_menu').click();
    cy.contains('File').click();
    cy.contains('Logout').click();
    cy.testid('LoginPage_linkRegularUser').click();
    cy.testid('LoginPage_loginButton_OAuth 2.0').click();

    // login on DEX
    cy.get('#login').clear().type('test@example.com');
    cy.get('#password').clear().type('test');
    cy.get('#submit-login').click();
    // test - user is logged in
    cy.get('Database not selected');
  });
});
