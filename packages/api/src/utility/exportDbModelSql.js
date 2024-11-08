const fs = require('fs-extra');
const path = require('path');
const { getSchemasUsedByStructure } = require('dbgate-tools');

async function exportDbModelSql(dbModel, driver, outputDir, outputFile) {
  const { tables, views, procedures, functions, triggers, matviews } = dbModel;

  const usedSchemas = getSchemasUsedByStructure(dbModel);
  const useSchemaDir = usedSchemas.length > 1;

  const createdDirs = new Set();
  async function ensureDir(dir) {
    if (!createdDirs.has(dir)) {
      await fs.mkdir(dir, { recursive: true });
      createdDirs.add(dir);
    }
  }

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
    for (const table of tables || []) {
      const tablesDir = useSchemaDir
        ? path.join(outputDir, table.schemaName ?? 'default', 'tables')
        : path.join(outputDir, 'tables');
      await ensureDir(tablesDir);
      const dmp = driver.createDumper();
      dmp.createTable({
        ...table,
        foreignKeys: [],
        dependencies: [],
      });
      await fs.writeFile(path.join(tablesDir, `${table.pureName}.sql`), dmp.s);
    }

    await writeLists(async (list, folder) => {
      for (const obj of list || []) {
        const objdir = useSchemaDir
          ? path.join(outputDir, obj.schemaName ?? 'default', folder)
          : path.join(outputDir, folder);
        await ensureDir(objdir);
        const dmp = driver.createDumper();
        dmp.createSqlObject(obj);
        await fs.writeFile(path.join(objdir, `${obj.pureName}.sql`), dmp.s);
      }
    });
  }
}

module.exports = exportDbModelSql;
