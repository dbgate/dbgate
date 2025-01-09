describe('Data browser data', () => {
  it('Load table data', () => {
    cy.visit('http://localhost:3000');

    cy.contains('MySql-connection').click();
    cy.contains('Chinook').click();
    cy.contains('Album').click();
    cy.contains('Let There Be Rock');
    cy.contains('Rows: 347');
  });
});
