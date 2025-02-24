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

function multiTest(testName, testDefinition) {
  it(testName + ' MySQL', () => testDefinition('MySql-connection'));
  it(testName + ' Postgres', () => testDefinition('Postgres-connection'));
}

describe('Mutli-sql tests', () => {
  multiTest('Transactions', connectionName => {
    cy.contains(connectionName).click();
    cy.contains('my_guitar_shop').click();
    cy.testid('TabsPanel_buttonNewQuery').click();
    cy.wait(1000);
    cy.get('body').type("INSERT INTO categories (category_id, category_name) VALUES (5, 'test');");
    cy.testid('QueryTab_beginTransactionButton').click();
    cy.contains('Query execution finished');
    cy.testid('QueryTab_executeButton').click();
    cy.contains('Query execution finished');

    cy.testid('SqlObjectList_container').contains('categories').click();
    cy.contains('Guitars').click();
    cy.testid('TableDataTab_refreshGrid').click();
    cy.contains('Rows: 4');

    cy.contains('Query #1').click();
    cy.testid('QueryTab_commitTransactionButton').click();
    cy.contains('Query execution finished');
    cy.testid('SqlObjectList_container').contains('categories').click();
    cy.contains('Guitars').click();
    cy.testid('TableDataTab_refreshGrid').click();
    cy.contains('Rows: 5');
  });
});
