import { DatabaseHandle, DatabaseInfo, DatabaseModification, EngineDriver, SqlDialect } from 'dbgate-types';
import _sortBy from 'lodash/sortBy';
import _groupBy from 'lodash/groupBy';
import _pick from 'lodash/pick';
import _compact from 'lodash/compact';
import { getLogger } from './getLogger';
import { type Logger } from 'pinomin';
import { dbNameLogCategory, isCompositeDbName, splitCompositeDbName } from './schemaInfoTools';
import { extractErrorLogData } from './stringTools';

const logger = getLogger('dbAnalyser');

const STRUCTURE_FIELDS = [
  'tables',
  'collections',
  'views',
  'matviews',
  'functions',
  'procedures',
  'triggers',
  'schedulerEvents',
];

const fp_pick = arg => array => _pick(array, arg);

function mergeTableRowCounts(info: DatabaseInfo, rowCounts): DatabaseInfo {
  return {
    ...info,
    tables: (info.tables || []).map(table => ({
      ...table,
      tableRowCount: rowCounts.find(x => x.objectId == table.objectId)?.tableRowCount ?? table.tableRowCount,
    })),
  };
}

function areDifferentRowCounts(db1: DatabaseInfo, db2: DatabaseInfo) {
  for (const t1 of db1.tables || []) {
    const t2 = (db2.tables || []).find(x => x.objectId == t1.objectId);
    if (t1?.tableRowCount !== t2?.tableRowCount) {
      return true;
    }
  }
  return false;
}

export class DatabaseAnalyser {
  structure: DatabaseInfo;
  modifications: DatabaseModification[];
  singleObjectFilter: any;
  singleObjectId: string = null;
  dialect: SqlDialect;
  logger: Logger;

  constructor(public dbhan: DatabaseHandle, public driver: EngineDriver, version) {
    this.dialect = (driver?.dialectByVersion && driver?.dialectByVersion(version)) || driver?.dialect;
    this.logger = logger;
  }

  async _runAnalysis() {
    return DatabaseAnalyser.createEmptyStructure();
  }

  async _getFastSnapshot(): Promise<DatabaseInfo> {
    return null;
  }

  async _computeSingleObjectId() {}

  addEngineField(db: DatabaseInfo) {
    if (!this.driver?.engine) return;
    for (const field of STRUCTURE_FIELDS) {
      if (!db[field]) continue;
      for (const item of db[field]) {
        item.engine = this.driver.engine;
      }
    }
    db.engine = this.driver.engine;
    return db;
  }

  async fullAnalysis() {
    logger.debug(
      `Performing full analysis, DB=${dbNameLogCategory(this.dbhan.database)}, engine=${this.driver.engine}`
    );
    const res = this.addEngineField(await this._runAnalysis());
    // console.log('FULL ANALYSIS', res);
    return res;
  }

  async singleObjectAnalysis(name, typeField) {
    // console.log('Analysing SINGLE OBJECT', name, typeField);
    this.singleObjectFilter = { ...name, typeField };
    await this._computeSingleObjectId();
    const res = this.addEngineField(await this._runAnalysis());
    // console.log('SINGLE OBJECT RES', res);
    const obj =
      res[typeField]?.length == 1
        ? res[typeField][0]
        : res[typeField]?.find(x => x.pureName == name.pureName && x.schemaName == name.schemaName);
    // console.log('SINGLE OBJECT', obj);
    return obj;
  }

  async incrementalAnalysis(structure) {
    logger.info(
      `Performing incremental analysis, DB=${dbNameLogCategory(this.dbhan.database)}, engine=${this.driver.engine}`
    );
    this.structure = structure;

    const modifications = await this.getModifications();
    if (modifications == null) {
      // modifications not implemented, perform full analysis
      this.structure = null;
      return this.addEngineField(await this._runAnalysis());
    }
    const structureModifications = modifications.filter(x => x.action != 'setTableRowCounts');
    const setTableRowCounts = modifications.find(x => x.action == 'setTableRowCounts');

    let structureWithRowCounts = null;
    if (setTableRowCounts) {
      const newStructure = mergeTableRowCounts(structure, setTableRowCounts.rowCounts);
      if (areDifferentRowCounts(structure, newStructure)) {
        structureWithRowCounts = newStructure;
      }
    }

    if (structureModifications.length == 0) {
      return structureWithRowCounts ? this.addEngineField(structureWithRowCounts) : null;
    }

    this.modifications = structureModifications;
    if (structureWithRowCounts) this.structure = structureWithRowCounts;
    logger.info({ modifications: this.modifications }, 'DB modifications detected:');
    return this.addEngineField(this.mergeAnalyseResult(await this._runAnalysis()));
  }

  mergeAnalyseResult(newlyAnalysed) {
    if (this.structure == null) {
      return {
        ...DatabaseAnalyser.createEmptyStructure(),
        ...newlyAnalysed,
      };
    }

    const res = {};
    for (const field of STRUCTURE_FIELDS) {
      const removedIds = this.modifications
        .filter(x => x.action == 'remove' && x.objectTypeField == field)
        .map(x => x.objectId);
      const newArray = newlyAnalysed[field] || [];
      const addedChangedIds = newArray.map(x => x.objectId);
      const removeAllIds = [...removedIds, ...addedChangedIds];
      res[field] = _sortBy(
        [...(this.structure[field] || []).filter(x => !removeAllIds.includes(x.objectId)), ...newArray],
        x => x.pureName
      );

      // merge missing data from old structure
      for (const item of res[field]) {
        const original = (this.structure[field] || []).find(x => x.objectId == item.objectId);
        if (original) {
          for (const key in original) {
            if (!item[key]) item[key] = original[key];
          }
        }
      }
    }

    return res;

    // const {tables,views, functions, procedures, triggers} = this.structure;

    // return {
    //   tables:
    // }
  }

  getRequestedObjectPureNames(objectTypeField, allPureNames) {
    if (this.singleObjectFilter) {
      const { typeField, pureName } = this.singleObjectFilter;
      if (typeField == objectTypeField) return [pureName];
    }
    if (this.modifications) {
      return this.modifications
        .filter(x => x.objectTypeField == objectTypeField)
        .filter(x => x.newName)
        .map(x => x.newName.pureName);
    }
    return allPureNames;
  }

  // findObjectById(id) {
  //   return this.structure.tables.find((x) => x.objectId == id);
  // }

  // containsObjectIdCondition(typeFields) {
  //   return this.createQueryCore('=OBJECT_ID_CONDITION', typeFields) != ' is not null';
  // }

  getDefaultSchemaNameCondition() {
    return 'is not null';
  }

  createQuery(template, typeFields, replacements = {}) {
    let query = this.createQueryCore(this.processQueryReplacements(template, replacements), typeFields);

    const dbname = this.dbhan.database;
    const schemaCondition = isCompositeDbName(dbname)
      ? `= '${splitCompositeDbName(dbname).schema}' `
      : ` ${this.getDefaultSchemaNameCondition()} `;

    return query?.replace(/=SCHEMA_NAME_CONDITION/g, schemaCondition);
  }

  processQueryReplacements(query, replacements) {
    for (const repl in replacements) {
      query = query.replaceAll(repl, replacements[repl]);
    }
    return query;
  }

  createQueryCore(template, typeFields) {
    // let res = template;
    if (this.singleObjectFilter) {
      const { typeField } = this.singleObjectFilter;
      if (!this.singleObjectId) return null;
      if (!typeFields || !typeFields.includes(typeField)) return null;
      return template.replace(/=OBJECT_ID_CONDITION/g, ` = '${this.singleObjectId}'`);
    }
    if (!this.modifications || !typeFields || this.modifications.length == 0) {
      return template.replace(/=OBJECT_ID_CONDITION/g, ' is not null');
    }
    if (this.modifications.some(x => typeFields.includes(x.objectTypeField) && x.action == 'all')) {
      // do not filter objects
      return template.replace(/=OBJECT_ID_CONDITION/g, ' is not null');
    }
    const filterIds = this.modifications
      .filter(x => typeFields.includes(x.objectTypeField) && (x.action == 'add' || x.action == 'change'))
      .map(x => x.objectId);
    if (filterIds.length == 0) {
      return null;
    }
    return template.replace(/=OBJECT_ID_CONDITION/g, ` in (${filterIds.map(x => `'${x}'`).join(',')})`);
  }

  getDeletedObjectsForField(snapshot, objectTypeField) {
    const items = snapshot[objectTypeField];
    if (!items) return [];
    if (!this.structure[objectTypeField]) return [];
    return this.structure[objectTypeField]
      .filter(x => !items.find(y => x.objectId == y.objectId))
      .map(x => ({
        oldName: _pick(x, ['schemaName', 'pureName']),
        objectId: x.objectId,
        action: 'remove',
        objectTypeField,
      }));
  }

  getDeletedObjects(snapshot) {
    return [
      ...this.getDeletedObjectsForField(snapshot, 'tables'),
      ...this.getDeletedObjectsForField(snapshot, 'collections'),
      ...this.getDeletedObjectsForField(snapshot, 'views'),
      ...this.getDeletedObjectsForField(snapshot, 'matviews'),
      ...this.getDeletedObjectsForField(snapshot, 'procedures'),
      ...this.getDeletedObjectsForField(snapshot, 'functions'),
      ...this.getDeletedObjectsForField(snapshot, 'triggers'),
      ...this.getDeletedObjectsForField(snapshot, 'schedulerEvents'),
    ];
  }

  feedback(obj) {
    if (this.dbhan.feedback) {
      this.dbhan.feedback(obj);
    }
    if (obj && obj.analysingMessage) {
      logger.debug(obj.analysingMessage);
    }
  }

  async getModifications() {
    const snapshot = await this._getFastSnapshot();
    if (!snapshot) return null;

    // console.log('STRUCTURE', this.structure);
    // console.log('SNAPSHOT', snapshot);

    const res = [];
    for (const field in snapshot) {
      const items = snapshot[field];
      if (items === null) {
        res.push({ objectTypeField: field, action: 'all' });
        continue;
      }
      if (items === undefined) {
        // skip - undefined meens, that field is not supported
        continue;
      }
      for (const item of items) {
        const { objectId, schemaName, pureName, contentHash } = item;
        const obj = this.structure[field].find(x => x.objectId == objectId);

        if (obj && contentHash && obj.contentHash == contentHash) continue;

        const action = obj
          ? {
              newName: { schemaName, pureName },
              oldName: _pick(obj, ['schemaName', 'pureName']),
              action: 'change',
              objectTypeField: field,
              objectId,
            }
          : {
              newName: { schemaName, pureName },
              action: 'add',
              objectTypeField: field,
              objectId,
            };
        res.push(action);
      }
    }

    const rowCounts = (snapshot.tables || [])
      .filter(x => x.tableRowCount != null)
      .map(x => ({
        objectId: x.objectId,
        tableRowCount: x.tableRowCount,
      }));

    if (rowCounts.length > 0) {
      res.push({
        action: 'setTableRowCounts',
        rowCounts,
      });
    }

    return [..._compact(res), ...this.getDeletedObjects(snapshot)];
  }

  async analyserQuery(template, typeFields, replacements = {}) {
    const sql = this.createQuery(template, typeFields, replacements);

    if (!sql) {
      return {
        rows: [],
      };
    }
    try {
      const res = await this.driver.query(this.dbhan, sql);
      this.logger.debug({ rows: res.rows.length, template }, `Loaded analyser query`);
      return res;
    } catch (err) {
      logger.error(extractErrorLogData(err, { template }), 'Error running analyser query');
      return {
        rows: [],
      };
    }
  }

  static createEmptyStructure(): DatabaseInfo {
    return {
      tables: [],
      collections: [],
      views: [],
      matviews: [],
      functions: [],
      procedures: [],
      triggers: [],
      schedulerEvents: [],
    };
  }

  static byTableFilter(table) {
    return x => x.pureName == table.pureName && x.schemaName == table.schemaName;
  }

  static extractPrimaryKeys(table, pkColumns) {
    const filtered = pkColumns.filter(DatabaseAnalyser.byTableFilter(table));
    if (filtered.length == 0) return undefined;
    return {
      ..._pick(filtered[0], ['constraintName', 'schemaName', 'pureName']),
      constraintType: 'primaryKey',
      columns: filtered.map(fp_pick('columnName')),
    };
  }
  static extractForeignKeys(table, fkColumns) {
    const grouped = _groupBy(fkColumns.filter(DatabaseAnalyser.byTableFilter(table)), 'constraintName');
    return Object.keys(grouped).map(constraintName => ({
      constraintName,
      constraintType: 'foreignKey',
      ..._pick(grouped[constraintName][0], [
        'constraintName',
        'schemaName',
        'pureName',
        'refSchemaName',
        'refTableName',
        'updateAction',
        'deleteAction',
      ]),
      columns: grouped[constraintName].map(fp_pick(['columnName', 'refColumnName'])),
    }));
  }
}
