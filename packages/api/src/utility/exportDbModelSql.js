const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { mkdirp } = require('mkdirp');

async function exportDbModelSql(dbModel, driver, outputDir, outputFile) {
  const { tables, views, procedures, functions, triggers, matviews } = dbModel;

  async function writeLists(writeList) {
    await writeList(views, 'views');
    await writeList(procedures, 'procedures');
    await writeList(functions, 'functions');
    await writeList(triggers, 'triggers');
    await writeList(matviews, 'matviews');
  }

  if (outputFile) {
    const dmp = driver.createDumper();
    for (const table of tables || []) {
      dmp.createTable({
        ...table,
        foreignKeys: [],
        dependencies: [],
      });
    }
    for (const table of tables || []) {
      for (const fk of table.foreignKeys || []) {
        dmp.createForeignKey(fk);
      }
    }
    writeLists((list, folder) => {
      for (const obj of list || []) {
        dmp.createSqlObject(obj);
      }
    });

    const script = dmp.s;
    await fs.writeFile(outputFile, script);
  }

  if (outputDir) {
    await mkdirp(path.join(outputDir, 'tables'));
    for (const table of tables || []) {
      const dmp = driver.createDumper();
      dmp.createTable({
        ...table,
        foreignKeys: [],
        dependencies: [],
      });
      await fs.writeFile(path.join(outputDir, 'tables', `${table.pureName}.sql`), dmp.s);
    }

    await writeLists(async (list, folder) => {
      if (list.length > 0) {
        await mkdirp(path.join(outputDir, folder));
      }
      for (const obj of list || []) {
        const dmp = driver.createDumper();
        dmp.createSqlObject(obj);
        await fs.writeFile(path.join(outputDir, folder, `${obj.pureName}.sql`), dmp.s);
      }
    });
  }
}

module.exports = exportDbModelSql;
