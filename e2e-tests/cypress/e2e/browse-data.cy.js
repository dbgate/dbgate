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

describe('Data browser data', () => {
  it('Export to data archive', () => {
    cy.contains('MySql-connection').click();
    // cy.contains('MyChinook').click();
    // cy.contains('Album').click();
    cy.contains('MyChinook').rightclick();
    cy.contains('Export').click();
    cy.wait(1000);
    cy.testid('SourceTargetConfig_buttonCurrentArchive_target').click();
    cy.testid('FormTablesSelect_buttonAll_tables').click();
    // cy.wait(4000);
    // cy.contains('All tables').click();
    cy.contains('Run').click();
    cy.contains('Finished job script');
  });

  it('Data archive editor', () => {
    cy.testid('WidgetIconPanel_archive').click();
    cy.contains('Album').click();
    cy.testid('DataGrid_itemFilters').click();
    cy.contains('Let There Be Rock').click();
    cy.contains('Out Of Exile').click({ shiftKey: true });
    cy.contains('Change text case').click();
    cy.contains('AUDIOSLAVE');
    cy.screenshot('freetable');
  });

  it('Load table data', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Album').click();
    cy.contains('Let There Be Rock').click();
    cy.contains('Rows: 347');
    cy.realPress(['Control', 'ArrowRight']);
    cy.contains('Aerosmith');
  });

  it('Filter model', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('SqlObjectList_search').clear().type('album');
    cy.contains('Tables (1/11)');
    cy.contains('347 rows, InnoDB');
    cy.testid('SqlObjectList_searchMenuDropDown').click();
    cy.contains('Column name').click();
    cy.contains('Tables (2/11)');
    cy.contains('AlbumId');
    cy.contains('Column name').click();
    cy.contains('AlbumId').should('not.exist');
    cy.contains('Tables (1/11)');
  });

  it('Show raw data', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Album').rightclick();
    cy.contains('Open raw data').click();
    cy.contains('Let There Be Rock').click();
    cy.contains('Rows: 347').should('not.exist');
    cy.realPress(['Control', 'ArrowRight']);
    cy.contains('Aerosmith').should('not.exist');
  });

  it('Data grid screenshots', () => {
    cy.contains('MySql-connection').click();
    cy.window().then(win => {
      win.__changeCurrentTheme('theme-dark');
    });

    cy.contains('MyChinook').click();

    cy.contains('Album').click();
    cy.testid('TabsPanel_pinTabButton').click();
    cy.contains('Genre').click();
    cy.testid('TabsPanel_pinTabButton').click();
    cy.contains('Playlist').click();
    cy.testid('TabsPanel_pinTabButton').click();

    cy.contains('Postgres-connection').click();
    cy.contains('PgChinook').click();
    cy.contains('customer').click();
    cy.contains('Leonie').click();
    cy.screenshot('datagrid');

    cy.contains('invoice').click();
    cy.contains('invoice_line (invoice_id)').click();
    cy.screenshot('masterdetail');

    cy.contains('9, Place Louis Barthou').click();
    cy.contains('Switch to form').click();
    cy.contains('Switch to table'); // test that we are in form view
    cy.screenshot('formview');
  });

  it('SQL Gen', () => {
    cy.contains('Postgres-connection').click();
    cy.contains('PgChinook').rightclick();
    cy.contains('SQL Generator').click();
    cy.contains('Check all').click();
    cy.screenshot('sqlgen');
  });
});
