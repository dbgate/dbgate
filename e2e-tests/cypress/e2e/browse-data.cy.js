describe('Data browser data', () => {
  it('Load table data', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('Chinook').click();
    cy.contains('Album').click();
    cy.contains('Let There Be Rock').click();
    cy.contains('Rows: 347');
    cy.realPress(['Control', 'ArrowRight']);
    cy.contains('Aerosmith');
  });

  it.only('Filter model', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('Chinook').click();
    cy.testid('SqlObjectList_search').clear().type('album');
    cy.contains('Tables (1/11)');
    cy.contains('347 rows, InnoDB');
    cy.testid('SqlObjectList_searchMenuDropDown').click();
    cy.contains('Column name').click();
    cy.contains('Tables (2/11)');
    cy.contains('AlbumId');
    cy.contains('Column name').click();
    cy.contains('AlbumId').should('not.exist');
    cy.contains('Tables (1/11)');
  });

  it('Show raw data', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('Chinook').click();
    cy.contains('Album').rightclick();
    cy.contains('Open raw data').click();
    cy.contains('Let There Be Rock').click();
    cy.contains('Rows: 347').should('not.exist');
    cy.realPress(['Control', 'ArrowRight']);
    cy.contains('Aerosmith').should('not.exist');
  });
});
