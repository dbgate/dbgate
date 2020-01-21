# DbGate - database administration tool

DbGate is complete rewrite of JenaSoft [DbGate](http://www.jenasoft.com/dbgate). It uses only JavaScript (original DbGate was written in C# and TypeScript). 

Part of this software is also port of [DbShell](https://github.com/dbshell/dbshell) from C# to JavaScript

## Design goals
* Application simplicity - DbGate takes the best and only the best from old DbGate, [DatAdmin](http://www.jenasoft.com/datadmin) and [DbMouse](http://www.jenasoft.com/dbmouse) . First will be implemented the most used features from this software.
* Minimal dependencies - so that the software can be developed in future without problems with obsolete libraries
    * Frontend - React, styled-components, socket.io
    * Backend - NodeJs, ExpressJs, socket.io, database connection drivers
    * Pure JavaScript is used (TypeScript is used only as type checker, not as compiler, so it is not mandatory part of pipeline)
* Platform independed - will run as web application in single docker container on server, or as application using Electron platform on Linx, Windows and Mac

## How to run development environment

In one terminal, run API:
```sh
cd api
yarn
yarn start
```

In second terminal, run frontend:
```sh
cd web
yarn
yarn start
```

Open http://localhost:5000 in your browser
