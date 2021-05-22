[![NPM version](https://img.shields.io/npm/v/dbgate.svg)](https://www.npmjs.com/package/dbgate)
![GitHub All Releases](https://img.shields.io/github/downloads/dbgate/dbgate/total) 
[![dbgate](https://snapcraft.io/dbgate/badge.svg)](https://snapcraft.io/dbgate)
[![dbgate](https://snapcraft.io/dbgate/trending.svg?name=0)](https://snapcraft.io/dbgate)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

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
* SQLite
* Amazon Redshift
* CockroachDB
* MariaDB

![Screenshot](https://raw.githubusercontent.com/dbgate/dbgate/master/screenshot.png)

## Features
* Table data editing, with SQL change script preview
* Light and dark theme
* Master/detail views
* Query designer
* Form view for comfortable work with tables with many columns
* JSON view on MongoDB collections
* Explore tables, views, procedures, functions, MongoDB collections
* SQL editor
  * execute SQL script
  * SQL code formatter
  * SQL code completion
  * Add SQL LEFT/INNER/RIGHT join utility
* Mongo JavaScript editor, execute Mongo script (with NodeJs syntax)
* Runs as application for Windows, Linux and Mac. Or in Docker container on server and in web Browser on client.
* Import, export from/to CSV, Excel, JSON
* Free table editor - quick table data editing (cleanup data after import/before export, prototype tables etc.)
* Archives - backup your data in JSON files on local filesystem (or on DbGate server, when using web application)
* Charts
* For detailed info, how to run DbGate in docker container, visit [docker hub](https://hub.docker.com/r/dbgate/dbgate)
* Extensible plugin architecture

## How to contribute
Any contributions are welcome. If you want to contribute without coding, consider following:
* Create issue, if you find problem in app, or you have idea to new feature. If issue already exists, you could leave comment on it, to prioritise most wanted issues.
* Tell your friends about DbGate or share on social networks - when more people will use DbGate, it will grow to be better

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

