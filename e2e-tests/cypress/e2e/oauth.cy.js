describe('OAuth', () => {
  it('OAuth login', () => {
    cy.visit('http://localhost:3000');

    const runOnCI = Cypress.env('runOnCI');

    // login on DEX
    if (runOnCI) {
      cy.origin('http://dex:5556', () => {
        cy.get('#login').clear().type('test@example.com');
        cy.get('#password').clear().type('test');
        cy.get('#submit-login').click();
      });
    } else {
      cy.get('#login').clear().type('test@example.com');
      cy.get('#password').clear().type('test');
      cy.get('#submit-login').click();
    }

    // check DbGate connection
    cy.contains('MySql-connection').click();
    cy.contains('performance_schema');
  });
});
