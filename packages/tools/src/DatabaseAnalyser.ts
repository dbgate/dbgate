import { DatabaseInfo, DatabaseModification, EngineDriver } from 'dbgate-types';
import _sortBy from 'lodash/sortBy';
import _groupBy from 'lodash/groupBy';
import _pick from 'lodash/pick';

const fp_pick = arg => array => _pick(array, arg);
export class DatabaseAnalyser {
  structure: DatabaseInfo;
  modifications: DatabaseModification[];
  singleObjectFilter: any;

  constructor(public pool, public driver: EngineDriver) {}

  async _runAnalysis() {
    return DatabaseAnalyser.createEmptyStructure();
  }

  /** @returns {Promise<import('dbgate-types').DatabaseModification[]>} */
  async getModifications() {
    if (this.structure == null) throw new Error('DatabaseAnalyse.getModifications - structure must be filled');

    return null;
  }

  async fullAnalysis() {
    return this._runAnalysis();
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
    return this._runAnalysis();
  }

  mergeAnalyseResult(newlyAnalysed, extractObjectId) {
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
        .map(x => extractObjectId(x));
      const newArray = newlyAnalysed[field] || [];
      const addedChangedIds = newArray.map(x => extractObjectId(x));
      const removeAllIds = [...removedIds, ...addedChangedIds];
      res[field] = _sortBy(
        [...this.structure[field].filter(x => !removeAllIds.includes(extractObjectId(x))), ...newArray],
        x => x.pureName
      );
    }

    return res;

    // const {tables,views, functions, procedures, triggers} = this.structure;

    // return {
    //   tables:
    // }
  }

  // findObjectById(id) {
  //   return this.structure.tables.find((x) => x.objectId == id);
  // }

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
