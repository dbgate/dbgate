import { PerspectiveTableNode, PerspectiveTreeNode } from './PerspectiveTreeNode';

export class PerspectiveDisplayColumn {
  subColumns: PerspectiveDisplayColumn[] = [];
  title: string;
  dataField: string;

  constructor() {}
}

export class PerspectiveDisplay {
  columns: PerspectiveDisplayColumn[] = [];

  constructor(public root: PerspectiveTreeNode, public rows: any[]) {
    const children = root.childNodes;
    this.fillChildren(root.childNodes, this.columns);
  }

  fillChildren(children: PerspectiveTreeNode[], columns: PerspectiveDisplayColumn[]) {
    for (const child of children) {
      if (child.isChecked) {
        const childColumn = this.nodeToColumn(child);
        columns.push(childColumn);
      }
    }
  }

  nodeToColumn(node: PerspectiveTreeNode) {
    const res = new PerspectiveDisplayColumn();
    res.title = node.columnTitle;
    res.dataField = node.dataField;
    if (node.isExpandable) {
      this.fillChildren(node.childNodes, res.subColumns);
    }
    return res;
  }
}
