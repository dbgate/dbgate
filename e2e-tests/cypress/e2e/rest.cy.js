Cypress.on('uncaught:exception', err => {
  if (err.message.includes("Failed to execute 'importScripts' on 'WorkerGlobalScope'")) {
    return false;
  }
});

beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

describe('REST API connections', () => {
  it('GraphQL test', () => {
    cy.contains('REST GraphQL').click();
    cy.contains('products').click();
    cy.testid('GraphQlExplorerNode_toggle_products').click();
    cy.testid('GraphQlExplorerNode_checkbox_products.name').click();
    cy.testid('GraphQlExplorerNode_checkbox_products.price').click();
    cy.testid('GraphQlExplorerNode_checkbox_products.description').click();
    cy.testid('GraphQlExplorerNode_checkbox_products.category').click();
    cy.testid('GraphQlQueryTab_execute').click();
    cy.contains('Electronics');
    cy.themeshot('rest-graphql-query');
  });
  it('REST OpenAPI test', () => {
    cy.contains('REST OpenAPI').click();
    cy.contains('/api/categories').click();
    cy.testid('RestApiEndpointTab_execute').click();
    cy.contains('Electronics');
    cy.themeshot('rest-openapi-query');
  });
  it('REST OData test', () => {
    cy.contains('REST OData').click();
    cy.contains('/Users').click();
    cy.testid('ODataEndpointTab_execute').click();
    cy.contains('Henry');
    cy.themeshot('rest-odata-query');
  });
});
