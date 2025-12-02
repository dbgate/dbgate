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
  it('Export window', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Album').rightclick();
    cy.contains('Export').click();
    cy.contains('Export advanced').click();
    cy.wait(1000);
    // cy.testid('SourceTargetConfig_buttonCurrentArchive_target').click();
    // cy.testid('FormTablesSelect_buttonAll_tables').click();
    // cy.testid('SourceTargetConfig_tablesSelect_source').click();
    // cy.find('.listContainer').contains('Album').click();
    // cy.find('.listContainer').contains('Track').click();
    // cy.wait(4000);
    // cy.contains('All tables').click();
    cy.contains('Run').click();
    cy.contains('Finished job script');
    cy.contains('Album.csv');
    cy.testid('WidgetIconPanel_database').click();
    cy.themeshot('configure-export-csv');
  });

  it('Data archive editor - macros', () => {
    cy.testid('WidgetIconPanel_archive').click();
    cy.contains('Album').click();
    cy.testid('DataGrid_itemFilters').click();
    cy.contains('Let There Be Rock').click();
    cy.contains('Out Of Exile').click({ shiftKey: true });
    cy.contains('Change text case').click();
    cy.contains('AUDIOSLAVE');
    cy.themeshot('data-archive-macros');
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
    cy.contains('347 rows, 65.5 KB, InnoDB');
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

  it('Data filter', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Album').click();
    cy.testid('DataFilterControl_input_Title').type('Rock{enter}');
    cy.contains('Rows: 7');
    cy.testid('DataFilterControl_input_AlbumId').type('>10xxx{enter}');
    cy.contains('Rows: 7');
    cy.testid('DataFilterControl_filtermenu_Title').click();
    // hide what is not needed
    cy.testid('WidgetIconPanel_database').click();
    cy.testid('DataGrid_itemReferences').click();
    cy.themeshot('data-browser-filter');
    cy.testid('DataGridCore_button_clearFilters').click();
    cy.contains('Rows: 347');
  });

  it('Data grid screenshots', () => {
    cy.contains('MySql-connection').click();

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
    cy.themeshot('common-data-browser');

    cy.contains('invoice').click();
    cy.contains('invoice_line (invoice_id)').click();
    cy.themeshot('data-browser-master-detail');

    cy.contains('9, Place Louis Barthou').click();
    cy.contains('Switch to form').click();
    cy.contains('Switch to table'); // test that we are in form view
    cy.themeshot('data-browser-form-view');
  });

  it('Column search', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Customer').click();
    cy.testid('ColumnManager_searchColumns').clear().type('name,id{enter}');
    cy.contains('Company').should('not.exist');
    cy.themeshot('data-browser-column-search');
  });

  it('SQL Gen', () => {
    cy.contains('Postgres-connection').click();
    cy.contains('PgChinook').rightclick();
    cy.contains('SQL Generator').click();
    cy.contains('Check all').click();
    cy.themeshot('sql-generator');
  });

  it('Macros in DB', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Customer').click();
    cy.contains('Leonie').click();
    cy.contains('Ramos').click({ shiftKey: true });
    cy.testid('DataGrid_itemColumns').click();
    cy.testid('DataGrid_itemFilters').click();
    cy.testid('DataGrid_itemReferences').click();
    cy.testid('DataGrid_itemMacros').click();
    cy.contains('Change text case').click();
    cy.contains('NIELSEN');
    cy.themeshot('data-browser-macros');
  });

  it('Perspectives', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Artist').rightclick();
    cy.contains('Design perspective query').click();

    cy.testid('PerspectiveNodeRow_check_Artist_Album').click();
    cy.testid('PerspectiveNodeRow_expand_Artist_Album').click();
    cy.testid('PerspectiveNodeRow_check_Artist_Album_Track').click();

    // check track is loaded
    cy.contains('Put The Finger On You');

    cy.themeshot('perspective-designer');
  });

  it('Query editor - code completion', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Customer').rightclick();
    cy.contains('SQL template').click();
    cy.contains('CREATE TABLE').click();
    cy.wait(1000);
    cy.get('body').realPress('PageDown');
    cy.get('body').realType('select * from Album where Album.');
    // code completion
    cy.contains('ArtistId');
    cy.themeshot('query-editor-code-completion');
  });

  it('Query editor - join wizard', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('TabsPanel_buttonNewObject').click();
    cy.testid('NewObjectModal_query').click();
    cy.wait(1000);
    cy.get('body').realType('select * from Invoice');
    cy.get('body').realPress('{enter}');
    cy.get('body').realPress(['Control', 'j']);
    // JOIN wizard
    cy.contains('INNER JOIN Customer ON Invoice.CustomerId = Customer.CustomerId');
    cy.themeshot('query-editor-join-wizard');
  });

  it('Mongo JSON data view', () => {
    cy.contains('Mongo-connection').click();
    cy.contains('MgChinook').click();
    cy.contains('Customer').click();
    cy.testid('DataFilterControl_input_CustomerId').type('<=10{enter}');
    // test filter
    cy.contains('Rows: 10');
    cy.contains('Helena').rightclick();
    cy.contains('Open query').click();
    cy.wait(1000);
    cy.contains('Execute').click();
    cy.testid('WidgetIconPanel_cell-data').click();
    // test JSON view
    cy.contains('Country: "Brazil"');
    cy.themeshot('mongo-query-json-view');
  });

  it('SQL preview', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Customer').rightclick();
    cy.contains('Show SQL').click();
    // index should be part of create script
    cy.contains('CREATE INDEX `IFK_CustomerSupportRepId`');
    cy.themeshot('sql-preview-create-index');
  });

  it('Query designer', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('WidgetIconPanel_file').click();
    cy.contains('customer').click();
    // cy.contains('left join').rightclick();
    cy.themeshot('query-designer');
  });

  it('Database diagram', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('WidgetIconPanel_file').click();
    cy.contains('chinook-diagram').click();
    cy.testid('WidgetIconPanel_file').click();
    // check diagram is shown
    cy.contains('MediaTypeId');
    cy.themeshot('database-diagram');
  });

  // it('Charts', () => {
  //   cy.testid('WidgetIconPanel_file').click();
  //   cy.contains('pie-chart').click();
  //   cy.contains('line-chart').click();
  //   cy.testid('TabsPanel_buttonSplit').click();
  //   cy.testid('WidgetIconPanel_file').click();
  //   cy.themeshot('view-split-charts');
  // });

  it('Keyboard configuration', () => {
    cy.testid('WidgetIconPanel_settings').click();
    cy.contains('Keyboard shortcuts').click();
    cy.contains('dataForm.refresh').click();
    cy.testid('CommandModal_keyboardButton').click();
    cy.themeshot('keyboard-configuration');
  });

  it('Command palette', () => {
    cy.contains('Connections');
    cy.testid('WidgetIconPanel_menu').click();
    cy.contains('Tools').click();
    cy.contains('Command palette').click();
    // cy.realPress('F1');
    cy.realPress('PageDown');
    cy.realPress('PageDown');
    cy.testid('CommandPalette_main').themeshot('command-palette', { padding: 50 });
  });

  it('About window', () => {
    cy.contains('Connections');
    cy.testid('WidgetIconPanel_menu').click();
    cy.contains('Help').click();
    cy.contains('About').click();
    cy.testid('ModalBase_window').themeshot('about-window', { padding: 50 });
  });

  it('Show map', () => {
    cy.contains('Postgres-connection').click();
    cy.contains('PgGeoData').click();
    cy.contains('cities').click();
    // clicking column header doesn't work, TODO FIX in app!!!
    // cy.contains('location').click();
    cy.contains('14.2').click();
    cy.contains('13.9').click({ shiftKey: true });
    cy.testid('WidgetIconPanel_cell-data').click();
    cy.wait(2000);
    cy.themeshot('cell-map-view');
  });

  it('Search in connections', () => {
    cy.testid('ConnectionList_search').type('my');
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();

    cy.testid('SqlObjectList_search').type('album');
    cy.contains('Album').click();
    cy.testid('SqlObjectList_searchMenuDropDown').click();
    cy.contains('Column name').click();
    cy.themeshot('search-in-connections');
  });

  it('Edit mongo data JSON', () => {
    // TODO FIX: Missing button+ctx menu Revert all changes, missing button+ctx menu add document
    // TODO: Dark theme - not visible changed and deleted document
    cy.contains('Mongo-connection').click();
    cy.contains('MgChinook').click();
    cy.contains('Customer').rightclick();
    cy.contains('Open JSON').click();
    cy.contains('Leonie').rightclick();
    cy.contains('Edit document').click();
    // cy.focused()
    //   .type('{downArrow}'.repeat(11))
    //   .type('{rightarrow}'.repeat(14))
    //   .type('{del}'.repeat(7)) // 4*delete
    //   .type('Italy'); // type "Italy"

    Array.from({ length: 11 }).forEach(() => cy.realPress('ArrowDown'));
    Array.from({ length: 14 }).forEach(() => cy.realPress('ArrowRight'));
    Array.from({ length: 7 }).forEach(() => cy.realPress('Delete'));
    cy.realType('Italy');
    cy.testid('EditJsonModal_saveButton').click();

    cy.contains('Helena').rightclick();
    cy.contains('Delete document').click();
    cy.contains('Save').click();
    cy.themeshot('save-changes-mongodb');
  });

  it('Edit mongo data JSON', () => {
    // TODO FIX: Auto expand cell view
    cy.contains('Mongo-connection').click();
    cy.contains('MgRivers').click();
    cy.contains('RiverInfo').click();
    cy.testid('ColumnManagerRow_expand_countries').click();
    cy.testid('ColumnManagerRow_checkbox_countries.0').click();
    cy.testid('ColumnManagerRow_checkbox_countries.1').click();
    cy.testid('ColumnManagerRow_checkbox__id').click();
    cy.testid('DataFilterControl_input_countries.1').type('EXISTS{enter}');
    cy.testid('WidgetIconPanel_cell-data').click();
    cy.themeshot('mongodb-json-cell-view');
  });

  it('Table structure editor', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Customer').rightclick();
    cy.contains('Open structure').click();
    cy.contains('varchar(40)');
    cy.themeshot('table-structure-editor');
    cy.contains('EmployeeId').click();
    cy.contains('Ref column - Employee');
    cy.themeshot('foreign-key-editor');
  });

  it('Compare database', () => {
    // TODO FIX: SQL diff is not dark in dark mode
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('MyChangedChinook').rightclick();
    cy.contains('Compare with').click();
    cy.testid('CompareModelTab_gridObjects_Customer_Customer').click();
    cy.testid('WidgetIconPanel_database').click();
    cy.testid('CompareModelTab_tabDdl').click();
    cy.themeshot('compare-database-models');
    cy.contains('Settings').click();
    cy.testid('CompareModelTab_tabOperations').click();
    cy.themeshot('compare-database-settings');
  });

  it('Modify data', () => {
    // TODO FIX: delete references cascade not working
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Employee').click();
    cy.contains('Rows: 8');

    cy.contains('Laura').click();
    cy.contains('Laura').click();
    cy.get('body').realType('Jane');
    // cy.contains('Peacock').click();
    // cy.testid('TableDataTab_deleteSelectedRows').click();
    cy.contains('King').click();
    cy.testid('TableDataTab_deleteSelectedRows').click();
    cy.testid('TableDataTab_insertNewRow').click();
    cy.get('body').realType('Novak');
    cy.get('body').realPress('{enter}');
    cy.realPress(['ArrowRight']);
    cy.get('body').realType('Karel');
    cy.testid('TableDataTab_save').click();
    cy.contains('INSERT INTO `Employee`');
    cy.contains("SET `FirstName`='Jane'");
    cy.contains('DELETE FROM `Employee`');
    cy.themeshot('data-browser-save-changes');

    // cy.testid('ConfirmSqlModal_okButton').click();
    // cy.contains('Cannot delete or update a parent row')
    // cy.testid('ConfirmSqlModal_okButton').click();

    // cy.testid('TableDataTab_save').click();
    // cy.testid('ConfirmSqlModal_deleteReferencesCascade').click();
    // cy.testid('ConfirmSqlModal_okButton').click();

    cy.testid('ConfirmSqlModal_okButton').click();

    cy.contains('Novak');
    cy.contains('Rows: 8');
  });

  it('Export menu', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.contains('Album').click();
    cy.testid('DataFilterControl_input_ArtistId').type('22{enter}');
    // cy.contains('Presence').rightclick();
    // cy.contains('Coda').rightclick();
    // cy.testid('DropDownMenu-container-0').contains('Export').click();
    cy.contains('Export').click();
    // cy.wait(1000);
    cy.themeshot('data-browser-export-menu');
  });

  it('MySQL native backup', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').rightclick();
    cy.contains('Create database backup').click();
    cy.contains('Customer');
    cy.themeshot('mysql-backup-configuration');
  });

  it('View table YAML model', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').rightclick();
    cy.contains('Export DB model').click();
    cy.testid('ExportDbModelModal_archiveFolder').select('(Create new)');
    cy.testid('InputTextModal_value').clear().type('test-model');
    cy.testid('InputTextModal_ok').click();
    cy.testid('ModalBase_window').themeshot('export-database-model-window', { padding: 50 });
    cy.testid('ExportDbModelModal_exportButton').click();
    cy.contains('Album').click();
    cy.contains('autoIncrement');
    cy.themeshot('database-model-table-yaml');
  });

  it('Data replicator', () => {
    cy.contains('MySql-connection').click();
    cy.contains('MyChinook').click();
    cy.testid('WidgetIconPanel_archive').click();
    cy.contains('chinook-archive').rightclick();
    cy.contains('Data deployer').click();
    cy.contains('Dry run').click();
    cy.testid('TableControl_row_2_checkbox').click();
    cy.testid('TableControl_row_2').click();
    cy.testid('DataDeploySettings_find_checkbox').click();
    cy.testid('DataDeploySettings_create_checkbox').click();
    cy.testid('WidgetIconPanel_archive').click();
    cy.themeshot('data-deployer');
    cy.testid('DataDeployTab_importIntoDb').click();
    cy.testid('ConfirmDataDeployModal_okButton').click();
    cy.contains('Replicated Customer, inserted 59 rows');
    cy.contains('Finished job script');
    cy.testid('DataDeployTab_importIntoDb').click();
    cy.themeshot('data-replicator');
  });
});
