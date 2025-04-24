import {
  createAsyncWriteStream,
  extractErrorLogData,
  getLogger,
  isTypeNumber,
  runCommandOnDriver,
  runQueryOnDriver,
  SqlDumper,
} from 'dbgate-tools';
import { DatabaseInfo, EngineDriver, ForeignKeyInfo, NamedObjectInfo, QueryResult, TableInfo } from 'dbgate-types';
import _pick from 'lodash/pick';
import _omit from 'lodash/omit';
import stableStringify from 'json-stable-stringify';

const logger = getLogger('dataReplicator');

export interface DataReplicatorItem {
  openStream: () => Promise<ReadableStream>;
  name: string;
  findExisting: (row: any) => boolean;
  createNew: (row: any) => boolean;
  updateExisting: (row: any) => boolean;
  deleteMissing: boolean;
  deleteRestrictionColumns: string[];
  matchColumns: string[];
}

export interface DataReplicatorOptions {
  rollbackAfterFinish?: boolean;
  skipRowsWithUnresolvedRefs?: boolean;
  setNullForUnresolvedNullableRefs?: boolean;
  generateSqlScript?: boolean;
  runid?: string;
}

class ReplicatorReference {
  constructor(
    public base: ReplicatorItemHolder,
    public ref: ReplicatorItemHolder,
    public isMandatory: boolean,
    public foreignKey: ForeignKeyInfo
  ) {}

  get columnName() {
    return this.foreignKey.columns[0].columnName;
  }
}

class ReplicatorWeakReference {
  constructor(public base: ReplicatorItemHolder, public ref: TableInfo, public foreignKey: ForeignKeyInfo) {}

  get columnName() {
    return this.foreignKey.columns[0].columnName;
  }
}

class ReplicatorItemHolder {
  references: ReplicatorReference[] = [];
  backReferences: ReplicatorReference[] = [];
  // not mandatory references to entities out of the model
  weakReferences: ReplicatorWeakReference[] = [];
  table: TableInfo;
  isPlanned = false;
  idMap = {};
  autoColumn: string;
  isManualAutoColumn: boolean;
  refByColumn: { [columnName: string]: ReplicatorReference } = {};
  isReferenced: boolean;

  get name() {
    return this.item.name;
  }

  constructor(public item: DataReplicatorItem, public replicator: DataReplicator) {
    this.table = replicator.db.tables.find(x => x.pureName.toUpperCase() == item.name.toUpperCase());
    this.autoColumn = this.table.columns.find(x => x.autoIncrement)?.columnName;
    if (
      this.table.primaryKey?.columns?.length != 1 ||
      this.table.primaryKey?.columns?.[0]?.columnName != this.autoColumn
    ) {
      this.autoColumn = null;
    }
    if (!this.autoColumn && this.table.primaryKey?.columns?.length == 1) {
      const name = this.table.primaryKey.columns[0].columnName;
      const column = this.table.columns.find(x => x.columnName == name);
      if (isTypeNumber(column?.dataType)) {
        this.autoColumn = name;
        this.isManualAutoColumn = true;
      }
    }
    if (this.autoColumn && this.replicator.options.generateSqlScript) {
      this.isManualAutoColumn = true;
    }
  }

  initializeReferences() {
    for (const fk of this.table.foreignKeys) {
      if (fk.columns?.length != 1) continue;
      const refHolder = this.replicator.itemHolders.find(y => y.name.toUpperCase() == fk.refTableName.toUpperCase());
      const isMandatory = this.table.columns.find(x => x.columnName == fk.columns[0]?.columnName)?.notNull;
      if (refHolder == null) {
        if (!isMandatory) {
          const weakref = new ReplicatorWeakReference(
            this,
            this.replicator.db.tables.find(x => x.pureName == fk.refTableName),
            fk
          );
          this.weakReferences.push(weakref);
        }
      } else {
        const newref = new ReplicatorReference(this, refHolder, isMandatory, fk);
        this.references.push(newref);
        this.refByColumn[newref.columnName] = newref;

        refHolder.isReferenced = true;
      }
    }
  }

  createInsertObject(chunk, weakrefcols?: string[]) {
    const res = _omit(
      _pick(
        chunk,
        this.table.columns.map(x => x.columnName)
      ),
      [this.autoColumn, ...this.backReferences.map(x => x.columnName), ...(weakrefcols ? weakrefcols : [])]
    );

    for (const key in res) {
      const ref = this.refByColumn[key];
      if (ref) {
        // remap id
        const oldId = res[key];
        res[key] = ref.ref.idMap[oldId];
        if (ref.isMandatory && res[key] == null) {
          // mandatory refertence not matched
          if (this.replicator.options.skipRowsWithUnresolvedRefs) {
            return null;
          }
          throw new Error(`Unresolved reference, base=${ref.base.name}, ref=${ref.ref.name}, ${key}=${chunk[key]}`);
        }
      }
    }

    return res;
  }

  createUpdateObject(chunk) {
    const res = _omit(
      _pick(
        chunk,
        this.table.columns.map(x => x.columnName)
      ),
      [this.autoColumn, ...this.backReferences.map(x => x.columnName), ...this.references.map(x => x.columnName)]
    );

    return res;
  }

  // returns list of columns that are weak references and are not resolved
  async getMissingWeakRefsForRow(row): Promise<string[]> {
    if (!this.replicator.options.setNullForUnresolvedNullableRefs || !this.weakReferences?.length) {
      return [];
    }

    const qres = await runQueryOnDriver(this.replicator.pool, this.replicator.driver, dmp => {
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
      if (this.replicator.driver.dialect.requireFromDual) {
        dmp.put(' ^from ^dual');
      }
    });
    const qrow = qres.rows[0];
    return this.weakReferences.filter(x => qrow[x.columnName] == 0).map(x => x.columnName);
  }

  async runImport() {
    const readStream = await this.item.openStream();
    const driver = this.replicator.driver;
    const pool = this.replicator.pool;
    let inserted = 0;
    let mapped = 0;
    let updated = 0;
    let deleted = 0;
    let missing = 0;
    let skipped = 0;
    let lastLogged = new Date();

    const { deleteMissing, deleteRestrictionColumns } = this.item;
    const deleteRestrictions = {};
    const usedKeyRows = {};

    const writeStream = createAsyncWriteStream(this.replicator.stream, {
      processItem: async chunk => {
        if (chunk.__isStreamHeader) {
          return;
        }

        const doFind = async () => {
          let insertedObj = this.createInsertObject(chunk);

          const res = await runQueryOnDriver(pool, driver, dmp => {
            dmp.put('^select %i ^from %f ^where ', this.autoColumn, this.table);
            dmp.putCollection(' and ', this.item.matchColumns, x => {
              dmp.put('%i = %v', x, insertedObj[x]);
            });
          });
          const resId = Object.entries(res?.rows?.[0] || {})?.[0]?.[1];
          if (resId != null) {
            mapped += 1;
            this.idMap[chunk[this.autoColumn]] = resId;
          }
          return resId;
        };

        const doUpdate = async recordId => {
          const updateObj = this.createUpdateObject(chunk);
          if (Object.keys(updateObj).length == 0) {
            skipped += 1;
            return;
          }

          await this.replicator.runDumperCommand(dmp => {
            dmp.put('^update %f ^ set ', this.table);
            dmp.putCollection(',', Object.keys(updateObj), x => {
              dmp.put('%i = %v', x, updateObj[x]);
            });
            dmp.put(' ^where %i = %v', this.autoColumn, recordId);
            dmp.endCommand();
          });
          updated += 1;
        };

        const doInsert = async () => {
          // console.log('chunk', this.name, JSON.stringify(chunk));
          const weakrefcols = await this.getMissingWeakRefsForRow(chunk);
          let insertedObj = this.createInsertObject(chunk, weakrefcols);
          // console.log('insertedObj', this.name, JSON.stringify(insertedObj));
          if (insertedObj == null) {
            skipped += 1;
            return;
          }

          if (this.isManualAutoColumn) {
            const maxId = await this.replicator.generateIdentityValue(this.autoColumn, this.table);
            insertedObj = {
              ...insertedObj,
              [this.autoColumn]: maxId,
            };
            this.idMap[chunk[this.autoColumn]] = maxId;
          }

          let res = await this.replicator.runDumperQuery(dmp => {
            dmp.put(
              '^insert ^into %f (%,i) ^values (%,v)',
              this.table,
              Object.keys(insertedObj),
              Object.values(insertedObj)
            );
            dmp.endCommand();

            if (
              this.autoColumn &&
              this.isReferenced &&
              !this.replicator.driver.dialect.requireStandaloneSelectForScopeIdentity &&
              !this.isManualAutoColumn
            ) {
              dmp.selectScopeIdentity(this.table);
            }
          });
          inserted += 1;
          if (this.autoColumn && this.isReferenced && !this.isManualAutoColumn) {
            if (this.replicator.driver.dialect.requireStandaloneSelectForScopeIdentity) {
              res = await runQueryOnDriver(pool, driver, dmp => dmp.selectScopeIdentity(this.table));
            }
            // console.log('IDRES', JSON.stringify(res));
            // console.log('*********** ENTRIES OF', res?.rows?.[0]);
            const resId = Object.entries(res?.rows?.[0])?.[0]?.[1];
            if (resId != null) {
              this.idMap[chunk[this.autoColumn]] = resId;
            }
            return resId;
          }
        };

        const doMarkDelete = () => {
          const insertedObj = this.createInsertObject(chunk);
          if (deleteRestrictionColumns?.length > 0) {
            const restriction = _pick(insertedObj, deleteRestrictionColumns);
            const key = stableStringify(restriction);
            deleteRestrictions[key] = restriction;
          }

          const usedKey = _pick(insertedObj, this.item.matchColumns);
          usedKeyRows[stableStringify(usedKey)] = usedKey;
        };

        const findExisting = this.item.findExisting(chunk);
        const updateExisting = this.item.updateExisting(chunk);
        const createNew = this.item.createNew(chunk);

        if (deleteMissing) {
          doMarkDelete();
        }

        let recordId = null;
        if (findExisting) {
          recordId = await doFind();
        }

        if (updateExisting && recordId != null) {
          await doUpdate(recordId);
        }

        if (createNew && recordId == null) {
          recordId = await doInsert();
        }

        if (recordId == null && findExisting) {
          missing += 1;
        }

        if (new Date().getTime() - lastLogged.getTime() > 5000) {
          logger.info(
            `Replicating ${this.item.name} in progress, inserted ${inserted} rows, mapped ${mapped} rows, missing ${missing} rows, skipped ${skipped} rows, updated ${updated} rows`
          );
          lastLogged = new Date();
        }
        // this.idMap[oldId] = newId;
      },
    });

    const dumpConditionArray = (dmp: SqlDumper, array: any[], positive: boolean) => {
      dmp.putCollection(positive ? ' or ' : ' and ', array, x => {
        dmp.put('(');
        dmp.putCollection(positive ? ' and ' : ' or ', Object.keys(x), y => {
          dmp.put(positive ? '%i = %v' : 'not (%i = %v)', y, x[y]);
        });
        dmp.put(')');
      });
    };
    const dumpDeleteCondition = (dmp: SqlDumper) => {
      const deleteRestrictionValues = Object.values(deleteRestrictions);
      const usedKeyRowsValues = Object.values(usedKeyRows);

      if (deleteRestrictionValues.length == 0 && usedKeyRowsValues.length == 0) {
        return;
      }

      dmp.put(' ^where ');
      if (deleteRestrictionColumns?.length > 0) {
        dmp.put('(');
        dumpConditionArray(dmp, deleteRestrictionValues, true);
        dmp.put(')');
        if (usedKeyRowsValues.length > 0) {
          dmp.put(' ^and ');
        }
      }
      dumpConditionArray(dmp, Object.values(usedKeyRows), false);
    };
    const doDelete = async () => {
      const countRes = await runQueryOnDriver(pool, driver, dmp => {
        dmp.put('^select count(*) as ~cnt ^from %f', this.table);
        dumpDeleteCondition(dmp);
        dmp.endCommand();
      });
      const count = parseInt(countRes.rows[0].cnt);
      if (count > 0) {
        await this.replicator.runDumperCommand(dmp => {
          dmp.put('^delete ^from %f', this.table);
          dumpDeleteCondition(dmp);
          dmp.endCommand();
        });
        deleted += count;
      }
    };

    await this.replicator.copyStream(readStream, writeStream, {});

    if (deleteMissing) {
      await doDelete();
    }

    // await this.replicator.driver.writeQueryStream(this.replicator.pool, {
    //   mapResultId: (oldId, newId) => {
    //     this.idMap[oldId] = newId;
    //   },
    // });

    return { inserted, mapped, missing, skipped, updated, deleted };
  }
}

export class DataReplicator {
  itemHolders: ReplicatorItemHolder[];
  itemPlan: ReplicatorItemHolder[] = [];
  result: string = '';
  dumper: SqlDumper;
  identityValues: { [fullTableName: string]: number } = {};

  constructor(
    public pool: any,
    public driver: EngineDriver,
    public db: DatabaseInfo,
    public items: DataReplicatorItem[],
    public stream,
    public copyStream: (input, output, options) => Promise<void>,
    public options: DataReplicatorOptions = {}
  ) {
    this.itemHolders = items.map(x => new ReplicatorItemHolder(x, this));
    this.itemHolders.forEach(x => x.initializeReferences());
    // @ts-ignore
    this.dumper = driver.createDumper();
  }

  findItemToPlan(): ReplicatorItemHolder {
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

  async runDumperCommand(cmd: (dmp: SqlDumper) => void | string): Promise<void> {
    if (this.options.generateSqlScript) {
      cmd(this.dumper);
    } else {
      await runCommandOnDriver(this.pool, this.driver, cmd);
    }
  }

  async runDumperQuery(cmd: (dmp: SqlDumper) => void | string): Promise<QueryResult> {
    if (this.options.generateSqlScript) {
      cmd(this.dumper);
      return {
        rows: [],
      };
    } else {
      return await runQueryOnDriver(this.pool, this.driver, cmd);
    }
  }

  async generateIdentityValue(column: string, table: NamedObjectInfo): Promise<number> {
    const tableKey = `${table.schemaName}.${table.pureName}`;
    if (!(tableKey in this.identityValues)) {
      const max = await runQueryOnDriver(this.pool, this.driver, dmp => {
        dmp.put('^select max(%i) as ~maxid ^from %f', column, table);
      });
      const maxId = Math.max(max.rows[0]['maxid'] ?? 0, 0) + 1;
      this.identityValues[tableKey] = maxId;
      return maxId;
    }

    this.identityValues[tableKey] += 1;
    return this.identityValues[tableKey];
  }

  async run() {
    this.createPlan();

    await this.runDumperCommand(dmp => dmp.beginTransaction());
    try {
      for (const item of this.itemPlan) {
        const stats = await item.runImport();
        logger.info(
          `Replicated ${item.name}, inserted ${stats.inserted} rows, mapped ${stats.mapped} rows, missing ${stats.missing} rows, skipped ${stats.skipped} rows, updated ${stats.updated} rows, deleted ${stats.deleted} rows`
        );
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), `Failed replicator job, rollbacking. ${err.message}`);
      await this.runDumperCommand(dmp => dmp.rollbackTransaction());
      return;
    }
    if (this.options.rollbackAfterFinish) {
      logger.info('Rollbacking transaction, nothing was changed');
      await this.runDumperCommand(dmp => dmp.rollbackTransaction());
    } else {
      logger.info('Committing replicator transaction');
      await this.runDumperCommand(dmp => dmp.commitTransaction());
    }

    this.result = this.dumper.s;
  }
}
