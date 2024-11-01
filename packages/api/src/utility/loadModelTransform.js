const { filesdir } = require('./directories');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const dbgateApi = require('../shell');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('loadModelTransform');

function modelTransformFromJson(json) {
  const { transform, arguments } = json;
  if (!dbgateApi[transform]) return null;
  const creator = dbgateApi[transform];
  return creator(...arguments);
}

async function loadModelTransform(file) {
  if (!file) return null;
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
    logger.error(extractErrorLogData(err), `Error loading model transform ${file}`);
    return null;
  }
}

module.exports = loadModelTransform;
