[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/JanProchazkaCz/30eur)
[![NPM version](https://img.shields.io/npm/v/dbgate-api.svg)](https://www.npmjs.com/package/dbgate-api)

# DbGate - database administration tool

DbGate is fast and efficient database administration tool. It is focused to work with data (filtering, editing, master/detail views etc.)

**Try it online** - https://demo.dbgate.org - online demo application

## Features
* Support for Microsoft SQL Server, Postgre SQL, MySQL
* Table data browsing - filtering, sorting, related columns using foreign keys
* Master/detail views
* Browsing objects - tables, views, procedures, functions
* Table data editing, with SQL change script preview
* SQL editor, execute SQL script, SQL code formatter, SQL code completion, SQL join wizard
* Runs as application for Windows, Linux and Mac. Or in Docker container on server and in web Browser on client.
* Import, export from/to CSV, Excel, JSON
* Free table editor - quick table data editing (cleanup data after import/before export, prototype tables etc.)
* Archives - backup your data in JSON files on local filesystem (or on DbGate server, when using web application)
* Light and dark theme
* For detailed info, how to run DbGate in docker container, visit [docker hub](https://hub.docker.com/r/dbgate/dbgate)
* Extensible plugin architecture

![Screenshot](https://raw.githubusercontent.com/dbshell/dbgate/master/screenshot.png)

## Design goals
* Application simplicity - DbGate takes the best and only the best from old [DbGate](http://www.jenasoft.com/dbgate), [DatAdmin](http://www.jenasoft.com/datadmin) and [DbMouse](http://www.jenasoft.com/dbmouse) .
* Minimal dependencies
    * Frontend - React, styled-components, socket.io
    * Backend - NodeJs, ExpressJs, socket.io, database connection drivers
    * JavaScript + TypeScript
    * App - electron
    * There is plan to incorporate SQLite to support work with local datasets
* Platform independed - will run as web application in single docker container on server, or as application using Electron platform on Linux, Windows and Mac

## Plugins
Plugins are standard NPM packages published on [npmjs.com](https://www.npmjs.com).  
See all [existing DbGate plugins](https://www.npmjs.com/search?q=keywords:dbgateplugin).  
Visit [dbgate generator homepage](https://github.com/dbshell/generator-dbgate) to see, how to create your own plugin.  

Currently following extensions can be implemented using plugins:
- File format parsers/writers
- Database engine connectors

## How Can I Contribute?
You're welcome to contribute to this project! Below are some ideas, how to contribute:

* Create plugins for new import/export formats
* Bug fixing
* Test Mac edition
* Improve linux package build, add to APT repository
* Auto-upgrade of electron application

Any help is appreciated!

Feel free to report issues and open merge requests.

## Roadmap

| Feature | Complexity | Schedule |
|---|---|---|
| Query designer | medium | december 2020 |
| Table designer (structure editor) | big | january 2021 |
| Filter SQL result sets | small | november 2020 |
| Filtering, sorting in free table editor | small | november 2020 |
| Using tedious driver instead of mssql | small | january 2021 |
| Support for SQLite | big | 2021 |

## How to run development environment

```sh
yarn
yarn start
```

If you want to make modifications in TypeScript packages, run TypeScript compiler in watch mode in seconds terminal:
```sh
yarn lib
```

Open http://localhost:5000 in your browser

You could run electron app, using this server:
```sh
cd app
yarn
yarn start
```

## How to run built electron app locally
This mode is very similar to production run of electron app. Electron app forks process with API on dynamically allocated port, works with compiled javascript files.

```sh
cd app
yarn
```

```sh
yarn
yarn build:app:local
yarn start:app:local
```

## Packages
Some dbgate packages can be used also without DbGate. You can find them on [NPM repository](https://www.npmjs.com/search?q=keywords:dbgate)

* [api](https://github.com/dbshell/dbgate/tree/master/packages/api) - backend, Javascript, ExpressJS [![NPM version](https://img.shields.io/npm/v/dbgate-api.svg)](https://www.npmjs.com/package/dbgate-api)
* [datalib](https://github.com/dbshell/dbgate/tree/master/packages/datalib) - TypeScript library for utility classes
* [app](https://github.com/dbshell/dbgate/tree/master/app) - application (JavaScript)
structure, creating specific queries (JavaScript) [![NPM version](https://img.shields.io/npm/v/dbgate-engines.svg)](https://www.npmjs.com/package/dbgate-engines)
* [filterparser](https://github.com/dbshell/dbgate/tree/master/packages/filterparser) - TypeScript library for parsing data filter expressions using parsimmon
* [sqltree](https://github.com/dbshell/dbgate/tree/master/packages/sqltree) - JSON representation of SQL query, functions converting to SQL (TypeScript) [![NPM version](https://img.shields.io/npm/v/dbgate-sqltree.svg)](https://www.npmjs.com/package/dbgate-sqltree)
* [types](https://github.com/dbshell/dbgate/tree/master/packages/types) - common TypeScript definitions [![NPM version](https://img.shields.io/npm/v/dbgate-types.svg)](https://www.npmjs.com/package/dbgate-types)
* [web](https://github.com/dbshell/dbgate/tree/master/packages/web) - frontend in React (JavaScript)
* [tools](https://github.com/dbshell/dbgate/tree/master/packages/tools) - various tools [![NPM version](https://img.shields.io/npm/v/dbgate-tools.svg)](https://www.npmjs.com/package/dbgate-tools)

