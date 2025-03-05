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

function multiTest(testProps, testDefinition) {
  if (localconfig.mysql) {
    it('MySQL', () => testDefinition('MySql-connection', 'my_guitar_shop', 'mysql@dbgate-plugin-mysql'));
  }
  if (localconfig.postgres) {
    it('Postgres', () => testDefinition('Postgres-connection', 'my_guitar_shop', 'postgres@dbgate-plugin-postgres'));
  }
  if (localconfig.mssql) {
    it('Mssql', () => testDefinition('Mssql-connection', 'my_guitar_shop', 'mssql@dbgate-plugin-mssql'));
  }
  if (localconfig.oracle) {
    it('Oracle', () =>
      testDefinition('Oracle-connection', 'C##MY_GUITAR_SHOP', 'oracle@dbgate-plugin-oracle', {
        implicitTransactions: true,
      }));
  }
  if (localconfig.sqlite) {
    it('Sqlite', () => testDefinition('Sqlite-connection', null, 'sqlite@dbgate-plugin-sqlite'));
  }
  if (localconfig.mongo && !testProps.skipMongo) {
    it('MongoDB', () => testDefinition('Mongo-connection', 'my_guitar_shop', 'mongo@dbgate-plugin-mongo'));
  }
}

describe('Transactions', () => {
  multiTest({ skipMongo: true }, (connectionName, databaseName, engine, options = {}) => {
    const driver = requireEngineDriver(engine);
    const implicitTransactions = options.implicitTransactions ?? false;

    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
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

describe('Backup table', () => {
  multiTest({ skipMongo: true }, (connectionName, databaseName, engine, options = {}) => {
    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
    cy.contains('customers').rightclick();
    cy.contains('Create table backup').click();
    cy.testid('ConfirmSqlModal_okButton').click();
    cy.contains('_customers').click();
    cy.contains('Rows: 8').should('be.visible');
  });
});

describe('Truncate table', () => {
  multiTest({ skipMongo: true }, (connectionName, databaseName, engine, options = {}) => {
    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
    cy.contains('order_items').rightclick();
    cy.contains('Truncate table').click();
    cy.testid('ConfirmSqlModal_okButton').click();
    cy.contains('order_items').click();
    cy.contains('No rows loaded').should('be.visible');
  });
});

describe('Drop table', () => {
  multiTest({ skipMongo: true }, (connectionName, databaseName, engine, options = {}) => {
    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
    cy.contains('order_items').rightclick();
    cy.contains('Drop table').click();
    cy.testid('ConfirmSqlModal_okButton').click();
    cy.contains('order_items').should('not.exist');
  });
});

describe('Import CSV', () => {
  multiTest({}, (connectionName, databaseName, engine, options = {}) => {
    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
    cy.testid('ConnectionList_container')
      .contains(databaseName ?? connectionName)
      .rightclick();
    cy.contains('Import').click();

    cy.get('input[type=file]').selectFile('cypress/fixtures/customers-20.csv', { force: true });
    cy.contains('customers-20');
    cy.testid('ImportExportTab_preview_content').contains('50ddd99fAdF48B3').should('be.visible');

    cy.testid('ImportExportTab_executeButton').click();
    cy.contains('20 rows written').should('be.visible');

    cy.testid('SqlObjectList_refreshButton').click();
    cy.testid('SqlObjectList_container').contains('customers-20').click();
    cy.contains('Rows: 20').should('be.visible');

    // cy.get('table tbody tr')
    //   .eq(1)
    //   .within(() => {
    //     cy.get('select').select('Append data');
    //   });
  });
});

describe('Import CSV - source error', () => {
  multiTest({}, (connectionName, databaseName, engine, options = {}) => {
    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
    cy.testid('ConnectionList_container')
      .contains(databaseName ?? connectionName)
      .rightclick();
    cy.contains('Import').click();

    cy.get('input[type=file]').selectFile('cypress/fixtures/customers-20-err.csv', { force: true });
    cy.contains('customers-20-err');
    cy.testid('ImportExportTab_preview_content').contains('Invalid Closing Quote').should('be.visible');

    cy.testid('ImportExportTab_executeButton').click();
    cy.testid('ImportExportConfigurator_errorInfoIcon_customers-20-err').click();

    cy.testid('ErrorMessageModal_message').contains('Invalid Closing Quote').should('be.visible');
  });
});

describe('Import CSV - target error', () => {
  multiTest({}, (connectionName, databaseName, engine, options = {}) => {
    cy.contains(connectionName).click();
    if (databaseName) cy.contains(databaseName).click();
    cy.testid('ConnectionList_container')
      .contains(databaseName ?? connectionName)
      .rightclick();
    cy.contains('Import').click();

    cy.get('input[type=file]').selectFile('cypress/fixtures/customers-20.csv', { force: true });
    cy.contains('customers-20');
    cy.testid('ImportExportConfigurator_targetName_customers-20').clear().type('system."]`');
    cy.testid('ImportExportTab_executeButton').click();
    cy.testid('ImportExportConfigurator_errorInfoIcon_customers-20').click();
    cy.testid('ErrorMessageModal_message').should('be.visible');
  });
});
