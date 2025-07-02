Cypress.on('uncaught:exception', (err, runnable) => {
  // if the error message matches the one about WorkerGlobalScope importScripts
  if (err.message.includes("Failed to execute 'importScripts' on 'WorkerGlobalScope'")) {
    // return false to let Cypress know we intentionally want to ignore this error
    return false;
  }
  // otherwise let Cypress throw the error
});

beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

describe('Charts', () => {
  it('Auto detect chart', () => {
    cy.contains('MySql-connection').click();
    cy.contains('charts_sample').click();
    cy.testid('WidgetIconPanel_file').click();
    cy.contains('chart1').click();
    cy.contains('department_name');
    // cy.testid('QueryTab_executeButton').click();
    // cy.testid('QueryTab_openChartButton').click();
    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('choose-detected-chart');
  });
});
