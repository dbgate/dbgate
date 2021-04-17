#!/usr/bin/env node

const path = require('path');
const dbgateApi = require('dbgate-api');

global.dbgateApiModulePath = require.resolve('dbgate-api');
global.dbgateApiPackagedPluginsPath = path.dirname(global.dbgateApiModulePath);

dbgateApi.getMainModule().start();
