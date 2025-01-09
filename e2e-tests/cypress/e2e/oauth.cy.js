describe('OAuth', () => {
  it('OAuth login', () => {
    cy.visit('http://localhost:3000');

    // login on DEX
    cy.get('#login').clear().type('test@example.com');
    cy.get('#password').clear().type('test');
    cy.get('#submit-login').click();

    // check DbGate connection
    cy.contains('MySql-connection').click();
    cy.contains('performance_schema');
  });
});
