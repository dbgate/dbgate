[![NPM version](https://img.shields.io/npm/v/dbgate.svg)](https://www.npmjs.com/package/dbgate)
[![dbgate](https://snapcraft.io/dbgate/badge.svg)](https://snapcraft.io/dbgate)
[![dbgate](https://snapcraft.io/dbgate/trending.svg?name=0)](https://snapcraft.io/dbgate)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/JanProchazkaCz/30eur)

# DbGate - database administration tool

DbGate modern, fast and easy to use database manager

* Try it online - [demo.dbgate.org](https://demo.dbgate.org) - online demo application
* Download application for Windows, Linux or Mac from [dbgate.org](https://dbgate.org/download/)
* Run web version as [NPM package](https://www.npmjs.com/package/dbgate) or as [docker image](https://hub.docker.com/r/dbgate/dbgate)

Supported databases:
* MySQL
* PostgreSQL
* SQL Server
* MongoDB

![Screenshot](https://raw.githubusercontent.com/dbgate/dbgate/master/screenshot.png)

## Features
* Connect to Microsoft SQL Server, Postgre SQL, MySQL, MongoDB
* Table data editing, with SQL change script preview
* Master/detail views
* Query designer
* Form view for comfortable work with tables with many columns
* JSON view on MognoDB collections
* Explore tables, views, procedures, functions, MongoDB collections
* SQL editor, execute SQL script, SQL code formatter, SQL code completion, SQL join wizard
* Mongo JavaScript editor, execute Mongo script (with NodeJs syntax)
* Runs as application for Windows, Linux and Mac. Or in Docker container on server and in web Browser on client.
* Import, export from/to CSV, Excel, JSON
* Free table editor - quick table data editing (cleanup data after import/before export, prototype tables etc.)
* Archives - backup your data in JSON files on local filesystem (or on DbGate server, when using web application)
* Light and dark theme
* Charts
* For detailed info, how to run DbGate in docker container, visit [docker hub](https://hub.docker.com/r/dbgate/dbgate)
* Extensible plugin architecture

## Why is DbGate different
There are many database managers now, so why DbGate? 
* Works everywhere - Windows, Linux, Mac, Web browser (+mobile web is planned), without compromises in features
* Based on standalone NPM packages, scripts can be run without DbGate (example - [CSV export](https://www.npmjs.com/package/dbgate-plugin-csv) )
* Many data browsing functions based using foreign keys - master/detail, expand columns, expandable form view (on screenshot above)

## Design goals
* Application simplicity - DbGate takes the best and only the best from old [DbGate](http://www.jenasoft.com/dbgate), [DatAdmin](http://www.jenasoft.com/datadmin) and [DbMouse](http://www.jenasoft.com/dbmouse) .
* Minimal dependencies
    * Frontend - Svelte, socket.io
    * Backend - NodeJs, ExpressJs, socket.io, database connection drivers
    * JavaScript + TypeScript
    * App - electron
    * There is plan to incorporate SQLite to support work with local datasets
* Platform independed - will run as web application in single docker container on server, or as application using Electron platform on Linux, Windows and Mac

## Plugins
Plugins are standard NPM packages published on [npmjs.com](https://www.npmjs.com).  
See all [existing DbGate plugins](https://www.npmjs.com/search?q=keywords:dbgateplugin).  
Visit [dbgate generator homepage](https://github.com/dbgate/generator-dbgate) to see, how to create your own plugin.  

Currently following extensions can be implemented using plugins:
- File format parsers/writers
- Database engine connectors

Basic set of plugins is part of DbGate git repository and is installed with app. Additional plugins pust be downloaded from NPM (this task is handled by DbGate)

## How to run development environment

```sh
yarn
yarn start
```

If you want to make modifications in libraries or plugins, run library compiler in watch mode in the second terminal:
```sh
yarn lib
```

Open http://localhost:5000 in your browser

You could run electron app (requires running localhost:5000):
```sh
cd app
yarn
yarn start
```

## How to run built electron app locally
This mode is very similar to production run of electron app. Electron app forks process with API on dynamically allocated port, works with compiled javascript files and uses compiled version of plugins (doesn't use localhost:5000)

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

* [api](https://github.com/dbgate/dbgate/tree/master/packages/api) - backend, Javascript, ExpressJS [![NPM version](https://img.shields.io/npm/v/dbgate-api.svg)](https://www.npmjs.com/package/dbgate-api)
* [datalib](https://github.com/dbgate/dbgate/tree/master/packages/datalib) - TypeScript library for utility classes [![NPM version](https://img.shields.io/npm/v/dbgate-datalib.svg)](https://www.npmjs.com/package/dbgate-datalib)
* [app](https://github.com/dbgate/dbgate/tree/master/app) - application (JavaScript) structure, creating specific queries (JavaScript)
* [filterparser](https://github.com/dbgate/dbgate/tree/master/packages/filterparser) - TypeScript library for parsing data filter expressions using parsimmon [![NPM version](https://img.shields.io/npm/v/dbgate-filterparser.svg)](https://www.npmjs.com/package/dbgate-filterparser)
* [sqltree](https://github.com/dbgate/dbgate/tree/master/packages/sqltree) - JSON representation of SQL query, functions converting to SQL (TypeScript) [![NPM version](https://img.shields.io/npm/v/dbgate-sqltree.svg)](https://www.npmjs.com/package/dbgate-sqltree)
* [types](https://github.com/dbgate/dbgate/tree/master/packages/types) - common TypeScript definitions [![NPM version](https://img.shields.io/npm/v/dbgate-types.svg)](https://www.npmjs.com/package/dbgate-types)
* [web](https://github.com/dbgate/dbgate/tree/master/packages/web) - frontend in Svelte (JavaScript) [![NPM version](https://img.shields.io/npm/v/dbgate-web.svg)](https://www.npmjs.com/package/dbgate-web)
* [tools](https://github.com/dbgate/dbgate/tree/master/packages/tools) - various tools [![NPM version](https://img.shields.io/npm/v/dbgate-tools.svg)](https://www.npmjs.com/package/dbgate-tools)

