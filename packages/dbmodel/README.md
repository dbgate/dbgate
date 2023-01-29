# dbmodel
Deploy, load or build script from model of SQL database. Can be used as command-line tool. Uses [DbGate](https://dbgate.org) tooling and plugins for connecting many different databases.

If you want to use this tool from JavaScript interface, please use [dbgate-api](https://www.npmjs.com/package/dbgate-api) package.

Model is stored as a collection of files:
* tables - stored as YAML files
  * columns
  * indexes
  * primary keys
  * foreign keys
* views - stored as SQL file with extension **.view.sql**
* stored procedures - stored as SQL file with extension **.proc.sql**
* functions - stored as SQL file with extension **.func.sql**

## Installation - as global tool

    npm install --global dbmodel

## Installation - as regular package

    npm install --save dbmodel

## Available commands
* **load** - loads structure of database, saves it to local directory (called *project*). Also can download data of enlisted tables (use --load-data-condition options)
* **deploy** - deploys structure from local directory (*project*) to database. *Deploy does not perform any actions leading to data loss, these changes must be made manually.*
  * creates not existing tables
  * creates not existing columns of existing tables
  * checks column NULL/NOT NULL flag, alters colums
  * checks tables, which are in database, but not in project, list of these tables are reported
  * checks columns, which are in database, but not in project, list of these columns are reported
  * checks indexes and its definitions, indexes are created or recreated, if neccessary (*but not deleted*)
  * checks and creates foreign keys
  * checks, creates new or changes existing views, stored procedures and functions
  * updates and creates static data (included in table yaml files)
* **build** - builds script from project folder. This operation is complete offline, no database connection is needed. Built script makes subset of deploy command. It can be executed on empty database, but also it can convert existing database to current structure (but only using operations below).
  * creates not existing tables
  * creates not existing columns of existing tables
  * creates not existing indexes (checked only by name)
  * creates not existing foreign keys
  * creates new or changes existing views, stored procedures and functions
  * updates and creates static data (included in table yaml files)

## Command line interface

```sh
# load from existing database
dbmodel load -s localhost -u USERNAME -p PASSWORD -d DATABASE -e mssql@dbgate-plugin-mssql OUTPUT_FOLDER

# deploy project to database
dbmodel deploy -s localhost -u USERNAME -p PASSWORD -d DATABASE -e mssql@dbgate-plugin-mssql PROJECT_FOLDER

# build SQL script from project
dbmodel build -e mssql@dbgate-plugin-mssql PROJECT_FOLDER OUTPUT_FILE.sql
```

Parameter -e (or --engine) specifies database dialect and connection driver to be used
Supported databases:
- MySQL - `-e mysql@dbgate-plugin-mysql`
- MS SQL Server - `-e mssql@dbgate-plugin-mssql`
- PostgreSQL - `-e postgres@dbgate-plugin-postgres`
- SQLite - `-e sqlite@dbgate-plugin-sqlite`
- Oracle - `-e oracle@dbgate-plugin-oracle`
- MariaDB - `-e mariadb@dbgate-plugin-mysql`
- CockroachDB - `-e cockroach@dbgate-plugin-postgres`
- Amazon Redshift - `-e redshift@dbgate-plugin-postgres`


## Table yaml file documentation

```yaml
name: Album # table name
columns:
  - name: AlbumId # column name
    type: int # data type. is used directly in target SQL engine 
    autoIncrement: true # column is autoincrement
    notNull: true # column is not nullable (default: is nullable)
  - name: Title
    type: nvarchar
    length: 160 # maximum character length
    notNull: true
  - name: ArtistId
    type: int
    references: Artist # name of table. Is used for creating foreign key
  - name: isDeleted
    type: bit
    notNull: true
    default: 0 # default value
primaryKey:
  - AlbumId # list of primary key column names
indexes:
  - name: UQ_AlbumTitleArtistId # index name
    unique: true # whether index is unique. default=false
    columns: # list of index columns
      - Title
      - ArtistId
    filter: isDeleted=0 # if defined, filtered index (with WHERE condition) is created
    continueOnError: true # if true and there was error in creating this index, continue (suitable for lately added unique indexes)
data: # static data (only for list tables)
  - AlbumId: -1 # values for all columns, which should be filled
    Title: Predefined static album
```
