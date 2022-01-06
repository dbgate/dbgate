import _ from 'lodash';

class GraphNode {
  neightboors: GraphNode[] = [];
  radius: number;
  constructor(public graph: GraphDefinition, public designerId: string, public width: number, public height: number) {}

  initialize() {
    this.radius = Math.sqrt((this.width * this.width) / 4 + (this.height * this.height) / 4);
  }
}

class GraphEdge {
  constructor(public graph: GraphDefinition, public source: GraphNode, public target: GraphNode) {}
}

// function initialCompareNodes(a: GraphNode, b: GraphNode) {
//   if (a.neightboors.length < b.neightboors.length) return -1;
//   if (a.neightboors.length > b.neightboors.length) return 1;

//   if (a.height < b.height) return -1;
//   if (a.height > b.height) return 1;

//   return;
// }

export class GraphDefinition {
  nodes: { [designerId: string]: GraphNode } = {};
  edges: GraphEdge[] = [];

  addNode(designerId: string, width: number, height: number) {
    this.nodes[designerId] = new GraphNode(this, designerId, width, height);
  }

  addEdge(sourceId: string, targetId: string) {
    const source = this.nodes[sourceId];
    const target = this.nodes[targetId];
    if (
      source &&
      target &&
      !this.edges.find(x => (x.source == source && x.target == target) || (x.target == source && x.source == target))
    ) {
      this.edges.push(new GraphEdge(this, source, target));
    }
  }

  initialize() {
    for (const node of Object.values(this.nodes)) {
      for (const edge of this.edges) {
        if (edge.source == node && !node.neightboors.includes(edge.target)) node.neightboors.push(edge.target);
        if (edge.target == node && !node.neightboors.includes(edge.source)) node.neightboors.push(edge.source);
      }
      node.initialize();
    }
  }
}

class LayoutNode {
  constructor(public node: GraphNode, public x: number, public y: number) {}

  translate(dx: number, dy: number) {
    return new LayoutNode(this.node, this.x + dx, this.y + dy);
  }
}

class LayoutEdge {
  edge: GraphEdge;
  length: number;
}

function addNodeNeighboors(nodes: GraphNode[], res: GraphNode[], addedNodes: Set<string>) {
  const nodesSorted = _.sortBy(nodes, [x => x.neightboors.length, x => x.height, x => x.designerId]);
  for (const node of nodesSorted) {
    if (addedNodes.has(node.designerId)) continue;
    addedNodes.add(node.designerId);
    res.push(node);
    addNodeNeighboors(node.neightboors, res, addedNodes);
  }

  return res;
}

export class GraphLayout {
  nodes: { [designerId: string]: LayoutNode } = {};
  edges: LayoutEdge[] = [];

  constructor(public graph: GraphDefinition) {}

  static createCircle(graph: GraphDefinition): GraphLayout {
    const res = new GraphLayout(graph);
    if (_.isEmpty(graph.nodes)) return res;

    const addedNodes = new Set<string>();
    const circleSortedNodes: GraphNode[] = [];

    addNodeNeighboors(_.values(graph.nodes), circleSortedNodes, addedNodes);
    const nodeRadius = _.max(circleSortedNodes.map(x => x.radius));
    const nodeCount = circleSortedNodes.length;
    const radius = (nodeCount * nodeRadius) / (2 * Math.PI) + nodeRadius;

    let angle = 0;
    const dangle = (2 * Math.PI) / circleSortedNodes.length;
    for (const node of circleSortedNodes) {
      res.nodes[node.designerId] = new LayoutNode(node, Math.sin(angle) * radius, Math.cos(angle) * radius);
      angle += dangle;
    }

    return res;
  }

  changePositions(nodeFunc: (node: LayoutNode) => LayoutNode): GraphLayout {
    const res = new GraphLayout(this.graph);
    res.nodes = _.mapValues(this.nodes, nodeFunc);
    return res;
  }

  fixViewBox() {
    const minX = _.min(_.values(this.nodes).map(n => n.x - n.node.width / 2));
    const minY = _.min(_.values(this.nodes).map(n => n.y - n.node.height / 2));

    return this.changePositions(n => n.translate(-minX + 10, -minY + 10));
  }
}
