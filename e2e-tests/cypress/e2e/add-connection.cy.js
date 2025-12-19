const path = require('path');

beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1200, 900);
});

describe('Add connection', () => {
  it('successfully loads', () => {
    cy.contains('Database not selected');
  });

  it('adds connection', () => {
    // cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.themeshot('new-connection');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('Pwd2020Db');
    cy.get('[data-testid=ConnectionDriverFields_port]').clear().type('16004');
    cy.get('[data-testid=ConnectionDriverFields_displayName]').clear().type('test-mysql-1');

    // test connection
    cy.testid('ConnectionTab_buttonTest').click();
    cy.contains('Connected:');

    cy.testid('ConnectionTab_tabSshTunnel').click();
    cy.testid('ConnectionTab_tabControlContent').themeshot('connection-sshtunnel-window', { padding: 50 });

    cy.testid('ConnectionTab_tabSsl').click();
    cy.testid('ConnectionTab_tabControlContent').themeshot('connection-ssl-window', { padding: 50 });

    // save and connect
    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
    cy.contains('performance_schema');
  });

  it('SSH connection - user + password', () => {
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
    cy.get('[data-testid=ConnectionSshTunnelFields_sshPort]').clear().type('16012');
    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
    cy.contains('performance_schema');
  });

  it('SSH connection - keyfile', () => {
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
    cy.get('[data-testid=ConnectionSshTunnelFields_sshLogin]').clear();
    cy.get('[data-testid=ConnectionSshTunnelFields_sshLogin]').type('root');
    cy.get('[data-testid=ConnectionSshTunnelFields_sshKeyfile]')
      .clear()
      .type(path.join(Cypress.config('fileServerFolder'), 'cypress', 'e2e', 'mykey'));
    cy.get('[data-testid=ConnectionSshTunnelFields_sshPort]').clear().type('16008');
    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
    cy.contains('performance_schema');
  });

  it('ask password - mysql', () => {
    cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('Pwd2020Db');
    cy.get('[data-testid=ConnectionDriverFields_port]').clear().type('16004');
    cy.get('[data-testid=ConnectionDriverFields_displayName]').clear().type('test-mysql-2');
    cy.testid('ConnectionDriverFields_passwordMode').select('askPassword');

    // test connection
    cy.get('[data-testid=ConnectionTab_buttonTest]').click();
    cy.testid('DatabaseLoginModal_password').clear().type('Pwd2020Db');
    cy.testid('DatabaseLoginModal_connect').click();

    cy.contains('Connected:');

    cy.get('[data-testid=ConnectionTab_buttonSave]').click();
    cy.get('[data-testid=ConnectionTab_buttonConnect]').click();

    // again type DB password - not saved
    cy.testid('DatabaseLoginModal_password').clear().type('Pwd2020Db');
    cy.testid('DatabaseLoginModal_connect').click();

    cy.contains('performance_schema');
  });

  it('Plugin tab', () => {
    cy.testid('WidgetIconPanel_menu').click();
    cy.contains('Tools').click();
    cy.contains('Manage plugins').click();
    cy.contains('dbgate-plugin-theme-total-white').click();
    // text from plugin markdown
    cy.contains('Total white theme');
    // wait for load logos
    cy.wait(2000);
    cy.themeshot('view-plugin-tab');
  });

  it('export connections', () => {
    cy.testid('WidgetIconPanel_menu').click();
    cy.contains('Tools').click();
    cy.contains('Export connections').click();
    cy.themeshot('export-connections');
  });

  it('configure LLM provider', () => {
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('Settings').click();
    cy.contains('AI').click();
    cy.testid('AiSupportedProvidersInfo_add_OpenRouter').click();
    cy.testid('AiProviderCard_apikey_OpenRouter').clear().type('xxx');
    cy.testid('AiProviderCard_testButton_OpenRouter').click();
    cy.testid('AiProviderCard_statusValid_OpenRouter').should('exist');
    cy.testid('AiProviderCard_editButton_OpenRouter').click();
    cy.wait(1000);
    cy.themeshot('llm-providers-settings');
  });
});
