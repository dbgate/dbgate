const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { tableInfoToYaml } = require('dbgate-tools');

async function exportDbModel(dbModel, outputDir) {
  const { tables, views, procedures, functions, triggers, matviews } = dbModel;

  if (!fs.existsSync(outputDir)) {
    await fs.mkdir(outputDir);
  }

  for (const table of tables || []) {
    const content = yaml.dump(tableInfoToYaml(table));
    await fs.writeFile(path.join(outputDir, `${table.pureName}.table.yaml`), content);
  }

  async function writeList(list, ext) {
    for (const obj of list || []) {
      await fs.writeFile(path.join(outputDir, `${obj.pureName}.${ext}.sql`), obj.createSql);
    }
  }

  await writeList(views, 'view');
  await writeList(procedures, 'proc');
  await writeList(functions, 'func');
  await writeList(triggers, 'trigger');
  await writeList(matviews, 'matview');
}

module.exports = exportDbModel;
