describe('Data browser data', () => {
  it('Load table data', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('Chinook').click();
    cy.contains('Album').click();
    cy.contains('Let There Be Rock');
    cy.contains('Rows: 347');
  });

  it('Filter model', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('Chinook').click();
    cy.testid('SqlObjectList_search').clear().type('album');
    cy.contains('347 rows, InnoDB');
    cy.testid('SqlObjectList_searchMenuDropDown').click();
    cy.contains('Column name').click();
    cy.contains('AlbumId');
    cy.contains('Column name').click();
    cy.contains('AlbumId').should('not.exist');
  });
});
