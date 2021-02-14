#!/usr/bin/env node

const dbgateApi = require('dbgate-api');

global.dbgateApiModulePath = require.resolve('dbgate-api');

dbgateApi.getMainModule().start('startNodeWeb');
