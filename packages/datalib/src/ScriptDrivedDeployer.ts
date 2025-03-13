import { DatabaseModelFile, extractErrorLogData, getLogger, runCommandOnDriver, runQueryOnDriver } from 'dbgate-tools';
import { EngineDriver } from 'dbgate-types';
import _sortBy from 'lodash/sortBy';

const logger = getLogger('ScriptDrivedDeployer');

interface DeployScriptJournalItem {
  id: number;
  name: string;
  category: string;
  first_run_date: string;
  last_run_date: string;
  script_hash: string;
}

export class ScriptDrivedDeployer {
  predeploy: DatabaseModelFile[] = [];
  uninstall: DatabaseModelFile[] = [];
  install: DatabaseModelFile[] = [];
  once: DatabaseModelFile[] = [];
  postdeploy: DatabaseModelFile[] = [];
  isEmpty = false;

  journalItems: DeployScriptJournalItem[] = [];

  constructor(public dbhan: any, public driver: EngineDriver, public files: DatabaseModelFile[], public crypto: any) {
    this.predeploy = files.filter(x => x.name.endsWith('.predeploy.sql'));
    this.uninstall = files.filter(x => x.name.endsWith('.uninstall.sql'));
    this.install = files.filter(x => x.name.endsWith('.install.sql'));
    this.once = files.filter(x => x.name.endsWith('.once.sql'));
    this.postdeploy = files.filter(x => x.name.endsWith('.postdeploy.sql'));
    this.isEmpty =
      this.predeploy.length === 0 &&
      this.uninstall.length === 0 &&
      this.install.length === 0 &&
      this.once.length === 0 &&
      this.postdeploy.length === 0;
  }

  async loadJournalItems() {
    try {
      const { rows } = await runQueryOnDriver(this.dbhan, this.driver, dmp =>
        dmp.put('select * from ~dbgate_deploy_journal')
      );
      this.journalItems = rows;
      logger.debug(`Loaded ${rows.length} items from DbGate deploy journal`);
    } catch (err) {
      logger.warn(
        extractErrorLogData(err),
        'Error loading DbGate deploy journal, creating table dbgate_deploy_journal'
      );
      const dmp = this.driver.createDumper();
      dmp.createTable({
        pureName: 'dbgate_deploy_journal',
        columns: [
          { columnName: 'id', dataType: 'int', autoIncrement: true, notNull: true, pureName: 'dbgate_deploy_journal' },
          { columnName: 'name', dataType: 'varchar(100)', notNull: true, pureName: 'dbgate_deploy_journal' },
          { columnName: 'category', dataType: 'varchar(100)', notNull: true, pureName: 'dbgate_deploy_journal' },
          { columnName: 'script_hash', dataType: 'varchar(100)', notNull: true, pureName: 'dbgate_deploy_journal' },
          { columnName: 'first_run_date', dataType: 'varchar(100)', notNull: true, pureName: 'dbgate_deploy_journal' },
          { columnName: 'last_run_date', dataType: 'varchar(100)', notNull: true, pureName: 'dbgate_deploy_journal' },
          { columnName: 'run_count', dataType: 'int', notNull: true, pureName: 'dbgate_deploy_journal' },
        ],
        foreignKeys: [],
        primaryKey: {
          columns: [{ columnName: 'id' }],
          constraintType: 'primaryKey',
          pureName: 'dbgate_deploy_journal',
        },
      });
      await this.driver.query(this.dbhan, dmp.s, { discardResult: true });
    }
  }

  async runPre() {
    // don't create journal table if no scripts are present
    if (this.isEmpty) return;
    await this.loadJournalItems();
    await this.runFiles(this.predeploy, 'predeploy');
  }

  async runPost() {
    await this.runFiles(this.install, 'install');
    await this.runFiles(this.once, 'once');
    await this.runFiles(this.postdeploy, 'postdeploy');
  }

  async run() {
    await this.runPre();
    await this.runPost();
  }

  async runFiles(files: DatabaseModelFile[], category: string) {
    for (const file of _sortBy(files, x => x.name)) {
      await this.runFile(file, category);
    }
  }

  async saveToJournal(file: DatabaseModelFile, category: string, hash: string) {
    const existing = this.journalItems.find(x => x.name == file.name);
    if (existing) {
      await runCommandOnDriver(this.dbhan, this.driver, dmp => {
        dmp.put(
          'update ~dbgate_deploy_journal set ~last_run_date = %v, ~script_hash = %v, ~run_count = ~run_count + 1 where ~id = %v',
          new Date().toISOString(),
          hash,
          existing.id
        );
      });
    } else {
      await runCommandOnDriver(this.dbhan, this.driver, dmp => {
        dmp.put(
          'insert into ~dbgate_deploy_journal (~name, ~category, ~first_run_date, ~last_run_date, ~script_hash, ~run_count) values (%v, %v, %v, %v, %v, 1)',
          file.name,
          category,
          new Date().toISOString(),
          new Date().toISOString(),
          hash
        );
      });
    }
  }

  async runFileCore(file: DatabaseModelFile, category: string, hash: string) {
    if (this.driver.supportsTransactions) {
      runCommandOnDriver(this.dbhan, this.driver, dmp => dmp.beginTransaction());
    }

    logger.debug(`Running ${category} script ${file.name}`);
    try {
      await this.driver.script(this.dbhan, file.text, { useTransaction: false });
      await this.saveToJournal(file, category, hash);
    } catch (err) {
      logger.error(extractErrorLogData(err), `Error running ${category} script ${file.name}`);
      if (this.driver.supportsTransactions) {
        runCommandOnDriver(this.dbhan, this.driver, dmp => dmp.rollbackTransaction());
        return;
      }
    }

    if (this.driver.supportsTransactions) {
      runCommandOnDriver(this.dbhan, this.driver, dmp => dmp.commitTransaction());
    }
  }

  async runFile(file: DatabaseModelFile, category: string) {
    const hash = this.crypto.createHash('md5').update(file.text.trim()).digest('hex');
    const journalItem = this.journalItems.find(x => x.name == file.name);
    const isEqual = journalItem && journalItem.script_hash == hash;

    switch (category) {
      case 'predeploy':
      case 'postdeploy':
        await this.runFileCore(file, category, hash);
        break;
      case 'once':
        if (journalItem) return;
        await this.runFileCore(file, category, hash);
        break;
      case 'install':
        if (isEqual) return;
        const uninstallFile = this.uninstall.find(x => x.name == file.name.replace('.install.sql', '.uninstall.sql'));
        if (uninstallFile && journalItem) {
          // file was previously installed, uninstall first
          await this.runFileCore(
            uninstallFile,
            'uninstall',
            this.crypto.createHash('md5').update(uninstallFile.text.trim()).digest('hex')
          );
        }
        await this.runFileCore(file, category, hash);
        break;
    }
  }
}
