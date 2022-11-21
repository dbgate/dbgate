import _ from 'lodash';
import type { IBoxBounds, IPoint } from './designerMath';
import { rectangleDistance, rectangleIntersectArea, solveOverlapsInIntervalArray, Vector2D } from './designerMath';
import { union, intersection } from 'interval-operations';

const MIN_NODE_DISTANCE = 50;
const SPRING_LENGTH = 100;
const SPRINGY_STEPS = 50;
const GRAVITY_X = 0.005;
const GRAVITY_Y = 0.01;
// const REPULSION = 500_000;
const REPULSION = 1000;
const MAX_FORCE_SIZE = 100;
const NODE_MARGIN = 30;
const NODE_SPACE_TREE = 60;
const GRAVITY_EXPONENT = 1.05;

// const MOVE_STEP = 20;
// const MOVE_BIG_STEP = 50;
// const MOVE_STEP_COUNT = 100;
// const MINIMAL_SCORE_BENEFIT = 1;
// const SCORE_ASPECT_RATIO = 1.6;

class GraphNode {
  neightboors: GraphNode[] = [];
  radius: number;
  constructor(
    public graph: GraphDefinition,
    public designerId: string,
    public width: number,
    public height: number,
    public fixedPosition: IPoint
  ) {}

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

  addNode(designerId: string, width: number, height: number, fixedPosition: IPoint) {
    this.nodes[designerId] = new GraphNode(this, designerId, width, height, fixedPosition);
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

  detectCentreNode(): GraphNode {
    if (_.values(this.nodes).find(x => x.fixedPosition)) {
      return null;
    }
    const res: GraphNode[] = [];
    for (const n1 of _.values(this.nodes)) {
      let candidate = true;
      for (const n2 of _.values(this.nodes)) {
        if (n1 == n2) {
          continue;
        }
        if (!n1.neightboors.includes(n2)) {
          candidate = false;
          break;
        }
      }
      if (candidate) {
        res.push(n1);
      }
    }
    if (res.length == 1) return res[0];
    return null;
  }
}

class LayoutNode {
  position: Vector2D;
  left: number;
  right: number;
  top: number;
  bottom: number;
  // paddedRect: IBoxBounds;

  rangeXPadded: [number, number];
  rangeYPadded: [number, number];

  constructor(public node: GraphNode, public x: number, public y: number) {
    this.left = x - node.width / 2;
    this.top = y - node.height / 2;
    this.right = x + node.width / 2;
    this.bottom = y + node.height / 2;
    this.position = new Vector2D(x, y);

    this.rangeXPadded = [this.left - NODE_MARGIN, this.right + NODE_MARGIN];
    this.rangeYPadded = [this.top - NODE_MARGIN, this.bottom + NODE_MARGIN];
    // this.paddedRect = {
    //   left: this.left - NODE_MARGIN,
    //   top: this.top - NODE_MARGIN,
    //   right: this.right + NODE_MARGIN,
    //   bottom: this.bottom + NODE_MARGIN,
    // };
  }

  translate(dx: number, dy: number, forceMoveFixed = false) {
    if (this.node.fixedPosition && !forceMoveFixed) return this;
    return new LayoutNode(this.node, this.x + dx, this.y + dy);
  }

  distanceTo(node: LayoutNode) {
    return rectangleDistance(this, node);
  }

  // intersectArea(node: LayoutNode) {
  //   return rectangleIntersectArea(this.paddedRect, node.paddedRect);
  // }
  hasPaddedIntersect(node: LayoutNode) {
    const xIntersection = intersection(this.rangeXPadded, node.rangeXPadded) as [number, number];
    const yIntersection = intersection(this.rangeYPadded, node.rangeYPadded) as [number, number];
    return (
      xIntersection &&
      xIntersection[1] - xIntersection[0] > 0.1 &&
      yIntersection &&
      yIntersection[1] - yIntersection[0] > 0.1
    );
  }
}

class ForceAlgorithmStep {
  nodeForces: { [designerId: string]: Vector2D } = {};
  constructor(public layout: GraphLayout) {}

  applyForce(node: LayoutNode, force: Vector2D) {
    const size = force.magnitude();
    if (size > MAX_FORCE_SIZE) {
      force = force.normalise().multiply(MAX_FORCE_SIZE);
    }

    if (node.node.designerId in this.nodeForces) {
      this.nodeForces[node.node.designerId] = this.nodeForces[node.node.designerId].add(force);
    } else {
      this.nodeForces[node.node.designerId] = force;
    }
  }

  applyCoulombsLaw() {
    for (const n1 of _.values(this.layout.nodes)) {
      for (const n2 of _.values(this.layout.nodes)) {
        if (n1.node.designerId == n2.node.designerId) {
          continue;
        }

        const d = n1.position.subtract(n2.position);
        const direction = d.normalise();
        const distance = n1.distanceTo(n2) + MIN_NODE_DISTANCE;

        this.applyForce(n1, direction.multiply((+0.5 * REPULSION) / (distance * distance)));
        this.applyForce(n2, direction.multiply((-0.5 * REPULSION) / (distance * distance)));
      }
    }
  }

  applyHooksLaw() {
    for (const edge of this.layout.edges) {
      const d = edge.target.position.subtract(edge.source.position); // the direction of the spring
      const displacement = SPRING_LENGTH - edge.length;
      var direction = d.normalise();

      // apply force to each end point
      this.applyForce(edge.source, direction.multiply(displacement * -0.5));
      this.applyForce(edge.target, direction.multiply(displacement * +0.5));
    }
  }

  applyGravity() {
    for (const node of _.values(this.layout.nodes)) {
      this.applyForce(
        node,
        // new Vector2D(-node.position.x * GRAVITY_X, -node.position.y * GRAVITY_Y)

        new Vector2D(
          -Math.pow(Math.abs(node.position.x), GRAVITY_EXPONENT) * Math.sign(node.position.x) * GRAVITY_X,
          -Math.pow(Math.abs(node.position.y), GRAVITY_EXPONENT) * Math.sign(node.position.y) * GRAVITY_Y
        )
      );
    }
  }

  moveNode(node: LayoutNode): LayoutNode {
    const force = this.nodeForces[node.node.designerId];
    if (force) {
      return node.translate(force.x, force.y);
    }
    return node;
  }
}

class LayoutEdge {
  edge: GraphEdge;
  length: number;
  source: LayoutNode;
  target: LayoutNode;
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

  static createCircle(graph: GraphDefinition, middle: IPoint = { x: 0, y: 0 }): GraphLayout {
    const res = new GraphLayout(graph);
    if (_.isEmpty(graph.nodes)) return res;

    const addedNodes = new Set<string>();
    const circleSortedNodes: GraphNode[] = [];

    const centreNode = graph.detectCentreNode();

    addNodeNeighboors(
      _.values(graph.nodes).filter(x => x != centreNode && !x.fixedPosition),
      circleSortedNodes,
      addedNodes
    );
    const nodeRadius = _.max(circleSortedNodes.map(x => x.radius));
    const nodeCount = circleSortedNodes.length;
    const radius = (nodeCount * nodeRadius) / (2 * Math.PI) + nodeRadius;

    let angle = 0;
    const dangle = (2 * Math.PI) / circleSortedNodes.length;
    for (const node of circleSortedNodes) {
      res.nodes[node.designerId] = new LayoutNode(
        node,
        middle.x + Math.sin(angle) * radius,
        middle.y + Math.cos(angle) * radius
      );
      angle += dangle;
    }

    for (const node of _.values(graph.nodes).filter(x => x.fixedPosition)) {
      res.nodes[node.designerId] = new LayoutNode(node, node.fixedPosition.x, node.fixedPosition.y);
    }

    if (centreNode) {
      res.nodes[centreNode.designerId] = new LayoutNode(centreNode, middle.x, middle.y);
    }

    res.fillEdges();

    return res;
  }

  static createTree(graph: GraphDefinition, rootId: string): GraphLayout {
    const res = new GraphLayout(graph);
    const root = graph.nodes[rootId];
    if (!root) return res;

    const rootLayout = new LayoutNode(root, root.width / 2 + NODE_MARGIN, root.height / 2 + NODE_MARGIN);
    res.nodes[rootId] = rootLayout;

    res.createTreeLevel([root], rootLayout.right + NODE_SPACE_TREE);

    let maxRight = _.max(_.values(res.nodes).map(x => x.right));

    const notPlacedNodes = _.values(graph.nodes).filter(x => !res.nodes[x.designerId]);
    for (const node of notPlacedNodes) {
      maxRight += NODE_SPACE_TREE;

      const layoutNode = new LayoutNode(node, maxRight + node.width / 2, NODE_MARGIN + node.height / 2);
      res.nodes[node.designerId] = layoutNode;

      maxRight += node.width;
    }

    return res;
  }

  createTreeLevel(parentNodes: GraphNode[], left: number) {
    let currentY = NODE_MARGIN;
    let maxRight = 0;
    const nextLevel: GraphNode[] = [];
    for (const parent of parentNodes) {
      for (const child of parent.neightboors) {
        if (child.designerId in this.nodes) {
          continue;
        }
        nextLevel.push(child);
        const layoutNode = new LayoutNode(child, left + child.width / 2, currentY + child.height / 2);
        this.nodes[child.designerId] = layoutNode;
        currentY += child.height + NODE_MARGIN;
        if (layoutNode.right > maxRight) {
          maxRight = layoutNode.right;
        }
      }
    }

    if (nextLevel.length > 0) {
      this.createTreeLevel(nextLevel, maxRight + NODE_SPACE_TREE);
    }
  }

  fillEdges() {
    this.edges = this.graph.edges.map(edge => {
      const res = new LayoutEdge();
      res.edge = edge;
      const n1 = this.nodes[edge.source.designerId];
      const n2 = this.nodes[edge.target.designerId];
      res.length = n1.distanceTo(n2);
      res.source = n1;
      res.target = n2;
      return res;
    });
  }

  changePositions(nodeFunc: (node: LayoutNode) => LayoutNode, callFillEdges = true): GraphLayout {
    const res = new GraphLayout(this.graph);
    res.nodes = _.mapValues(this.nodes, nodeFunc);
    if (callFillEdges) res.fillEdges();
    return res;
  }

  fixViewBox() {
    const minX = _.min(_.values(this.nodes).map(n => n.left));
    const minY = _.min(_.values(this.nodes).map(n => n.top));

    return this.changePositions(n => n.translate(-minX + 50, -minY + 50, true));
  }

  springyStep() {
    const step = new ForceAlgorithmStep(this);
    step.applyHooksLaw();
    step.applyCoulombsLaw();
    step.applyGravity();
    return this.changePositions(node => step.moveNode(node));
  }

  springyAlg() {
    let res: GraphLayout = this;
    for (let step = 0; step < SPRINGY_STEPS; step++) {
      res = res.springyStep();
    }
    return res;
  }

  // score() {
  //   let res = 0;

  //   for (const n1 of _.values(this.nodes)) {
  //     for (const n2 of _.values(this.nodes)) {
  //       if (n1.node.designerId == n2.node.designerId) {
  //         continue;
  //       }

  //       res += n1.intersectArea(n2);
  //     }
  //   }

  //   const minX = _.min(_.values(this.nodes).map(n => n.left));
  //   const minY = _.min(_.values(this.nodes).map(n => n.top));
  //   const maxX = _.max(_.values(this.nodes).map(n => n.right));
  //   const maxY = _.max(_.values(this.nodes).map(n => n.bottom));

  //   res += maxX - minX;
  //   res += (maxY - minY) * SCORE_ASPECT_RATIO;

  //   return res;
  // }

  // tryMoveNode(node: LayoutNode): GraphLayout[] {
  //   if (node.node.fixedPosition) return [];
  //   return [
  //     this.changePositions(x => (x == node ? node.translate(MOVE_STEP, 0) : x), false),
  //     this.changePositions(x => (x == node ? node.translate(-MOVE_STEP, 0) : x), false),
  //     this.changePositions(x => (x == node ? node.translate(0, MOVE_STEP) : x), false),
  //     this.changePositions(x => (x == node ? node.translate(0, -MOVE_STEP) : x), false),

  //     this.changePositions(x => (x == node ? node.translate(MOVE_BIG_STEP, MOVE_BIG_STEP) : x), false),
  //     this.changePositions(x => (x == node ? node.translate(MOVE_BIG_STEP, -MOVE_BIG_STEP) : x), false),
  //     this.changePositions(x => (x == node ? node.translate(-MOVE_BIG_STEP, MOVE_BIG_STEP) : x), false),
  //     this.changePositions(x => (x == node ? node.translate(-MOVE_BIG_STEP, -MOVE_BIG_STEP) : x), false),
  //   ];
  // }

  // tryMoveElement() {
  //   let res = null;
  //   let resScore = null;

  //   for (const node of _.values(this.nodes)) {
  //     for (const item of this.tryMoveNode(node)) {
  //       const score = item.score();
  //       if (resScore == null || score < resScore) {
  //         res = item;
  //         resScore = score;
  //       }
  //     }
  //   }

  //   return res;
  // }

  // doMoveSteps() {
  //   let res: GraphLayout = this;
  //   let score = res.score();
  //   const start = new Date().getTime();
  //   for (let step = 0; step < MOVE_STEP_COUNT; step++) {
  //     const lastRes = res;
  //     res = res.tryMoveElement();
  //     if (!res) {
  //       lastRes.fillEdges();
  //       return lastRes;
  //     }
  //     const newScore = res.score();
  //     // console.log('STEP, SCORE, NEW SCORE', step, score, newScore);
  //     if (score - newScore < MINIMAL_SCORE_BENEFIT || new Date().getTime() - start > 1000) {
  //       lastRes.fillEdges();
  //       return lastRes;
  //     }
  //     score = newScore;
  //   }
  //   res.fillEdges();
  //   return res;
  // }

  solveOverlaps(): GraphLayout {
    const nodes = _.sortBy(_.values(this.nodes), x => x.position.magnitude());
    const res = new GraphLayout(this.graph);
    for (const node of nodes) {
      const placedNodes = _.values(res.nodes);
      if (placedNodes.find(x => x.hasPaddedIntersect(node))) {
        // if (node.node.designerId.startsWith('ProtocolWinPriceAllocation')) {
        //   console.log('PLACING NODE', node);
        //   console.log('PLACED NODES', placedNodes);
        // }

        // intersection found, must perform moving algorithm
        const xIntervalArray = union(
          ...placedNodes.filter(x => intersection(x.rangeYPadded, node.rangeYPadded)).map(x => x.rangeXPadded)
        );

        const yIntervalArray = union(
          ...placedNodes.filter(x => intersection(x.rangeXPadded, node.rangeXPadded)).map(x => x.rangeYPadded)
        );

        // if (node.node.designerId.startsWith('ProtocolWinPriceAllocation')) {
        //   console.log('xIntervalArray', xIntervalArray);
        //   console.log('yIntervalArray', yIntervalArray);
        // }

        const newX = solveOverlapsInIntervalArray(node.x, node.node.width + NODE_MARGIN * 2, xIntervalArray as any);
        const newY = solveOverlapsInIntervalArray(node.y, node.node.height + NODE_MARGIN * 2, yIntervalArray as any);

        // if (node.node.designerId.startsWith('ProtocolWinPriceAllocation')) {
        //   console.log('NEWXY', newX, newY);
        // }

        const newNode =
          Math.abs(newX - node.x) < Math.abs(newY - node.y)
            ? new LayoutNode(node.node, newX, node.y)
            : new LayoutNode(node.node, node.x, newY);
        res.nodes[node.node.designerId] = newNode;

        // if (placedNodes.find(x => x.hasPaddedIntersect(newNode))) {
        //   console.log('!!!!! LOGICAL ERROR WHEN PLACING', newNode);
        // }
      } else {
        res.nodes[node.node.designerId] = node;
      }
    }
    res.fillEdges();
    return res;
  }

  print() {
    for (const node of _.values(this.nodes)) {
      console.log({
        designerId: node.node.designerId,
        left: node.left,
        top: node.top,
        right: node.right,
        bottom: node.bottom,
      });
    }
  }
}
