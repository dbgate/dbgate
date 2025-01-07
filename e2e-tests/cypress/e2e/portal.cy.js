describe('Run as portal', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:3000');
    cy.contains('MySql-connection');
    cy.contains('Postgres-connection');
  });

  it('Delete chinook', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').rightclick();
    cy.contains('New Query (server)').click();
    cy.realType('drop database if exists Chinook');
    cy.realPress('F5');
    cy.contains('Query execution finished');

    cy.contains('Postgres-connection').rightclick();
    cy.contains('New Query (server)').click();
    cy.realType('drop database if exists "Chinook"');
    cy.realPress('F5');
    cy.contains('Query execution finished');

    // cy.realPress('F1');
    // cy.realType('Close all');
    // cy.realPress('Enter');
  });

  it('Create Chinook', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('MySql-connection').rightclick();
    cy.contains('Create database').click();
    cy.get('[data-testid=InputTextModal_value]').clear().type('Chinook');
    cy.get('[data-testid=InputTextModal_ok]').click();
  });


  it('Import Chinook', () => {
    cy.visit('http://localhost:3000');
    cy.contains('MySql-connection').click();
    cy.contains('Chinook').rightclick();
    cy.contains('Restore/import SQL dump').click();
    cy.get('#uploadFileButton').selectFile('data/chinook-mysql.sql', { force: true });
    cy.wait(500);
    cy.get('[data-testid=ImportDatabaseDumpModal_runImport]').click();
    cy.contains('Importing database');
    cy.contains('Finished job script');    
    cy.get('[data-testid=RunScriptModal_close]').click();
    cy.contains('Chinook').click();
    cy.contains('Album');
  });

  // it('import chinook DB', () => {
  //   cy.visit('http://localhost:3000');
  //   cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
  // });
});
