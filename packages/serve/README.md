[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![NPM version](https://img.shields.io/npm/v/dbgate.svg)](https://www.npmjs.com/package/dbgate)

# DbGate - database administration tool
DbGate is cross-platform database manager. 
It's designed to be simple to use and effective, when working with more databases simultaneously.
But there are also many advanced features like schema compare, visual query designer, chart visualisation or batch export and import.

## Supported databases
* MySQL
* PostgreSQL
* SQL Server
* Oracle
* MongoDB
* Redis
* SQLite
* Amazon Redshift (Premium)
* CockroachDB
* MariaDB
* CosmosDB (Premium)
* ClickHouse

## Community vs Premium
This package has 2 variants:
* [dbgate-serve](https://www.npmjs.com/package/dbgate-serve) - Community edition (free and open source)
* [dbgate-serve-premium](https://www.npmjs.com/package/dbgate-serve-premium) - Premium edition (commercial)

## Install using npm - premium edition
```sh
npm install -g dbgate-serve-premium
```

DbGate is configure via environment variables. In this package, you could use .env files with configuration of DbGate. .env file is loaded in working directory. 

.env file could look like following:
```
STORAGE_SERVER=localhost
STORAGE_USER=root
STORAGE_PASSWORD=mypassword
STORAGE_DATABASE=dbname
STORAGE_ENGINE=mysql@dbgate-plugin-mysql
```

You could find more about environment variable configuration on [DbGate docs](https://dbgate.org/docs/env-variables/) page.

After installing, you can run dbgate with command:
```sh
dbgate-serve-premium
```

Then open http://localhost:3000 in your browser

## Install using npm - community edition
```sh
npm install -g dbgate-serve
```

After installing, you can run dbgate with command:
```sh
dbgate-serve
```

.env file could be used in the same way as in Premium edition, without STORAGE_xxx variables, which are specific for Premium.

Then open http://localhost:3000 in your browser

## Download desktop app
You can also download binary packages for desktop app from https://dbgate.org . Or run from source code, as described on [github](https://github.com/dbgate/dbgate)

## Use Oracle with Instant client (thick mode)
If you are Oracle database user and you would like to use Oracle instant client (thick mode) instead of thin mode (pure JS NPM package), please make the following:
* Download Oracle instant client - https://www.oracle.com/cz/database/technologies/instant-client/downloads.html
* Unpack it somewhere (og. /opt/oracle in Linux systems)
* Configure ORACLE_INSTANT_CLIENT variable - should contain directory name of unpacked Instant client

If you don't know, whether you will need Instance client, please use this [table](https://node-oracledb.readthedocs.io/en/latest/user_guide/appendix_a.html) of features,
which are supported only in thick mode (with instant client). Eg. thin mode works from Oracle 12, if you have older Oracle server, you will need to install Oracle Instant client.

## Other dbgate packages
You can use some functionality of dbgate from your JavaScript code. See [dbgate-api](https://npmjs.com/dbgate-api) package.

## Screenshot

![Screenshot](https://raw.githubusercontent.com/dbgate/dbgate/master/screenshot.png)
