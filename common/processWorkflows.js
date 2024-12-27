const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const indir = path.resolve(path.join(__dirname, '..', 'workflow-templates'));
const outdir = path.resolve(path.join(__dirname, '..', 'workflow-templates'));

const includes = {};

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

for (const file of fs.readdirSync(indir)) {
  const text = fs.readFileSync(path.join(indir, file), { encoding: 'utf-8' });
  const json = yaml.load(text);

  if (json._module) {
    continue;
  }

  if (json._templates) {
    for (const template of json._templates) {
      const outfile = template.file;
      const text = template.text;
      const json = template.json;
      const out = path.join(outdir, name);
      fs.writeFileSync(out, text);
    }


  }
}
