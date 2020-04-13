[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/donate-paypal-blue.svg)](https://paypal.me/JanProchazkaCz/30eur)

# DbGate - database administration tool

DbGate is complete rewrite of JenaSoft [DbGate](http://www.jenasoft.com/dbgate). It uses JavaScript and TypeScript (original DbGate was written in C# and TypeScript). 

Part of this software is also port of [DbShell](https://github.com/dbshell/dbshell) from C# to JavaScript

## Design goals
* Application simplicity - DbGate takes the best and only the best from old DbGate, [DatAdmin](http://www.jenasoft.com/datadmin) and [DbMouse](http://www.jenasoft.com/dbmouse) . First will be implemented the most used features from this software.
* Minimal dependencies - so that the software can be developed in future without problems with obsolete libraries
    * Frontend - React, styled-components, socket.io
    * Backend - NodeJs, ExpressJs, socket.io, database connection drivers
    * JavaScript + TypeScript
* Platform independed - will run as web application in single docker container on server, or as application using Electron platform on Linux, Windows and Mac

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

## Packages
* api - backend, Javascript, ExpressJS
* datalib - TypeScript library for utility classes
* electron - application (JavaScript)
* engines - drivers for database engine (mssql, mysql, postgres), analysing database structure, creating specific queries (JavaScript)
* filterparser - TypeScript library for parsing data filter expressions using parsimmon
* sqltree - JSON representation of SQL query, functions converting to SQL (TypeScript)
* types - common TypeScript definitions
* web - frontend in React (JavaScript)

![Screenshot]
(https://raw.githubusercontent.com/dbshell/dbgate/master/screenshot.png)
