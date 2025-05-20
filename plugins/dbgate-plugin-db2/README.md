# DbGate DB2 Plugin

DB2 database plugin for [DbGate](https://dbgate.org).

## Installation

This plugin is part of the standard DbGate installation. If you need to install it manually, follow these steps:

```shell
yarn plugin dbgate-plugin-db2
```

or

```shell
npm install dbgate-plugin-db2
```

## Features

- Connect to IBM DB2 databases
- Execute SQL queries
- Browse database objects (tables, views, procedures)
- Import/export data
- Query designer support
- Support for DB2 specific data types and functions

## Configuration

To connect to a DB2 database, you'll need the following information:

- Server name/IP address
- Port number (default: 50000)
- Database name
- Username
- Password

## Requirements

- Node.js 14 or higher
- IBM DB2 database
