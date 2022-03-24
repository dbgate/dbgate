#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

global.API_PACKAGE = path.dirname(path.dirname(require.resolve('dbgate-api')));
global.PLUGINS_DIR = path.dirname(global.API_PACKAGE);
global.IS_NPM_DIST = true;

const dbgateApi = require('dbgate-api');

dbgateApi.getMainModule().start();
