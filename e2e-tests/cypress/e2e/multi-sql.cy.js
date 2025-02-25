const localconfig = require('../../.localconfig');
const { formatQueryWithoutParams } = require('dbgate-tools');

global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
};

function requireEngineDriver(engine) {
  const [shortName, packageName] = engine.split('@');
  const plugin = require(`../../../plugins/${packageName}/src/frontend/index`);
  if (plugin.drivers) {
    return plugin.drivers.find(x => x.engine == engine);
  }
  throw new Error(`Could not find engine driver ${engine}`);
}

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
  if (localconfig.mysql) {
    it(testName + ' MySQL', () => testDefinition('MySql-connection', 'mysql@dbgate-plugin-mysql'));
  }
  if (localconfig.postgres) {
    it(testName + ' Postgres', () => testDefinition('Postgres-connection', 'postgres@dbgate-plugin-postgres'));
  }
  if (localconfig.mssql) {
    it(testName + ' Mssql', () => testDefinition('Mssql-connection', 'mssql@dbgate-plugin-mssql'));
  }
  if (localconfig.oracle) {
    it(testName + ' Oracle', () =>
      testDefinition('Oracle-connection', 'oracle@dbgate-plugin-oracle', {
        databaseName: 'C##MY_GUITAR_SHOP',
        implicitTransactions: true,
      })
    );
  }
  if (localconfig.sqlite) {
    it(testName + ' Sqlite', () => testDefinition('Sqlite-connection', 'sqlite@dbgate-plugin-sqlite'));
  }
}

describe('Mutli-sql tests', () => {
  multiTest('Transactions', (connectionName, engine, options = {}) => {
    const driver = requireEngineDriver(engine);
    const databaseName = options.databaseName ?? 'my_guitar_shop';
    const implicitTransactions = options.implicitTransactions ?? false;

    cy.contains(connectionName).click();
    cy.contains(databaseName).click();
    cy.testid('TabsPanel_buttonNewQuery').click();
    cy.wait(1000);
    cy.get('body').type(
      formatQueryWithoutParams(driver, "INSERT INTO ~categories (~category_id, ~category_name) VALUES (5, 'test');")
    );

    // rollback
    if (!implicitTransactions) {
      cy.testid('QueryTab_beginTransactionButton').click();
      cy.contains('Begin Transaction finished');
    }
    cy.testid('QueryTab_executeButton').click();
    cy.contains('Query execution finished');
    cy.testid('QueryTab_rollbackTransactionButton').click();
    cy.contains('Rollback Transaction finished');

    // should contain 4 rows
    cy.testid('SqlObjectList_container').contains('categories').click();
    cy.contains('Guitars').click();
    cy.testid('TableDataTab_refreshGrid').click();
    cy.contains('Rows: 4');

    // commit
    cy.contains('Query #1').click();
    if (!implicitTransactions) {
      cy.testid('QueryTab_beginTransactionButton').click();
      cy.contains('Begin Transaction finished');
    }
    cy.testid('QueryTab_executeButton').click();
    cy.contains('Query execution finished');
    cy.testid('QueryTab_commitTransactionButton').click();
    cy.contains('Commit Transaction finished');

    // should contain 5 rows
    cy.testid('SqlObjectList_container').contains('categories').click();
    cy.contains('Guitars').click();
    cy.testid('TableDataTab_refreshGrid').click();
    cy.contains('Rows: 5');
  });
});
