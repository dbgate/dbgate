const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');

const indir = path.resolve(path.join(__dirname, '..', 'workflow-templates'));
const outdir = path.resolve(path.join(__dirname, '..', '.github', 'workflows'));

const includes = {};

const HEADER = `# --------------------------------------------------------------------------------------------
# This file is generated. Do not edit manually
# --------------------------------------------------------------------------------------------
`;

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
    return args.defs.includes(condition);
  }
  return false;
}

function processJsonStep(json, args) {
  return _.cloneDeepWith(json, value => {
    if (_.isArray(value)) {
      const res = [];
      let arrayModified = false;
      for (const item of value) {
        if (item._if) {
          modified = true;
          arrayModified = true;
          if (conditionMatch(item._if, args)) {
            res.push(_.omit(item, ['_if']));
          }
        } else if (item._replace || item._include) {
          const replaceWith = item._replace ? args.replace?.[item._replace] : includes[item._include];
          if (replaceWith) {
            modified = true;
            arrayModified = true;
            if (_.isArray(replaceWith)) {
              res.push(...replaceWith);
            } else {
              res.push(replaceWith);
            }
          } else {
            res.push(item);
          }
        } else {
          res.push(item);
        }
      }
      if (arrayModified) {
        return res;
      }
      return undefined;
    }

    if (_.isPlainObject(value)) {
      if (_.intersection(args.allDefs ?? [], Object.keys(value))?.length > 0) {
        modified = true;
        for (const key in value) {
          if (args.defs.includes(key)) {
            return value[key];
          }
        }
        return undefined;
      }
    }

    if (_.isString(value)) {
      let stringModified = false;
      for (const key of Object.keys(args.stringReplace ?? {})) {
        if (value.includes(key)) {
          modified = true;
          stringModified = true;
          value = value.replaceAll(key, args.stringReplace[key]);
        }
      }
      if (stringModified) {
        return value;
      }
      return undefined;
    }

    if (value?._include) {
      modified = true;
      return includes[value?._include];
    }

    if (value?._replace) {
      modified = true;
      return args?.replace[value?._replace];
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
  const dumpOptions = {
    lineWidth: -1,
  };
  for (const file of fs.readdirSync(indir)) {
    const text = fs.readFileSync(path.join(indir, file), { encoding: 'utf-8' });
    const json = yaml.load(text);

    if (json._module) {
      continue;
    }

    if (json._templates) {
      const allDefs = Object.keys(json._templates);
      for (const key in json._templates) {
        allDefs.push(...(json._templates[key].defs ?? []));
      }

      for (const key in json._templates) {
        const args = {
          defs: [key, ...(json._templates[key]?.defs ?? [])],
          replace: json._templates[key]?.replace,
          stringReplace: json._templates[key]?.['string-replace'],
          allDefs,
        };
        const converted = processJson(_.omit(json, ['_templates']), args);
        const out = path.join(outdir, json._templates[key].file);
        fs.writeFileSync(out, HEADER + yaml.dump(converted, dumpOptions));
      }
    } else {
      fs.writeFileSync(path.join(outdir, file), HEADER + yaml.dump(processJson(json), dumpOptions));
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
