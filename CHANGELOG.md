# ChangeLog

### 4.4.3
- ADDED: Connection and database colors
- ADDED: Ability to pin connection or table
- ADDED: MongoDb: create, drop collection from menu
- ADDED: Copy as MongoDB insert
- ADDED: MongoDB support for multiple statements in script (dbgate-query-splitter)
- ADDED: View JSON in tab
- ADDED: Open DB model as JSON
- ADDED: Open JSON array as data sheet
- ADDED: Open JSON from data grid
- FIXED: Mongo update command when using string IDs resembling Mongo IDs
- CHANGED: Imrpoved add JSON document, change JSON document commands
- ADDED: Possibility to add column to JSON grid view
- FIXED: Hiding columns #1
- REMOVED: Copy JSON document menu command (please use Copy advanced instead)
- CHANGED: Save widget visibility and size

### 4.4.2
- ADDED: Open SQL script from SQL confirm
- CHANGED: Better looking statusbar
- ADDED: Create table from database popup menu
- FIXED: Some fixes for DB compare+deploy (eg. #196)
- ADDED: Archives + DB models from external directories
- ADDED: DB deploy supports preloaded data
- ADDED: Support for Command key on Mac (#199)

### 4.4.1
- FIXED: #188 Fixed problem with datetime values in PostgreSQL and mysql
- ADDED: #194 Close tabs by DB
- FIXED: Improved form view width calculations
- CHANGED: Form view - highlight matched columns instead of filtering
- ADDED: Lookup distinct values
- ADDED: Copy advanced command, Copy as CSV, JSON, YAML, SQL
- CHANGED: Hide column manager by default
- ADDED: Change database status command
- CHANGED: Table structure and view structure tabs have different icons
- ADDED: #186 - zoom setting
- ADDED: Row count information moved into status bar, when only one grid on tab is used (typical case)

### 4.4.0
- ADDED: Database structure compare, export report to HTML
- ADDED: Experimental: Deploy DB structure changes between databases
- ADDED: Lookup dialog, available in table view on columns with foreign key
- ADDED: Customize foreign key lookups
- ADDED: Chart improvements, export charts as HTML page
- ADDED: Experimental: work with DB model, deploy model, compare model with real DB
- ADDED: #193 new SQLite db command
- CHANGED: #190 code completion improvements
- ADDED: #189 Copy JSON document - context menu command in data grid for MongoDB
- ADDED: #191 Connection to POstgreSQL can be defined also with connection string
- ADDED: #187 dbgate-query-splitter: Transform stream support
- CHANGED: Upgraded to node 12 in docker app
- FIXED: Upgraded to node 12 in docker app
- FIXED: Fixed import into SQLite and PostgreSQL databases, added integration test for this

### 4.3.4
- FIXED: Delete row with binary ID in MySQL (#182)
- ADDED: Using 'ODBC Driver 17 for SQL Server' or 'SQL Server Native Client 11.0', when connecting to MS SQL using windows auth #183

### 4.3.3
- ADDED: Generate SQL from data (#176 - Copy row as INSERT/UPDATE statement)
- ADDED: Datagrid keyboard column operations (Ctrl+F - find column, Ctrl+H - hide column) #180
- FIXED: Make window remember that it was maximized
- FIXED: Fixed lost focus after copy to clipboard and after inserting SQL join

### 4.3.2
- FIXED: Sorted database list in PostgreSQL (#178)
- FIXED: Loading stricture of PostgreSQL database, when it contains indexes on expressions (#175)
- ADDED: Hotkey Shift+Alt+F for formatting SQL code

### 4.3.1
- FIXED: #173 Using key phrase for SSH key file connection
- ADDED: #172 Abiloity to quick search within database names
- ADDED: Database search added to command palette (Ctrl+P)
- FIXED: #171 fixed PostgreSQL analyser for older versions than 9.3 (matviews don't exist)
- ADDED: DELETE cascade option - ability to delete all referenced rows, when deleting rows

### 4.3.0
- ADDED: Table structure editor
- ADDED: Index support
- ADDED: Unique constraint support
- ADDED: Context menu for drop/rename table/columns and for drop view/procedure/function
- ADDED: Added support for Windows arm64 platform
- FIXED: Search by _id in MongoDB

### 4.2.6
- FIXED: Fixed MongoDB import
- ADDED: Configurable thousands separator #136
- ADDED: Using case insensitive text search in postgres

### 4.2.5
- FIXED: Fixed crash when using large model on some installations
- FIXED: Postgre SQL CREATE function 
- FIXED: Analysing of MySQL when modifyDate is not known

### 4.2.4
- ADDED: Query history
- ADDED: One-click exports in desktop app
- ADDED: JSON array export
- FIXED: Procedures in PostgreSQL #122
- ADDED: Support of materialized views for PostgreSQL #123
- ADDED: Integration tests
- FIXED: Fixes in DB structure analysis in PostgreSQL, SQLite, MySQL
- FIXED: Save data in SQLite, PostgreSQL
- CHANGED: Introduced package dbgate-query-splitter, instead of sql-query-identifier and @verycrazydog/mysql-parse

### 4.2.3
- ADDED: ARM builds for MacOS and Linux
- ADDED: Filter by columns in form view

### 4.2.2
- CHANGED: Further startup optimalization (approx. 2 times quicker start of electron app)

### 4.2.1
- FIXED: Fixed+optimalized app startup (esp. on Windows)

### 4.2.0
- ADDED: Support of SQLite database
- ADDED: Support of Amazon Redshift database
- ADDED: Support of CockcroachDB
- CHANGED: DB Model is not auto-refreshed by default, refresh could be invoked from statusbar
- FIXED: Fixed race conditions on startup
- FIXED: Fixed broken style in data grid under strange circumstances
- ADDED: Configure connections with commandline arguments  #108
- CHANGED: Optimalized algorithm of incremental DB model updates
- CHANGED: Loading queries from PostgreSQL doesn't need cursors, using streamed query instead
- ADDED: Disconnect command
- ADDED: Query executed on server has tab marker (formerly it had only "No DB" marker)
- ADDED: Horizontal scroll using shift+mouse wheel #113
- ADDED: Cosmetic improvements of MariaDB support

### 4.1.11
- FIX: Fixed crash of API process when using SSH tunnel connection (race condition)

### 4.1.11
- FIX: fixed processing postgre query containing $$
- FIX: fixed postgre analysing procedures & functions
- FIX: patched svelte crash #105
- ADDED: ability to disbale background DB model updates
- ADDED: Duplicate connection
- ADDED: Duplicate tab
- FIX: SSH tunnel connection using keyfile auth #106
- FIX: All tables button fix in export #109
- CHANGED: Add to favorites moved from toolbar to tab context menu
- CHANGED: Toolbar design - current tab related commands are delimited

### 4.1.10
- ADDED: Default database option in connectin settings #96 #92
- FIX: Bundle size optimalization for Windows #97
- FIX: Popup menu placement on smaller displays #94
- ADDED: Browse table data with SQL Server 2008 #93
- FIX: Prevented malicious origins / DNS rebinding #91
- ADDED: Handle JSON fields in data editor (eg. jsonb field in Postgres) #90
- FIX: Fixed crash on Windows with Hyper-V #86
- ADDED: Show database server version in status bar
- ADDED: Show detailed info about error, when connect to database fails
- ADDED: Portable ZIP distribution for Windows #84
### 4.1.9
- FIX: Incorrect row count info in query result #83

### 4.1.1
- CHANGED: Default plugins are now part of installation
### 4.1.0
- ADDED: MongoDB support
- ADDED: Configurable keyboard shortcuts
- ADDED: JSON row cell data view
- FIX: Fixed some problems from migration to Svelte

### 4.0.3
- FIX: fixes for FireFox (mainly incorrent handle of bind:clientHeight, replaces with resizeobserver)
### 4.0.2
- FIX: fixed docker and NPM build
### 4.0.0
- CHANGED: Excahnged React with Svelte. Changed theme colors. Huge speed and memory optimalization
- ADDED: SQL Generator (CREATE, INSERT, DROP)
- ADDED: Command palette (F1). Introduced commands, extended some context menus
- ADDED: New keyboard shortcuts
- ADDED: Switch to recent database feature
- ADDED: Macros from free table editor are available also in table data editor
- CHANGED: Cell data preview is now in left widgets panel
- CHANGED: Toolbar refactor
- FIX: Solved reconnecting expired connection

### 3.9.6
- ADDED: Connect using SSH Tunnel
- ADDED: Connect using SSL
- ADDED: Database connection dialog redesigned
- ADDED: #63 Ctrl+Enter runs query
- ADDED: Published dbgate NPM package
- ADDED: SQL editor context menu
- FIX: #62 - import, export executed from SNAP installs didn't work

### 3.9.5
- Start point of changelog
