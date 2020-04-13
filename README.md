[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/JanProchazkaCz/30eur)

# DbGate - database administration tool

DbGate is fast and efficiend database administration tool. It uses JavaScript and TypeScript. 

## Currently implemented features
* Browsing objects - tables, views, procedures, functions
* Support for Microsoft SQL Server, Postgre SQL, MySQL
* Table data browsing - filtering, sorting, adding related columns using foreign keys
* Table data editing, with SQL change script preview
* SQL editor, execute SQL script
* Runs as application for Windows and Linux. (in future possibly on Mac - colaborators needed)

![Screenshot](https://raw.githubusercontent.com/dbshell/dbgate/master/screenshot.png)

## Design goals
* Application simplicity - DbGate takes the best and only the best from old [DbGate](http://www.jenasoft.com/dbgate), [DatAdmin](http://www.jenasoft.com/datadmin) and [DbMouse](http://www.jenasoft.com/dbmouse) . First will be implemented the most used features from this software.
* Minimal dependencies - so that the software can be developed in future without problems with obsolete libraries
    * Frontend - React, styled-components, socket.io
    * Backend - NodeJs, ExpressJs, socket.io, database connection drivers
    * JavaScript + TypeScript
* Platform independed - will run as web application in single docker container on server, or as application using Electron platform on Linux, Windows and Mac

## How Can I Contribute?
You're welcome to contribute to this project! Especially with these topics:

* Mac support. App is build using electron, without native modules, so it should be very easy to build app for Mac
* Styles, graphics
* Better MySQL, Postgre SQL support
* Github actions for publishing releases

Any help is appreciated!

Feel free to report issues and open merge requests.

## How to run development environment

```sh
yarn
yarn start
```

If you want to make modifications in typescript packages, run TypeScript compiler in watch mode in seconds terminal:
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
* api - backend, Javascript, ExpressJS
* datalib - TypeScript library for utility classes
* electron - application (JavaScript)
* engines - drivers for database engine (mssql, mysql, postgres), analysing database structure, creating specific queries (JavaScript)
* filterparser - TypeScript library for parsing data filter expressions using parsimmon
* sqltree - JSON representation of SQL query, functions converting to SQL (TypeScript)
* types - common TypeScript definitions
* web - frontend in React (JavaScript)
