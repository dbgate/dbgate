import { GridDisplay } from 'dbgate-datalib';
import Grider from './Grider';
import { GriderRowStatus } from './Grider';
import _uniq from 'lodash/uniq';

export default class OverlayDiffGrider extends Grider {
  private prependRows: any[];
  private rowCacheIndexes: Set<number>;
  private rowDataCache;
  private rowStatusCache;
  private overlayRowsByStr: { [key: string]: any };

  constructor(
    public sourceRows: any[],
    public display: GridDisplay,
    public matchColumns: string[],
    public overlayData: any[],
    public matchedDbKeys: any[][]
  ) {
    super();
    const matchedDbKeysByStr = new Set(matchedDbKeys.map(x => x.join('||')));
    this.prependRows = overlayData.filter(row => !matchedDbKeysByStr.has(matchColumns.map(x => row[x]).join('||')));
    this.overlayRowsByStr = {};
    for (const row of overlayData) {
      const key = matchColumns.map(x => row[x]).join('||');
      this.overlayRowsByStr[key] = row;
    }

    this.rowDataCache = {};
    this.rowStatusCache = {};
    this.rowCacheIndexes = new Set();
  }

  requireRowCache(index: number) {
    if (this.rowCacheIndexes.has(index)) return;

    if (index < this.prependRows.length) {
      this.rowStatusCache[index] = {
        status: 'inserted',
      };
      this.rowDataCache[index] = this.prependRows[index];
      this.rowCacheIndexes.add(index);
      return;
    }

    const row = this.sourceRows[index - this.prependRows.length];

    if (!row) {
      this.rowStatusCache[index] = {
        status: 'missing',
      };
      this.rowDataCache[index] = row;
      this.rowCacheIndexes.add(index);
      return;
    }

    const overlayKey = this.matchColumns.map(x => row[x]).join('||');
    const overlayRow = this.overlayRowsByStr[overlayKey];

    if (!overlayRow) {
      this.rowStatusCache[index] = {
        status: 'missing',
      };
      this.rowDataCache[index] = row;
      this.rowCacheIndexes.add(index);
      return;
    }

    const overlayFields = {};
    const missingOverlayFields = new Set();

    for (const field of this.display.columns.map(x => x.columnName)) {
      if (!(field in overlayRow)) {
        missingOverlayFields.add(field);
      } else if (row[field] != overlayRow[field]) {
        overlayFields[field] = overlayRow[field];
      }
    }

    if (Object.keys(overlayFields).length > 0 || missingOverlayFields.size > 0) {
      this.rowStatusCache[index] = {
        status: 'updated',
        overlayFields,
        missingOverlayFields,
        modifiedFields: new Set(Object.keys(overlayFields)),
      };
      this.rowDataCache[index] = row;
    } else {
      this.rowStatusCache[index] = {
        status: 'regular',
      };
      this.rowDataCache[index] = row;
    }
    this.rowCacheIndexes.add(index);
  }

  getRowData(index: number) {
    this.requireRowCache(index);
    return this.rowDataCache[index];
  }

  getRowStatus(index): GriderRowStatus {
    this.requireRowCache(index);
    return this.rowStatusCache[index];
  }

  get rowCount() {
    return this.sourceRows.length + this.prependRows.length;
  }
}
