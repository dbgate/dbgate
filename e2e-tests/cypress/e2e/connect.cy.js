describe('Initialization', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:5001');
    cy.contains('Database not selected');
  });

  it('adds connection', () => {
    cy.visit('http://localhost:5001');
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('Pwd2020Db');
    cy.get('[data-testid=ConnectionDriverFields_port]').clear().type('16004');
    cy.get('[data-testid=ConnectionTab_connect]').click();
    cy.contains('performance_schema');
  });
});
