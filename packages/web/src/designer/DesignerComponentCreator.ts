import _ from 'lodash';
import type { DesignerInfo, DesignerTableInfo, DesignerReferenceInfo, DesignerJoinType } from './types';
import { findPrimaryTable, findConnectingReference, referenceIsJoin, referenceIsExists } from './designerTools';

export class DesignerComponent {
  subComponents: DesignerComponent[] = [];
  parentComponent: DesignerComponent;
  parentReference: DesignerReferenceInfo;

  tables: DesignerTableInfo[] = [];
  nonPrimaryReferences: DesignerReferenceInfo[] = [];

  get primaryTable() {
    return this.tables[0];
  }
  get nonPrimaryTables() {
    return this.tables.slice(1);
  }
  get nonPrimaryTablesAndReferences() {
    return _.zip(this.nonPrimaryTables, this.nonPrimaryReferences);
  }
  get myAndParentTables() {
    return [...this.parentTables, ...this.tables];
  }
  get parentTables() {
    return this.parentComponent ? this.parentComponent.myAndParentTables : [];
  }
  get thisAndSubComponentsTables() {
    return [...this.tables, ..._.flatten(this.subComponents.map(x => x.thisAndSubComponentsTables))];
  }
}

export class DesignerComponentCreator {
  toAdd: DesignerTableInfo[];
  components: DesignerComponent[] = [];

  constructor(public designer: DesignerInfo) {
    this.toAdd = [...designer.tables];
    while (this.toAdd.length > 0) {
      const component = this.parseComponent(null);
      this.components.push(component);
    }
  }

  parseComponent(root) {
    if (root == null) {
      root = findPrimaryTable(this.toAdd);
    }
    if (!root) return null;
    _.remove(this.toAdd, x => x == root);
    const res = new DesignerComponent();
    res.tables.push(root);

    for (;;) {
      let found = false;
      for (const test of this.toAdd) {
        const ref = findConnectingReference(this.designer, res.tables, [test], referenceIsJoin);
        if (ref) {
          res.tables.push(test);
          res.nonPrimaryReferences.push(ref);
          _.remove(this.toAdd, x => x == test);
          found = true;
          break;
        }
      }

      if (!found) break;
    }

    for (;;) {
      let found = false;
      for (const test of this.toAdd) {
        const ref = findConnectingReference(this.designer, res.tables, [test], referenceIsExists);
        if (ref) {
          const subComponent = this.parseComponent(test);
          res.subComponents.push(subComponent);
          subComponent.parentComponent = res;
          subComponent.parentReference = ref;
          found = true;
          break;
        }
      }

      if (!found) break;
    }

    return res;
  }
}
