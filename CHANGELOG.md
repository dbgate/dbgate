# ChangeLog

### 4.2.6
 - Fixed MongoDB import
 - Configurable thousands separator #136
 - Using case insensitive text search in postgres

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
