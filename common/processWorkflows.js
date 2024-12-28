const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');

const indir = path.resolve(path.join(__dirname, '..', 'workflow-templates'));
const outdir = path.resolve(path.join(__dirname, '..', '.github', 'workflows'));

const includes = {};

function readIncludes() {
  for (const file of fs.readdirSync(indir)) {
    const text = fs.readFileSync(path.join(indir, file), { encoding: 'utf-8' });
    const json = yaml.load(text);
    if (json._module) {
      for (const key in json) {
        if (key === '_module') {
          continue;
        }
        includes[key] = json[key];
      }
    }
  }
}

let modified = false;

function conditionMatch(condition, args) {
  if (_.isString(condition)) {
    return args.key == condition;
  }
  return false;
}

function processJsonStep(json, args) {
  return _.cloneDeepWith(json, value => {
    if (_.isArray(value)) {
      const res = [];
      for (const item of value) {
        if (item._if) {
          modified = true;
          if (conditionMatch(item._if, args)) {
            res.push(_.omit(item, ['_if']));
          }
        } else {
          res.push(item);
        }
      }
      return res;
    }

    if (value?.run && _.isArray(value.run)) {
      const newrun = [];
      for (const item of value.run) {
        let replaced = false;
        for (const repl of args.run) {
          if (item == repl.from) {
            replaced = true;
            modified = true;
            newrun.push(...repl.to);
            break;
          }
        }
        if (!replaced) {
          newrun.push(item);
        }
      }
      return {
        ...value,
        run: newrun,
      };
    }

    if (_.isPlainObject(value)) {
      if (_.intersection(args.allNames ?? [], Object.keys(value))?.length > 0) {
        modified = true;
        return value[args.key];
      }
    }

    if (value?._include) {
      return includes[value?._include];
    }
  });
}

function processJson(json, args = {}) {
  const MAX_STEPS = 64;
  for (let i = 0; i < MAX_STEPS; i++) {
    modified = false;
    json = processJsonStep(json, args);
    if (!modified) {
      break;
    }
  }
  return json;
}

function processFiles() {
  for (const file of fs.readdirSync(indir)) {
    const text = fs.readFileSync(path.join(indir, file), { encoding: 'utf-8' });
    const json = yaml.load(text);

    if (json._module) {
      continue;
    }

    if (json._templates) {
      for (const key in json._templates) {
        const allNames = Object.keys(json._templates);
        const args = {
          key,
          run: json._templates[key],
          allNames,
        };
        const converted = processJson(_.omit(json, ['_templates']), args);
        const out = path.join(outdir, json._templates[key].file);
        fs.writeFileSync(out, yaml.dump(converted));
      }
    } else {
      fs.writeFileSync(path.join(outdir, file), yaml.dump(processJson(json)));
    }
  }
}

function deleteOldFiles() {
  const files = fs.readdirSync(outdir);
  for (const file of files) {
    fs.unlinkSync(path.join(outdir, file));
  }
}

function run() {
  deleteOldFiles();
  readIncludes();
  processFiles();
}

run();
