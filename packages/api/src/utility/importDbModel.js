const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { tableInfoFromYaml, DatabaseAnalyser } = require('dbgate-tools');
const { startsWith } = require('lodash');
const { archivedir } = require('./directories');

async function importDbModel(inputDir) {
  const tablesYaml = [];

  const model = DatabaseAnalyser.createEmptyStructure();

  const dir = inputDir.startsWith('archive:')
    ? path.join(archivedir(), inputDir.substring('archive:'.length))
    : inputDir;

  for (const file of await fs.readdir(dir)) {
    if (file.endsWith('.table.yaml') || file.endsWith('.sql')) {
      const content = await fs.readFile(path.join(dir, file), { encoding: 'utf-8' });

      if (file.endsWith('.table.yaml')) {
        const json = yaml.load(content);
        tablesYaml.push(json);
      }

      if (file.endsWith('.view.sql')) {
        model.views.push({
          pureName: file.slice(0, -'.view.sql'.length),
          createSql: content,
          columns: [],
        });
      }

      if (file.endsWith('.matview.sql')) {
        model.matviews.push({
          pureName: file.slice(0, -'.matview.sql'.length),
          createSql: content,
          columns: [],
        });
      }

      if (file.endsWith('.proc.sql')) {
        model.procedures.push({
          pureName: file.slice(0, -'.proc.sql'.length),
          createSql: content,
        });
      }

      if (file.endsWith('.func.sql')) {
        model.functions.push({
          pureName: file.slice(0, -'.func.sql'.length),
          createSql: content,
        });
      }

      if (file.endsWith('.trigger.sql')) {
        model.triggers.push({
          pureName: file.slice(0, -'.trigger.sql'.length),
          createSql: content,
        });
      }
    }
  }

  model.tables = tablesYaml.map(table => tableInfoFromYaml(table, tablesYaml));

  return model;
}

module.exports = importDbModel;
