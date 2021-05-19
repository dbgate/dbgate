import { DatabaseInfo, DatabaseModification, EngineDriver } from 'dbgate-types';
import _sortBy from 'lodash/sortBy';
import _groupBy from 'lodash/groupBy';
import _pick from 'lodash/pick';
import _compact from 'lodash/compact';

const fp_pick = arg => array => _pick(array, arg);
export class DatabaseAnalyser {
  structure: DatabaseInfo;
  modifications: DatabaseModification[];
  singleObjectFilter: any;
  singleObjectId: string = null;

  constructor(public pool, public driver: EngineDriver) {}

  async _runAnalysis() {
    return DatabaseAnalyser.createEmptyStructure();
  }

  async _getFastSnapshot(): Promise<DatabaseInfo> {
    return null;
  }

  async _computeSingleObjectId() {}

  async fullAnalysis() {
    const res = await this._runAnalysis();
    // console.log('FULL ANALYSIS', res);
    return res;
  }

  async singleObjectAnalysis(name, typeField) {
    // console.log('Analysing SINGLE OBJECT', name, typeField);
    this.singleObjectFilter = { ...name, typeField };
    await this._computeSingleObjectId();
    const res = await this._runAnalysis();
    // console.log('SINGLE OBJECT RES', res);
    const obj =
      res[typeField]?.length == 1
        ? res[typeField][0]
        : res[typeField]?.find(x => x.pureName == name.pureName && x.schemaName == name.schemaName);
    // console.log('SINGLE OBJECT', obj);
    return obj;
  }

  async incrementalAnalysis(structure) {
    this.structure = structure;

    this.modifications = await this.getModifications();
    if (this.modifications == null) {
      // modifications not implemented, perform full analysis
      this.structure = null;
      return this._runAnalysis();
    }
    if (this.modifications.length == 0) return null;
    console.log('DB modifications detected:', this.modifications);
    return this.mergeAnalyseResult(await this._runAnalysis());
  }

  mergeAnalyseResult(newlyAnalysed) {
    if (this.structure == null) {
      return {
        ...DatabaseAnalyser.createEmptyStructure(),
        ...newlyAnalysed,
      };
    }

    const res = {};
    for (const field of ['tables', 'collections', 'views', 'functions', 'procedures', 'triggers']) {
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
      return this.modifications.filter(x => x.objectTypeField == objectTypeField).map(x => x.newName.pureName);
    }
    return allPureNames;
  }

  // findObjectById(id) {
  //   return this.structure.tables.find((x) => x.objectId == id);
  // }

  createQuery(template, typeFields) {
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
      return template.replace(/=OBJECT_ID_CONDITION/g, " = '0'");
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
      ...this.getDeletedObjectsForField(snapshot, 'procedures'),
      ...this.getDeletedObjectsForField(snapshot, 'functions'),
      ...this.getDeletedObjectsForField(snapshot, 'triggers'),
    ];
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

      return [..._compact(res), ...this.getDeletedObjects(snapshot)];
    }
  }

  static createEmptyStructure(): DatabaseInfo {
    return {
      tables: [],
      collections: [],
      views: [],
      functions: [],
      procedures: [],
      triggers: [],
      schemas: [],
    };
  }

  static byTableFilter(table) {
    return x => x.pureName == table.pureName && x.schemaName == x.schemaName;
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
