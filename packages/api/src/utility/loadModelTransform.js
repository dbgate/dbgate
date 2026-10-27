const { filesdir } = require('./directories');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const dbgateApi = require('../shell');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { checkSecureFilePathsWithoutDirectory } = require('./security');
const logger = getLogger('loadModelTransform');

// a model transform file names shell API functions that are called with its arguments - only
// the model transforms (dataTypeMapperTransform, ...), never other functions such as runScript
function isModelTransformName(name) {
  return typeof name == 'string' && /Transform$/.test(name) && typeof dbgateApi[name] == 'function';
}

function modelTransformFromJson(json) {
  if (!isModelTransformName(json?.transform)) return null;
  const creator = dbgateApi[json.transform];
  return creator(...json.arguments);
}

async function loadModelTransform(file) {
  if (!file) return null;
  if (typeof file != 'string' || !checkSecureFilePathsWithoutDirectory(file)) {
    logger.warn('DBGM-00000 Refused model transform outside the modtrans folder');
    return null;
  }
  try {
    const dir = filesdir();
    const fullPath = path.join(dir, 'modtrans', file);
    const text = await fs.readFile(fullPath, { encoding: 'utf-8' });
    const json = JSON.parse(text);
    if (_.isArray(json)) {
      const array = _.compact(json.map(x => modelTransformFromJson(x)));
      return array.length ? structure => array.reduce((acc, val) => val(acc), structure) : null;
    }
    if (_.isPlainObject(json)) {
      return modelTransformFromJson(json);
    }
    return null;
  } catch (err) {
    logger.error(extractErrorLogData(err), `DBGM-00173 Error loading model transform ${file}`);
    return null;
  }
}

module.exports = loadModelTransform;
