# ChangeLog

Builds:
 - docker - build
 - npm - npm package dbgate-serve
 - app - classic electron app
 - mac - application for macOS
 - linux - application for linux
 - win - application for Windows

### 5.2.6
- FIXED: DbGate creates a lot of .tmp.node files in the temp directory #561
- FIXED: Typo in datetimeoffset dataType #556
- FIXED: SQL export is using the wrong hour formatting #537
- FIXED: Missing toolstrip and adds up to 200% zoom to diagram view #524
- FIXED: MongoDB password could contain special characters #560

### 5.2.5
- ADDED: Split Windows #394
- FIXED: Postgres index asc/desc #514
- FIXED: Excel export not working since 5.2.3 #511
- ADDED: Include macOS specific app icon #494
- FIXED: Resizing window resets window contents #479
- FIXED: Solved some minor problems with widget collapsing

### 5.2.4
- FIXED: npm version crash (#508)

### 5.2.3
- ADDED: Search entire table (multi column filter) #491
- ADDED: OracleDB - connection to toher than default ports #496
- CHANGED: OracleDB - status of support set to experimental
- FIXED: OracleDB database URL - fixes: Connect to default Oracle database #489
- ADDED: HTML, XML code highlighting for Edit cell value #485
- FIXED: Intellisense - incorrect alias after ORDER BY clause #484
- FIXED: Typo in SQL-Generator #481
- ADDED: Data duplicator #480
- FIXED: MongoDB - support for views #476
- FIXED: "SQL:CREATE TABLE" generated SQL default value syntax errors #455
- FIXED: Crash when right-clicking on tables #452
- FIXED: View sort #436
- ADDED: Arm64 version for Windows #473
- ADDED: Sortable query results and data archive
- CHANGED: Use transactions for saving table data
- CHANGED: Save table structure uses transactions
- ADDED: Table data editing - shows editing mark
- ADDED: Editing data archive files
- FIXED: Delete cascade options when using more than 2 tables
- ADDED: Save to current archive commands
- ADDED: Current archive mark is on status bar
- FIXED: Changed package used for parsing JSONL files when browsing - fixes backend freezing
- FIXED: SSL option for mongodb #504
- REMOVED: Data sheet editor
- FIXED: Creating SQLite autoincrement column
- FIXED: Better error reporting from exports/import/dulicator
- CHANGED: Optimalizede OracleDB analysing algorithm
- ADDED: Mutli column filter for perspectives
- FIXED: Fixed some scenarios using tables from different DBs
- FIXED: Sessions with long-running queries are not killed


### 5.2.2
- FIXED: Optimalized load DB structure for PostgreSQL #451
- ADDED: Auto-closing query connections after configurable (15 minutes default) no-activity interval #468
- ADDED: Set application-name connection parameter (for PostgreSQL and MS SQL) for easier identifying of DbGate connections
- ADDED: Filters supports binary IDs #467
- FIXED: Ctrl+Tab works (switching tabs) #457
- FIXED: Format code supports non-standard letters #450
- ADDED: New logging system, log to file, ability to reduce logging #360 (using https://www.npmjs.com/package/pinomin)
- FIXED: crash on Windows and Mac after system goes in suspend mode #458
- ADDED: dbmodel standalone NPM package (https://www.npmjs.com/package/dbmodel) - deploy database via commandline tool


### 5.2.1
- FIXED: client_id param in OAuth
- ADDED: OAuth scope parameter
- FIXED: login page - password was not sent, when submitting by pressing ENTER
- FIXED: Used permissions fix
- FIXED: Export modal - fixed crash when selecting different database

### 5.2.0
- ADDED: Oracle database support #380
- ADDED: OAuth authentification #407
- ADDED: Active directory (Windows) authentification #261
- ADDED: Ask database credentials when login to DB
- ADDED: Login form instead of simple authorization (simple auth is possible with special configuration)
- FIXED: MongoDB - connection uri regression
- ADDED: MongoDB server summary tab
- FIXED: Broken versioned tables in MariaDB #433
- CHANGED: Improved editor margin #422
- ADDED: Implemented camel case search in all search boxes
- ADDED: MonhoDB filter empty array, not empty array
- ADDED: Maximize button reflects window state
- ADDED: MongoDB - database profiler
- CHANGED: Short JSON values are shown directly in grid
- FIXED: Fixed filtering nested fields in NDJSON viewer
- CHANGED: Improved fuzzy search after Ctrl+P #246
- ADDED: MongoDB: Create collection backup
- ADDED: Single database mode
- ADDED: Perspective designer supports joins from MongoDB nested documents and arrays
- FIXED: Perspective designer joins on MongoDB ObjectId fields
- ADDED: Filtering columns in designer (query designer, diagram designer, perspective designer)
- FIXED: Clone MongoDB rows without _id attribute #404
- CHANGED: Improved cell view with GPS latitude, longitude fields
- ADDED: SQL: ALTER VIEW and SQL:ALTER PROCEDURE scripts
- ADDED: Ctrl+F5 refreshes data grid also with database structure #428
- ADDED: Perspective display modes: text, force text #439
- FIXED: Fixed file filters #445
- ADDED: Rename, remove connection folder, memoize opened state after app restart #425
- FIXED: Show SQLServer alter store procedure #435


### 5.1.6
- ADDED: Connection folders support #274
- ADDED: Keyboard shortcut to hide result window and show/hide the side toolbar #406
- ADDED: Ability to show/hide query results #406
- FIXED: Double click does not maximize window on MacOS #416
- FIXED: Some perspective rendering errors
- FIXED: Connection to MongoDB via database URL info SSH tunnel is used
- CHANGED: Updated windows code signing certificate
- ADDED: Query session cleanup (kill query sessions, if browser tab is closed)
- CHANGED: More strict timeouts to kill database and server connections (reduces resource consumption)

### 5.1.5
- ADDED: Support perspectives for MongoDB - MongoDB query designer
- ADDED: Show JSON content directly in the overview #395
- CHANGED: OSX Command H shortcut for hiding window #390
- ADDED: Uppercase Autocomplete Suggestions #389
- FIXED: Record view left/right arrows cause start record number to be treated as string #388
- FIXED: MongoDb ObjectId behaviour not consistent in nested objects #387
- FIXED: demo.dbgate.org - beta version crash 5.1.5-beta.3 #386
- ADDED: connect via socket - configurable via environment variables #358

### 5.1.4
- ADDED: Drop database commands #384
- ADDED: Customizable Redis key separator #379
- ADDED: ARM support for docker images
- ADDED: Version tags for docker images
- ADDED: Better SQL command splitting and highlighting
- ADDED: Unsaved marker for SQL files

### 5.1.3
- ADDED: Editing multiline cell values #378 #371 #359
- ADDED: Truncate table #333
- ADDED: Perspectives - show row count
- ADDED: Query - error markers in gutter area
- ADDED: Query - ability to execute query elements from gutter
- FIXED: Correct error line numbers returned from queries

### 5.1.2
- FIXED: MongoDb any export function does not work. #373
- ADDED: Query Designer short order more flexibility #372
- ADDED: Form View move between records #370
- ADDED: Custom SQL conditions in query designer and table filtering #369
- ADDED: Query Designer filter eq to X or IS NULL #368
- FIXED: Query designer, open a saved query lost sort order #363
- ADDED: Query designer reorder columns #362
- ADDED: connect via socket #358
- FIXED: Show affected rows after UPDATE/DELETE/INSERT #361
- ADDED: Perspective cell formatters - JSON, image
- ADDED: Perspectives - cells without joined data are gray

### 5.1.1
- ADDED: Perspective designer
- FIXED: NULL,NOT NULL filter datatime columns #356
- FIXED: Recognize computed columns on SQL server #354
- ADDED: Hotkey for clear filter #352
- FIXED: Change column type on Postgres #350
- ADDED: Ability to open qdesign file #349
- ADDED: Custom editor font size #345
- ADDED: Ability to open perspective files


### 5.1.0
- ADDED: Perspectives (docs: https://dbgate.org/docs/perspectives.html )
- CHANGED: Upgraded SQLite engine version (driver better-sqlite3: 7.6.2)
- CHANGED: Upgraded ElectronJS version (from version 13 to version 17)
- CHANGED: Upgraded all dependencies with current available minor version updates
- CHANGED: By default, connect on click #332˝
- CHANGED: Improved keyboard navigation, when editing table data #331
- ADDED:  Option to skip Save changes dialog #329
- FIXED: Unsigned column doesn't work correctly. #324
- FIXED: Connect to MS SQL with domain user now works also under Linux and Mac #305

### 5.0.9
- FIXED: Fixed problem with SSE events on web version
- ADDED: Added menu command "New query designer"
- ADDED: Added menu command "New ER diagram"

### 5.0.8
- ADDED: SQL Server - support using domain logins under Linux and Mac #305
- ADDED: Permissions for connections #318
- ADDED: Ability to change editor front #308
- ADDED: Custom expression in query designer #306
- ADDED: OR conditions in query designer #321
- ADDED: Ability to configure settings view environment variables #304
 
### 5.0.7
- FIXED: Fixed some problems with SSH tunnel (upgraded SSH client) #315
- FIXED: Fixed MognoDB executing find query #312
- ADDED: Interval filters for date/time columns #311
- ADDED: Ability to clone rows #309
- ADDED: connecting option Trust server certificate for SQL Server #305
- ADDED: Autorefresh, reload table every x second #303
- FIXED(app): Changing editor theme and font size in Editor Themes #300
 
### 5.0.6
- ADDED: Search in columns
- CHANGED: Upgraded mongodb driver
- ADDED: Ability to reset view, when data load fails
- FIXED: Filtering works for complex types (geography, xml under MSSQL)
- FIXED: Fixed some NPM package problems

### 5.0.5
- ADDED: Visualisation geographics objects on map #288
- ADDED: Support for native SQL as default value inside yaml files #296
- FIXED: Postgres boolean columns don't filter correctly #298
- FIXED: Importing dbgate-api as NPM package now works correctly
- FIXED: Handle error when reading deleted archive

### 5.0.3
- CHANGED: Optimalization of loading DB structure for PostgreSQL, MySQL #273
- CHANGED: Upgraded mysql driver #293
- CHANGED: Better UX when defining SSH port #291
- ADDED: Database object menu from tab 
- CHANGED: Ability to close file uploader
- FIXED: Correct handling of NUL values in update keys
- CHANGED: Upgraded MS SQL tedious driver
- ADDED: Change order of pinned tables & databases #227
- FIXED: #294 Statusbar doesn't match active tab
- CHANGED: Improved connection worklflow, disconnecting shws confirmations, when it leads to close any tabs
- ADDED: Configurable object actions #255
- ADDED: Multiple sort criteria #235
- ADDED(app): Open JSON file
### 5.0.2
- FIXED: Cannot use SSH Tunnel after update #291

### 5.0.1
- FIXED(app): Can't Click Sidebar Menu Item #287

### 5.0.0
- CHANGED: Connection workflow, connections are opened on tabs instead of modals
- ADDED: Posibility to connect to DB without saving connection
- ADDED(mac): Support for SQLite on Mac M1
- FIXED(mac): Unable to drag window on MacOS #281 #283
- CHANGED: Renamed dbgate-data directory to .dbgate #248
- FIXED: Exported SQL has table name undefined #277
- ADDED: More data types in table create dialogt #285
- ADDED(app): Open previously saved ERD diagrams #278
- CHANGED: Better app loading progress UX
- FIXED: Removed SSL tab on Redis connection (SSL is not supported for Redis)

### 4.8.8
- CHANGED: New app icon
- ADDED: SQL dump, SQL import - also from/to saved queries
- FIXED(mac): Fixed crash when reopening main window
- FIXED: MySQL dump now handles correctly dependand views
- FIXED(app): Browse tabs with Ctrl+Tab
- ADDED(app): Browse tabs in reverse order with Ctrl+Shift+Tab #245

### 4.8.7
- ADDED: MySQL dump/backup database
- ADDED: Import SQL dump from file or from URL
- FIXED(mac): Fixed Cmd+C, Cmd+V, Cmd+X - shortcuts for copy/cut/paste #270
- FIXED(mac): Some minor issues on macOS
- FIXED: Analysing MS SQL nvarchar(max)
- ADDED: Support for dockerhost network name under docker #271

### 4.8.4
- FIXED(mac): Fixed build for macOS arm64 #259
- FIXED(mac): Fixed opening SQLite files on macOS #243
- FIXED(mac): Fixed opening PEM certificates on macOS #206
- FIXED(mac): Fixed handling Command key on macOS
- FIXED(mac): Fixed system menu on macOS
- FIXED(mac): Fixed reopening main window on macOS
- CHANGED: Shortcut for net query is now Ctrl+T or Command+T on macOS, former it was Ctrl+Q
- FIXED: Fixed misplaced tab close icon #260
- ADDED: Added menu command "Tools/Change to recent database"

### 4.8.3
- FIXED: filters in query result and NDJSON/archive viewer
- ADDED: Added select values from query result and NDJSON/archive viewer
- ADDED: tab navigation in datagrid #254
- ADDED: Keyboard shortcuts added to help menu #254
- ADDED: API logging (run enableApiLog() in developers console to enable logging)
- ADDED: SSH reconnect + moved SSH forward into separate fork #253
- ADDED: Data type + reference link in column manager
- FIXED(win,linux,mac): Unable to change theme after installing plugin #244

 ### 4.8.2
 - ADDED: implemented missing redis search key logic

 ### 4.8.1
 - FIXED: fixed crash after disconnecting from all DBs

### 4.8.0
- ADDED: Redis support (support stream type), removed experimental status
- ADDED: Redis readonly support
- ADDED: Explicit NDJSON support, when opening NDJSON/JSON lines file, table data are immediately shown, without neccesarity to import
- ADDED(win,linux,mac): Opening developer tools when crashing without reload app
### 4.7.4
- ADDED: Experimental Redis support (full support is planned to version  4.8.0)
- ADDED: Read-only connections
- FIXED: MongoDB filters
- ADDED: MongoDB column value selection
- ADDED: App related queries
- ADDED: Fuzzy search #246
- ADDED(docker, npm): New permissions
- FIXED(npm): NPM build no longer allocates additonal ports
- CHANGED(npm): renamed NPM package dbgate => dbgate-serve 
- CHANGED(docker): custom JavaScripts and connections defined in scripts are now prohibited by default, use SHELL_CONNECTION and SHELL_SCRIPTING environment variables for allowing this
- ADDED(docker, npm): Better documentation of environment variables configuration, https://dbgate.org/docs/env-variables.html
- ADDED(docker): support for multiple users with different permissions
- ADDED(docker): logout operation

### 4.7.3
- CHANGED: Export menu redesign, quick export menu merged with old export menu
- REMOVED: Quick export menu
- ADDED: Export column mapping
- ADDED: Export invoked from data grid respects columns choosed in column manager
- ADDED: Quick export (now merged in export menu) is now possible also in web app
- FIXED: Virtual foreign key editor fixes
- FIXED: Tabs panel style fix
- ADDED: Find by schema in databases widget
- FIXED: Column manager selection fix
- FIXED: NPM dist - fixed error when loading plugins
- CHANGED: NPN dist is now executed by dbgate-serve command
- ADDED: NPM dist accepts .env configuration

### 4.7.2
- CHANGED: documentation URL - https://dbgate.org/docs/
- CHANGED: Close button available for all tab groups - #238
- ADDED: Search function for the Keyboard Shortcuts overview - #239
- ADDED: Editor font size settings - #229
- ADDED: Rename MongoDB collection - #223
- FIXED: bug in cache subsystem

### 4.7.1
- FIXED: Fixed connecting to MS SQL server running in docker container from DbGate running in docker container #236 
- FIXED: Fixed export MongoDB collections into Excel and CSV #240
- ADDED: Added support for docker volumes to persiste connections, when not using configuration via env variables #232
- ADDED: DbGate in Docker can run in subdirectory #228
- FIXED: DbGate in Docker can be proxied with nginx #228
- FIDED: Theme persists when opening multiple windows #207
- ADDED: Remember fullscreen state #230
- ADDED: Improved fullscreen state, title bar with menu is hidden, menu is in hamburger menu, like in web version
- ADDED: Theme choose dialog (added as tab in settings)
- FIXED: Fixed crash when clicking on application layers #231
### 4.7.0
- CHANGED: Changed main menu style, menu and title bar is in one line (+ability to switch to system menu)
- REMOVED: Removed main toolbar, use main menu or tab related bottom tool instead
- ADDED: Added tab related context bottom toolbar
- ADDED: Main menu is available also in web application, by clicking on hamburger menu
- ADDED: Added support of SQLite to docker container #219
- ADDED: Added Debian and Alpine docker distributions (default is Debian)
- FIXED: Fixed performance problem of data grid, especially when there are cells with large data (eg. JSONs), now it is much faster
- ADDED: Open JSON and array cell buttons
- ADDED: Handle JSON in varchar cells
- ADDED: Scroll tabs on mouse wheel
- ADDED: Show edit edit MySQL column comments #218 #81
- ADDED: Handle sparse (mssql), unsigned (mysql), zerofill (mysql) column flags
- FIXED: Fixed same caching problems (eg. leading to indefinitely loading DB structure sometimes)
- ADDED: Show estimated table row count for MySQL and MS SQL
- FIXED: Fixed deleting rows from added rows in table data editor
- ADDED: Better work with JSON lines file, added JSONL editor with preview

### 4.6.3
- FIXED: Fixed Windows build
- FIXED: Fixed crash, when there is invalid value in browser local storage
- FIXED: Fixed plugin description display, where author name or description is not correctly filled

### 4.6.2
- FIXED: Fixed issues of XML import plugin
- ADDED: Split columns macro (available in data sheet editor)
- CHANGED: Accepting non standard plugins names (which doesn't start with dbgate-plugin-)
- ADDED: Support BLOB values #211
- ADDED: Picture cell view
- ADDED: HTML cell view
- CHANGED: Code completion supports non-default schema names
- FIXED: More robust MySQL analyser, when connecting to non-standard servers #214
- FIXED: Fixed configuring connection to SQLite with environment variables #215

### 4.6.1
- ADDED: Ability to configure SSH tunnel over environment variables #210 (for docker container)
- ADDED: XML export and import
- ADDED: Archive file - show and edit source text file
- ADDED: Window title shows current tab and database
- ADDED: DbGate documentation
- ADDED: Introduced application layers
- ADDED: Virtual foreign key editor
- ADDED: Application commands (SQL scripts related to database)
- ADDED: Theme can be implemented in plugin
- CHANGED: Dictionary description is stored in app
- FIXED: Unique and index editor
- FIXED: Posibility to edit UNIQUE index flag
- CHANGED: UX improvements of table editor

### 4.6.0
- ADDED: ER diagrams #118
    - Generate diagram from table or for database
    - Automatic layout
    - Diagram styles - colors, select columns to display, optional displaying data type or nullability
    - Export diagram to HTML file
- FIXED: Mac latest build link #204

### 4.5.1
- FIXED: MongoId detection
- FIXED: #203 disabled spellchecker
- FIXED: Prevented display filters in form view twice
- FIXED: Query designer fixes

### 4.5.0
- ADDED: #220 functions, materialized views and stored procedures in code completion
- ADDED: Query result in statusbar
- ADDED: Highlight and execute current query
- CHANGED: Code completion offers objects only from current query
- CHANGED: Big optimalizations of electron app - removed embedded web server, removed remote module, updated electron to version 13
- CHANGED: Removed dependency to electron-store module
- FIXED: #201 fixed database URL definition, when running from Docvker container
- FIXED: #192 Docker container stops in 1 second, ability to stop container with Ctrl+C
- CHANGED: Web app - websocket replaced with SSE technology
- CHANGED: Changed tab order, tabs are ordered by creation time
- ADDED: Reorder tabs with drag & drop
- CHANGED: Collapse left column in datagrid - removed from settings, remember last used state
- ADDED: Ability to select multiple columns in column manager in datagrid + copy column names
- ADDED: Show used filters in left datagrid column
- FIXED: Fixed delete dependency cycle detection (delete didn't work for some tables)

### 4.4.4
- FIXED: Database colors
- CHANGED: Precise work with MongoDB ObjectId
- FIXED: Run macro works on MongoDB collection data editor
- ADDED: Type conversion macros
- CHANGED: Improved UX of import into current database or current archive
- ADDED: Posibility to create string MongoDB IDs when importing into MongoDB collections
- CHANGED: Better crash recovery
- FIXED: Context menu of data editor when using views - some commands didn't work for views
- ADDED: Widget lists (on left side) now supports add operation, where it has sense
- CHANGED: Improved UX of saved data sheets
- ADDED: deploy - preloadedRows: impelemnted onsertOnly columns
- ADDED: Show change log after app upgrade

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
