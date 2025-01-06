describe('Run as portal', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:3000');
    cy.contains('MySql');
    cy.contains('Postgres');
  });

  // it('import chinook DB', () => {
  //   cy.visit('http://localhost:3000');
  //   cy.get('[data-testid=ConnectionTab_buttonConnect]').click();
  // });
});
