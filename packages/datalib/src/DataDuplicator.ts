import {
  createAsyncWriteStream,
  extractErrorLogData,
  getLogger,
  runCommandOnDriver,
  runQueryOnDriver,
} from 'dbgate-tools';
import { DatabaseInfo, EngineDriver, ForeignKeyInfo, TableInfo } from 'dbgate-types';
import _pick from 'lodash/pick';
import _omit from 'lodash/omit';

const logger = getLogger('dataDuplicator');

export interface DataDuplicatorItem {
  openStream: () => Promise<ReadableStream>;
  name: string;
  operation: 'copy' | 'lookup' | 'insertMissing';
  matchColumns: string[];
}

export interface DataDuplicatorOptions {
  rollbackAfterFinish?: boolean;
  skipRowsWithUnresolvedRefs?: boolean;
  setNullForUnresolvedNullableRefs?: boolean;
}

class DuplicatorReference {
  constructor(
    public base: DuplicatorItemHolder,
    public ref: DuplicatorItemHolder,
    public isMandatory: boolean,
    public foreignKey: ForeignKeyInfo
  ) {}

  get columnName() {
    return this.foreignKey.columns[0].columnName;
  }
}

class DuplicatorWeakReference {
  constructor(public base: DuplicatorItemHolder, public ref: TableInfo, public foreignKey: ForeignKeyInfo) {}

  get columnName() {
    return this.foreignKey.columns[0].columnName;
  }
}

class DuplicatorItemHolder {
  references: DuplicatorReference[] = [];
  backReferences: DuplicatorReference[] = [];
  // not mandatory references to entities out of the model
  weakReferences: DuplicatorWeakReference[] = [];
  table: TableInfo;
  isPlanned = false;
  idMap = {};
  autoColumn: string;
  refByColumn: { [columnName: string]: DuplicatorReference } = {};
  isReferenced: boolean;

  get name() {
    return this.item.name;
  }

  constructor(public item: DataDuplicatorItem, public duplicator: DataDuplicator) {
    this.table = duplicator.db.tables.find(x => x.pureName.toUpperCase() == item.name.toUpperCase());
    this.autoColumn = this.table.columns.find(x => x.autoIncrement)?.columnName;
    if (
      this.table.primaryKey?.columns?.length != 1 ||
      this.table.primaryKey?.columns?.[0]?.columnName != this.autoColumn
    ) {
      this.autoColumn = null;
    }
  }

  initializeReferences() {
    for (const fk of this.table.foreignKeys) {
      if (fk.columns?.length != 1) continue;
      const refHolder = this.duplicator.itemHolders.find(y => y.name.toUpperCase() == fk.refTableName.toUpperCase());
      const isMandatory = this.table.columns.find(x => x.columnName == fk.columns[0]?.columnName)?.notNull;
      if (refHolder == null) {
        if (!isMandatory) {
          const weakref = new DuplicatorWeakReference(
            this,
            this.duplicator.db.tables.find(x => x.pureName == fk.refTableName),
            fk
          );
          this.weakReferences.push(weakref);
        }
      } else {
        const newref = new DuplicatorReference(this, refHolder, isMandatory, fk);
        this.references.push(newref);
        this.refByColumn[newref.columnName] = newref;

        refHolder.isReferenced = true;
      }
    }
  }

  createInsertObject(chunk, weakrefcols: string[]) {
    const res = _omit(
      _pick(
        chunk,
        this.table.columns.map(x => x.columnName)
      ),
      [this.autoColumn, ...this.backReferences.map(x => x.columnName), ...weakrefcols]
    );

    for (const key in res) {
      const ref = this.refByColumn[key];
      if (ref) {
        // remap id
        res[key] = ref.ref.idMap[res[key]];
        if (ref.isMandatory && res[key] == null) {
          // mandatory refertence not matched
          if (this.duplicator.options.skipRowsWithUnresolvedRefs) {
            return null;
          }
          throw new Error(`Unresolved reference, base=${ref.base.name}, ref=${ref.ref.name}, ${key}=${chunk[key]}`);
        }
      }
    }

    return res;
  }

  // returns list of columns that are weak references and are not resolved
  async getMissingWeakRefsForRow(row): Promise<string[]> {
    if (!this.duplicator.options.setNullForUnresolvedNullableRefs || !this.weakReferences?.length) {
      return [];
    }

    const qres = await runQueryOnDriver(this.duplicator.pool, this.duplicator.driver, dmp => {
      dmp.put('^select ');
      dmp.putCollection(',', this.weakReferences, weakref => {
        dmp.put(
          '(^case ^when ^exists (^select * ^from %f where %i = %v) ^then 1 ^else 0 ^end) as %i',
          weakref.ref,
          weakref.foreignKey.columns[0].refColumnName,
          row[weakref.foreignKey.columns[0].columnName],
          weakref.foreignKey.columns[0].columnName
        );
      });
      if (this.duplicator.driver.dialect.requireFromDual) {
        dmp.put(' ^from ^dual');
      }
    });
    const qrow = qres.rows[0];
    return this.weakReferences.filter(x => qrow[x.columnName] == 0).map(x => x.columnName);
  }

  async runImport() {
    const readStream = await this.item.openStream();
    const driver = this.duplicator.driver;
    const pool = this.duplicator.pool;
    let inserted = 0;
    let mapped = 0;
    let missing = 0;
    let skipped = 0;
    let lastLogged = new Date();

    const existingWeakRefs = {};

    const writeStream = createAsyncWriteStream(this.duplicator.stream, {
      processItem: async chunk => {
        if (chunk.__isStreamHeader) {
          return;
        }

        const doCopy = async () => {
          // console.log('chunk', this.name, JSON.stringify(chunk));
          const weakrefcols = await this.getMissingWeakRefsForRow(chunk);
          const insertedObj = this.createInsertObject(chunk, weakrefcols);
          // console.log('insertedObj', this.name, JSON.stringify(insertedObj));
          if (insertedObj == null) {
            skipped += 1;
            return;
          }
          let res = await runQueryOnDriver(pool, driver, dmp => {
            dmp.put(
              '^insert ^into %f (%,i) ^values (%,v)',
              this.table,
              Object.keys(insertedObj),
              Object.values(insertedObj)
            );

            if (
              this.autoColumn &&
              this.isReferenced &&
              !this.duplicator.driver.dialect.requireStandaloneSelectForScopeIdentity
            ) {
              dmp.selectScopeIdentity(this.table);
            }
          });
          inserted += 1;
          if (this.autoColumn && this.isReferenced) {
            if (this.duplicator.driver.dialect.requireStandaloneSelectForScopeIdentity) {
              res = await runQueryOnDriver(pool, driver, dmp => dmp.selectScopeIdentity(this.table));
            }
            // console.log('IDRES', JSON.stringify(res));
            // console.log('*********** ENTRIES OF', res?.rows?.[0]);
            const resId = Object.entries(res?.rows?.[0])?.[0]?.[1];
            if (resId != null) {
              this.idMap[chunk[this.autoColumn]] = resId;
            }
          }
        };

        switch (this.item.operation) {
          case 'copy': {
            await doCopy();
            break;
          }
          case 'insertMissing':
          case 'lookup': {
            const res = await runQueryOnDriver(pool, driver, dmp =>
              dmp.put(
                '^select %i ^from %f ^where %i = %v',
                this.autoColumn,
                this.table,
                this.item.matchColumns[0],
                chunk[this.item.matchColumns[0]]
              )
            );
            const resId = Object.entries(res?.rows?.[0])?.[0]?.[1];
            if (resId != null) {
              mapped += 1;
              this.idMap[chunk[this.autoColumn]] = resId;
            } else if (this.item.operation == 'insertMissing') {
              await doCopy();
            } else {
              missing += 1;
            }
            break;
          }
        }

        if (new Date().getTime() - lastLogged.getTime() > 5000) {
          logger.info(
            `Duplicating ${this.item.name} in progress, inserted ${inserted} rows, mapped ${mapped} rows, missing ${missing} rows, skipped ${skipped} rows`
          );
          lastLogged = new Date();
        }
        // this.idMap[oldId] = newId;
      },
    });

    await this.duplicator.copyStream(readStream, writeStream);

    // await this.duplicator.driver.writeQueryStream(this.duplicator.pool, {
    //   mapResultId: (oldId, newId) => {
    //     this.idMap[oldId] = newId;
    //   },
    // });

    return { inserted, mapped, missing, skipped };
  }
}

export class DataDuplicator {
  itemHolders: DuplicatorItemHolder[];
  itemPlan: DuplicatorItemHolder[] = [];

  constructor(
    public pool: any,
    public driver: EngineDriver,
    public db: DatabaseInfo,
    public items: DataDuplicatorItem[],
    public stream,
    public copyStream: (input, output) => Promise<void>,
    public options: DataDuplicatorOptions = {}
  ) {
    this.itemHolders = items.map(x => new DuplicatorItemHolder(x, this));
    this.itemHolders.forEach(x => x.initializeReferences());
  }

  findItemToPlan(): DuplicatorItemHolder {
    for (const item of this.itemHolders) {
      if (item.isPlanned) continue;
      if (item.references.every(x => x.ref.isPlanned)) {
        return item;
      }
    }
    for (const item of this.itemHolders) {
      if (item.isPlanned) continue;
      if (item.references.every(x => x.ref.isPlanned || !x.isMandatory)) {
        const backReferences = item.references.filter(x => !x.ref.isPlanned);
        item.backReferences = backReferences;
        return item;
      }
    }
    throw new Error('Cycle in mandatory references');
  }

  createPlan() {
    while (this.itemPlan.length < this.itemHolders.length) {
      const item = this.findItemToPlan();
      item.isPlanned = true;
      this.itemPlan.push(item);
    }
  }

  async run() {
    this.createPlan();

    await runCommandOnDriver(this.pool, this.driver, dmp => dmp.beginTransaction());
    try {
      for (const item of this.itemPlan) {
        const stats = await item.runImport();
        logger.info(
          `Duplicated ${item.name}, inserted ${stats.inserted} rows, mapped ${stats.mapped} rows, missing ${stats.missing} rows, skipped ${stats.skipped} rows`
        );
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), `Failed duplicator job, rollbacking. ${err.message}`);
      await runCommandOnDriver(this.pool, this.driver, dmp => dmp.rollbackTransaction());
      return;
    }
    if (this.options.rollbackAfterFinish) {
      logger.info('Rollbacking transaction, nothing was changed');
      await runCommandOnDriver(this.pool, this.driver, dmp => dmp.rollbackTransaction());
    } else {
      logger.info('Committing duplicator transaction');
      await runCommandOnDriver(this.pool, this.driver, dmp => dmp.commitTransaction());
    }
  }
}
