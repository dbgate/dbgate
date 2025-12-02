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

  it('Two line charts', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_query').click();
    cy.wait(1000);
    cy.get('body').realType('SELECT InvoiceDate, Total from Invoice');
    cy.contains('Execute').click();
    cy.contains('Open chart').click();
    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('two-line-charts');
  });

  it('Invoice naive autodetection', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_query').click();
    cy.wait(1000);
    cy.get('body').realType('SELECT * from Invoice');
    cy.contains('Execute').click();
    cy.contains('Open chart').click();
    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('chart-naive-autodetection');
  });

  it('Invoice by country - grouped chart', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_query').click();
    cy.wait(1000);
    cy.get('body').realType(
      "SELECT InvoiceDate, Total, BillingCountry from Invoice where BillingCountry in ('USA', 'Canada', 'Brazil', 'France', 'Germany')"
    );
    cy.contains('Execute').click();
    cy.contains('Open chart').click();
    cy.testid('ChartSelector_chart_1').click();
    cy.testid('JslChart_customizeButton').click();

    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('chart-grouped-autodetected');

    cy.testid('ChartDefinitionEditor_chartTypeSelect').select('Bar');
    cy.testid('ChartDefinitionEditor_xAxisTransformSelect').select('Date (Year)');

    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('chart-grouped-bars');
  });

  it('Public Knowledge base - show chart', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('WidgetIconPanel_cloud-public').click();
    cy.testid('public-cloud-file-tag-mysql/folder-MySQL/tag-premium/top-tables-row-count.sql').click();
    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('public-knowledge-base-tables-sizes');
  });

  it('Auto detect chart', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Invoice').rightclick();
    cy.contains('SQL template').click();
    cy.contains('SELECT').click();
    cy.testid('QueryTab_detectChartButton').click();
    cy.testid('QueryTab_executeButton').click();
    cy.contains('Chart 1').click();
    cy.testid('ChartSelector_chart_0').click();
    cy.testid('JslChart_customizeButton').click();
    cy.testid('ChartDefinitionEditor_chartTypeSelect').select('Bar');
    cy.testid('ChartDefinitionEditor_chartTypeSelect').select('Line');
    cy.testid('chart-canvas').should($c => expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/));
    cy.themeshot('query-result-chart');
  });

  it('New object window', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Invoice').click();
    cy.testid('WidgetIconPanel_addButton').click();
    cy.contains('Compare database');
    cy.themeshot('new-object-window');
  });

  it('Database chat - charts', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_databaseChat').click();
    cy.wait(1000);
    cy.get('body').realType('show me chart of most popular genres');
    cy.get('body').realPress('{enter}');
    cy.testid('DatabaseChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.testid('chart-canvas', { timeout: 30000 }).should($c =>
      expect($c[0].toDataURL()).to.match(/^data:image\/png;base64/)
    );
    cy.themeshot('database-chat-chart');
  });

  it('Database chat', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_databaseChat').click();
    cy.wait(1000);
    cy.get('body').realType('find most popular artist');
    cy.get('body').realPress('{enter}');
    cy.testid('DatabaseChatTab_executeAllQueries', { timeout: 30000 }).click();
    cy.wait(30000);
    // cy.contains('Iron Maiden');
    cy.themeshot('database-chat');

    // cy.testid('DatabaseChatTab_promptInput').click();
    // cy.get('body').realType('I need top 10 songs with the biggest income');
    // cy.get('body').realPress('{enter}');
    // cy.contains('Hot Girl', { timeout: 20000 });
    // cy.wait(1000);
    // cy.themeshot('database-chat');
  });

  it('Explain query error', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_query').click();
    cy.wait(1000);
    cy.get('body').realType('select * from Invoice2');
    cy.contains('Execute').click();
    cy.testid('MessageViewRow-explainErrorButton-1').click();
    cy.testid('ChatCodeRenderer_useSqlButton', { timeout: 30000 });
    cy.themeshot('explain-query-error');
  });

  it('Switch language', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('WidgetIconPanel_settings').click();

    cy.testid('SettingsModal_languageSelect').select('Deutsch');
    cy.testid('ConfirmModal_okButton').click();
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('Sprache');
    cy.themeshot('switch-language-de');

    cy.testid('SettingsModal_languageSelect').select('Français');
    cy.testid('ConfirmModal_okButton').click();
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('Langue');
    cy.themeshot('switch-language-fr');

    cy.testid('SettingsModal_languageSelect').select('Español');
    cy.testid('ConfirmModal_okButton').click();
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('Idioma');
    cy.themeshot('switch-language-es');

    cy.testid('SettingsModal_languageSelect').select('Čeština');
    cy.testid('ConfirmModal_okButton').click();
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('Jazyk');
    cy.themeshot('switch-language-cs');

    cy.testid('SettingsModal_languageSelect').select('中文');
    cy.testid('ConfirmModal_okButton').click();
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('语言');
    cy.themeshot('switch-language-zh');

    cy.testid('SettingsModal_languageSelect').select('English');
    cy.testid('ConfirmModal_okButton').click();
    cy.testid('WidgetIconPanel_settings');
  });
});
