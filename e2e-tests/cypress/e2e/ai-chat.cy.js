Cypress.on('uncaught:exception', err => {
  if (err.message.includes("Failed to execute 'importScripts' on 'WorkerGlobalScope'")) {
    return false;
  }
});

beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

function openMysqlDatabaseChat() {
  cy.contains('MySql-connection').click();
  cy.contains('MyChinook').click();
  cy.testid('TabsPanel_buttonNewObject').click();
  cy.testid('NewObjectModal_databaseChat').click();
  cy.testid('DatabaseChatTab_promptInput').should('be.visible');
}

function selectCodexProvider() {
  cy.testid('AiChatControl_provider').click();
  cy.testid('DropDownMenu-container-0').contains('OpenAI Codex').click();
  cy.testid('AiChatControl_provider').should('contain', 'OpenAI Codex');
  cy.testid('AiChatControl_model').should('contain', 'GPT-5.6 Sol');
}

describe('Database Chat (MySQL)', () => {
  it('Database chat - chart of popular genres', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_databaseChat').click();
    cy.wait(1000);
    cy.get('body').realType('show me chart of most popular genres');
    cy.get('body').realPress('Enter');
    cy.testid('DatabaseChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.testid('chart-canvas', { timeout: 30000 }).should($c =>
      expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/)
    );
    cy.themeshot('database-chat-chart');
  });

  it('Database chat - find most popular artist', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_databaseChat').click();
    cy.wait(1000);
    cy.get('body').realType('find most popular artist');
    cy.get('body').realPress('Enter');
    cy.testid('DatabaseChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.contains('Iron Maiden', { timeout: 30000 });
    cy.themeshot('database-chat-popular-artist');
  });
});

describe('Database Chat with Codex OAuth (MySQL)', () => {
  it('streams a Codex response through the API process', () => {
    openMysqlDatabaseChat();
    selectCodexProvider();

    cy.testid('DatabaseChatTab_promptInput').type('codex streaming response{enter}');
    cy.contains('Codex mock streamed response.', { timeout: 30000 }).should('be.visible');
  });

  it('completes a Codex tool round trip', () => {
    openMysqlDatabaseChat();
    selectCodexProvider();

    cy.testid('DatabaseChatTab_promptInput').type('codex tool round trip{enter}');
    cy.contains('Getting table schema', { timeout: 30000 }).should('be.visible');
    cy.contains('Artist').should('be.visible');
    cy.contains('Codex completed the tool round trip after inspecting the Artist table.', { timeout: 30000 }).should(
      'be.visible'
    );
  });
});

describe('GraphQL Chat', () => {
  it('GraphQL chat - list users', () => {
    cy.contains('REST GraphQL').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_graphqlChat').click();
    cy.wait(1000);
    cy.get('body').realType('list all users');
    cy.get('body').realPress('Enter');
    cy.testid('GraphQlChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.contains('users', { timeout: 30000 });
    cy.themeshot('graphql-chat-list-users');
  });

  it('GraphQL chat - product categories chart', () => {
    cy.contains('REST GraphQL').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_graphqlChat').click();
    cy.wait(1000);
    cy.get('body').realType('show me a chart of product categories');
    cy.get('body').realPress('Enter');
    cy.testid('GraphQlChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.testid('chart-canvas', { timeout: 30000 }).should($c =>
      expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/)
    );
    cy.themeshot('graphql-chat-categories-chart');
  });

  it('GraphQL chat - find most expensive product', () => {
    cy.contains('REST GraphQL').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_graphqlChat').click();
    cy.wait(1000);
    cy.get('body').realType('find the most expensive product');
    cy.get('body').realPress('Enter');
    cy.testid('GraphQlChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.contains('products', { timeout: 30000 });
    cy.themeshot('graphql-chat-expensive-product');
  });

  it('GraphQL chat - show all categories', () => {
    cy.contains('REST GraphQL').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_graphqlChat').click();
    cy.wait(1000);
    cy.get('body').realType('show all categories');
    cy.get('body').realPress('Enter');
    cy.testid('GraphQlChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.contains('categories', { timeout: 30000 });
    cy.themeshot('graphql-chat-all-categories');
  });

  it('Explain query error', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_query').click();
    cy.wait(1000);
    cy.get('body').realType('select * from Invoice2');
    cy.contains('Execute').click();
    cy.testid('MessageViewRow-explainErrorButton-1').click();
    cy.testid('ChatCodeRenderer_useSqlButton', { timeout: 30000 });
    cy.themeshot('explain-query-error');
  });
});

describe('Codex OAuth status', () => {
  it('shows the preconnected Codex status and disconnects without launching OAuth', () => {
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains(/^AI$/).click();

    cy.testid('CodexAuthCard_status').should('contain', 'Connected');
    cy.testid('CodexAuthCard_disconnect').click();
    cy.testid('CodexAuthCard_status').should('contain', 'Not connected');
    cy.testid('CodexAuthCard_connect').should('be.visible');
  });
});
