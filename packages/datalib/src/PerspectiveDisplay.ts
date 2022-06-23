import { PerspectiveTableNode, PerspectiveTreeNode } from './PerspectiveTreeNode';

export class PerspectiveDisplayColumn {
  constructor(public label: string, public field: string) {}
}

export class PerspectiveDisplay {
  columns: PerspectiveDisplayColumn[] = [];

  constructor(public root: PerspectiveTreeNode, public rows: any[]) {
    const children = root.childNodes;
    for (const child of children) {
      if (child.isChecked) {
        this.columns.push(new PerspectiveDisplayColumn(child.title, child.codeName));
      }
    }
  }
}
