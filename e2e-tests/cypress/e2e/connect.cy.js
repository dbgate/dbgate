describe('Initialization', () => {
  it('successfully loads', () => {
    cy.visit('http://localhost:3000');
    cy.contains('Database not selected');
  });

  it('adds connection', () => {
    cy.visit('http://localhost:3000');
    // cy.get('[data-testid=ConnectionList_buttonNewConnection]').click();
    cy.get('[data-testid=ConnectionDriverFields_connectionType]').select('MySQL');
    cy.get('[data-testid=ConnectionDriverFields_user]').clear().type('root');
    cy.get('[data-testid=ConnectionDriverFields_password]').clear().type('Pwd2020Db');
    cy.get('[data-testid=ConnectionDriverFields_port]').clear().type('16004');
    if (process.env.CI) {
      cy.get('[data-testid=ConnectionDriverFields_server]').clear().type('mysql');
    } 
    cy.get('[data-testid=ConnectionTab_connect]').click();
    cy.contains('performance_schema');
  });
});
