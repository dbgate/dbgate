#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

global.dbgateApiModulePath = path.dirname(path.dirname(require.resolve('dbgate-api')));
global.dbgateApiPackagedPluginsPath = path.dirname(global.dbgateApiModulePath);

const dbgateApi = require('dbgate-api');

dbgateApi.getMainModule().start();
