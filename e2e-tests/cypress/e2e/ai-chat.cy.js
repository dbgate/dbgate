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
  cy.testid('AiChatControl_provider').should('not.have.class', 'disabled').click();
  cy.testid('DropDownMenu-container-0').contains('OpenAI Codex').click();
  cy.testid('AiChatControl_provider').should('contain', 'OpenAI Codex');
  cy.testid('AiChatControl_model').should('contain', 'GPT-5.6 Sol');
}

function openMssqlServerChat() {
  cy.contains('Mssql-connection').click();
  cy.contains('AiCustomerNorth', { timeout: 30000 }).should('be.visible');
  cy.contains('Mssql-connection').rightclick();
  cy.testid('ConnectionAppObject_serverChat').click();
  cy.testid('ServerChatTab_promptInput').should('be.visible');
}

function expectToolSequence(expectedStatuses) {
  cy.get('.function-call-message')
    .should('have.length', expectedStatuses.length)
    .then(messages => {
      const texts = [...messages].map(message => message.textContent.replace(/\s+/g, ' ').trim());
      expectedStatuses.forEach((status, index) => expect(texts[index]).to.contain(status));
    });
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

  it('reviews a write with bounded mixed-role conversation context', () => {
    cy.intercept('POST', '**/openrouter/v1/chat/completions').as('aiCompletion');
    cy.intercept('POST', '**/database-connections/query-data').as('databaseQuery');

    openMysqlDatabaseChat();
    cy.contains('Ask before execute SQL').click();
    cy.testid('DropDownMenu-container-0').contains('AI review before execution').click();
    cy.contains('AI review before execution').should('be.visible');

    cy.testid('DatabaseChatTab_promptInput').type('review context no-op update{enter}');
    cy.contains('The narrowly scoped Artist update is complete.', { timeout: 30000 }).should('be.visible');

    cy.get('@aiCompletion.all').then(completions => {
      const reviewCompletions = completions.filter(completion =>
        completion.request.body.tools?.some(tool => tool.function?.name === 'review_execution')
      );
      expect(reviewCompletions).to.have.length(2);

      const updateReview = reviewCompletions[reviewCompletions.length - 1];
      const reviewUserMessage = [...updateReview.request.body.messages]
        .reverse()
        .find(message => message.role === 'user');
      const reviewRequest = JSON.parse(reviewUserMessage.content);

      expect(reviewRequest.conversationContext).to.have.length(5);
      expect(reviewRequest.conversationContext).to.deep.include({
        role: 'user',
        content: 'review context no-op update',
      });
      expect(
        reviewRequest.conversationContext.some(
          entry => entry.role === 'tool' && entry.content.includes('"table_name":"Artist"')
        )
      ).to.equal(false);

      const selectContext = reviewRequest.conversationContext.find(
        entry =>
          entry.role === 'tool' &&
          entry.functionName === 'execute_sql' &&
          entry.content.includes('SELECT ArtistId, Name FROM Artist WHERE ArtistId = 1')
      );
      expect(selectContext).to.exist;
      const selectEvidence = JSON.parse(selectContext.content);
      expect(selectEvidence.arguments.sql).to.equal('SELECT ArtistId, Name FROM Artist WHERE ArtistId = 1');
      expect(selectEvidence.result).to.be.an('array').and.have.length(1);
      expect(selectEvidence.result[0]).to.include({ ArtistId: 1 });
      expect(selectEvidence.result[0].Name).to.be.a('string');

      expect(reviewRequest.proposedAction).to.deep.equal({
        functionName: 'execute_sql',
        arguments: {
          sql: 'UPDATE Artist SET Name = Name WHERE ArtistId = 1',
        },
      });
    });

    cy.get('@databaseQuery.all')
      .should('have.length', 2)
      .then(queries => {
        expect(queries[1].request.body.sql).to.equal('UPDATE Artist SET Name = Name WHERE ArtistId = 1');
      });
    cy.testid('DatabaseChatTab_executeThisQuery').should('not.exist');
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

describe('Server Chat (MSSQL)', () => {
  it('discovers metadata and executes exactly one cross-database T-SQL batch', () => {
    cy.intercept('POST', '**/openrouter/v1/chat/completions').as('aiCompletion');
    cy.intercept('POST', '**/server-connections/chat-databases').as('chatDatabases');
    cy.intercept('POST', '**/server-connections/database-structure').as('databaseStructure');
    cy.intercept('POST', '**/server-connections/query-database-data').as('databaseQuery');
    cy.intercept('POST', '**/server-connections/query-data').as('serverQuery');

    openMssqlServerChat();
    cy.testid('ServerChatTab_serverWarning').should('contain', 'allowedDatabases');

    cy.testid('ServerChatTab_promptInput').type('give me the top customers with the most orders today{enter}');
    cy.wait('@chatDatabases').its('request.body.filter').should('equal', 'AiCustomer');
    cy.wait('@databaseStructure').its('request.body.database').should('equal', 'AiCustomerNorth');
    cy.testid('ServerChatTab_serverSqlConfirmation')
      .should('contain', 'Mssql-connection')
      .and('contain', 'every database');
    cy.get('@aiCompletion.all')
      .should('have.length', 4)
      .then(completions => {
        const schemaToolMessage = [...completions[3].request.body.messages]
          .reverse()
          .find(message => message.role === 'tool');
        expect(schemaToolMessage).to.exist;
        const schema = JSON.parse(schemaToolMessage.content);
        expect(schema.truncated).to.equal(false);
        expect(schema.foreignKeys).to.deep.equal([
          {
            refSchemaName: 'dbo',
            refTable: 'OrderGroups',
            columns: [
              { column: 'TenantId', refColumn: 'TenantId' },
              { column: 'OrderGroupId', refColumn: 'OrderGroupId' },
            ],
          },
        ]);
      });
    cy.testid('ServerChatTab_executeThisQuery')
      .closest('.execute-sql-prompt')
      .should('not.contain.text', 'Execute all');
    cy.testid('ServerChatTab_executeThisQuery', { timeout: 30000 }).click();

    cy.wait('@serverQuery').then(({ request, response }) => {
      expect(request.body.sql).to.contain('sys.databases');
      expect(request.body.sql).to.contain('STRING_AGG');
      expect(request.body.sql).to.contain('sp_executesql');
      expect(response.body.rows).to.deep.equal([
        { customer_database: 'AiCustomerNorth', order_count: 7 },
        { customer_database: 'AiCustomerWest', order_count: 5 },
        { customer_database: 'AiCustomerSouth', order_count: 3 },
      ]);
    });

    cy.contains('AiCustomerNorth has the most orders today with 7', { timeout: 30000 }).should('be.visible');
    expectToolSequence(['Getting databases', 'Getting tables', 'Getting table schema', 'Executing server SQL']);
    cy.get('@serverQuery.all').should('have.length', 1);
    cy.get('@databaseQuery.all').should('have.length', 0);
  });

  it('confirms and opens a database-scoped SQL query in the selected database', () => {
    cy.intercept('POST', '**/server-connections/chat-databases').as('chatDatabases');
    cy.intercept('POST', '**/server-connections/database-structure').as('databaseStructure');
    cy.intercept('POST', '**/server-connections/query-database-data').as('databaseQuery');
    cy.intercept('POST', '**/server-connections/query-data').as('serverQuery');

    openMssqlServerChat();
    cy.testid('ServerChatTab_promptInput').type('how many orders are in AiCustomerNorth today{enter}');
    cy.wait('@chatDatabases').its('request.body.filter').should('equal', 'AiCustomerNorth');
    cy.wait('@databaseStructure').its('request.body.database').should('equal', 'AiCustomerNorth');

    cy.testid('ServerChatTab_databaseSqlConfirmation')
      .should('contain', 'Mssql-connection')
      .and('contain', 'AiCustomerNorth')
      .and('contain', 'default database')
      .and('contain', 'other databases')
      .and('contain', 'available to this connection');
    cy.testid('ServerChatTab_executeThisQuery')
      .closest('.execute-sql-prompt')
      .should('not.contain.text', 'Execute all');
    cy.testid('ServerChatTab_executeThisQuery', { timeout: 30000 }).click();

    cy.wait('@databaseQuery').then(({ request, response }) => {
      expect(request.body.database).to.equal('AiCustomerNorth');
      expect(request.body.sql).to.contain('COUNT(*)');
      expect(response.body.rows).to.deep.equal([{ order_count: 7 }]);
    });

    cy.contains('AiCustomerNorth has 7 orders today', { timeout: 30000 }).should('be.visible');
    expectToolSequence(['Getting databases', 'Getting tables', 'Getting table schema', 'Executing database SQL']);
    cy.get('@databaseQuery.all').should('have.length', 1);
    cy.get('@serverQuery.all').should('have.length', 0);

    cy.testid('ServerChatTab_openSqlQuery').click();
    cy.contains('.db-name-inner', 'AiCustomerNorth').should('be.visible');
    cy.testid('QueryTab_executeButton').should('be.visible');
    cy.get('.ace_text-layer', { timeout: 30000 }).should('contain.text', 'COUNT');
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
