const STIFFNESS = 400.0;
const REPULSION = 400.0;
const DAMPING = 0.5;
const MIN_ENERGY = 0.001;
const MASS = 1.0;
const EDGE_LENGTH = 10.0;
const MIN_NODE_DISTANCE = 0.5;
const NODE_DISTANCE_OVERRIDE = 0.05;
const MAX_SPEED = 1000;
const STEP_COUNT = 100;
const TIMESTEP = 0.2;
const MAX_OVERLAPS_MOVES = 100;
const SOLVE_OVERLAPS_FROM_STEP = 90;

export interface ISpringyNodePosition {
  nodeData: any;
  x: number;
  y: number;
  nodeWidth: number;
  nodeHeight: number;
}

interface IBoundingBox {
  bottomleft: Vector;
  topright: Vector;
}

class Vector {
  constructor(public x: number, public y: number) {}

  static random() {
    return new Vector(10.0 * (Math.random() - 0.5), 10.0 * (Math.random() - 0.5));
  }

  add(v2: Vector) {
    return new Vector(this.x + v2.x, this.y + v2.y);
  }

  subtract(v2: Vector) {
    return new Vector(this.x - v2.x, this.y - v2.y);
  }

  multiply(n: number) {
    return new Vector(this.x * n, this.y * n);
  }

  divide(n: number) {
    return new Vector(this.x / n || 0, this.y / n || 0); // Avoid divide by zero errors..
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normal(n: number) {
    return new Vector(-this.y, this.x);
  }

  normalise() {
    return this.divide(this.magnitude());
  }
}

class Node {
  // must be set by renderer
  width: number = 0;
  height: number = 0;

  constructor(public id: number, public data: {}) {}
}

class Edge {
  constructor(public id: number, public source: Node, public target: Node, public data = {}) {
    this.data = data !== undefined ? data : {};
  }
}

export class SpringyGraph {
  nodeSet: { [id: number]: Node } = {};
  nodes: Node[] = [];
  edges: Edge[] = [];
  adjacency = {};

  nextNodeId = 0;
  nextEdgeId = 0;

  addNode(node: Node) {
    if (!(node.id in this.nodeSet)) {
      this.nodes.push(node);
    }

    this.nodeSet[node.id] = node;

    return node;
  }

  addEdge(edge: Edge) {
    var exists = false;
    this.edges.forEach(function (e) {
      if (edge.id === e.id) {
        exists = true;
      }
    });

    if (!exists) {
      this.edges.push(edge);
    }

    if (!(edge.source.id in this.adjacency)) {
      this.adjacency[edge.source.id] = {};
    }
    if (!(edge.target.id in this.adjacency[edge.source.id])) {
      this.adjacency[edge.source.id][edge.target.id] = [];
    }

    exists = false;
    this.adjacency[edge.source.id][edge.target.id].forEach(function (e) {
      if (edge.id === e.id) {
        exists = true;
      }
    });

    if (!exists) {
      this.adjacency[edge.source.id][edge.target.id].push(edge);
    }

    return edge;
  }

  newNode(data: {}) {
    var node = new Node(this.nextNodeId++, data);
    this.addNode(node);
    return node;
  }

  newEdge(source: Node, target: Node, data: {} = {}) {
    var edge = new Edge(this.nextEdgeId++, source, target, data);
    this.addEdge(edge);
    return edge;
  }

  // find the edges from node1 to node2
  getEdges(node1: Node, node2: Node): Edge[] {
    if (node1.id in this.adjacency && node2.id in this.adjacency[node1.id]) {
      return this.adjacency[node1.id][node2.id];
    }

    return [];
  }
}

class ForceDirectedPoint {
  velocity = new Vector(0, 0); // velocity
  acceleration = new Vector(0, 0); // acceleration

  constructor(public position: Vector, public mass: number, public node: Node) {}

  applyForce(force: Vector) {
    // console.log('this.acceleration', this.acceleration);
    this.acceleration = this.acceleration.add(force.divide(this.mass));
    // console.log('this.acceleration', this.acceleration);
  }
}

class ForceDirectedSpring {
  constructor(
    public point1: ForceDirectedPoint,
    public point2: ForceDirectedPoint,
    public length: number,
    public k: number
  ) {}
}

export class ForceDirectedLayout {
  nodePoints: { [id: number]: ForceDirectedPoint } = {}; // keep track of points associated with nodes
  edgeSprings: { [id: number]: ForceDirectedSpring } = {}; // keep track of springs associated with edges

  //   _started = false;
  //   _stop = false;

  constructor(
    public graph: SpringyGraph,
    public stiffnes: number = STIFFNESS,
    public repulsion: number = REPULSION,
    public damping: number = DAMPING,
    public minEnergyThreshold: number = MIN_ENERGY,
    public maxSpeed: number = MAX_SPEED
  ) {
    this.nodePoints = {}; // keep track of points associated with nodes
    this.edgeSprings = {}; // keep track of springs associated with edges
  }

  point(node) {
    if (!(node.id in this.nodePoints)) {
      var mass = node.data.mass !== undefined ? node.data.mass : MASS;
      this.nodePoints[node.id] = new ForceDirectedPoint(Vector.random(), mass, node);
    }

    return this.nodePoints[node.id];
  }

  spring(edge) {
    if (!(edge.id in this.edgeSprings)) {
      var length = edge.data.length !== undefined ? edge.data.length : EDGE_LENGTH;

      var existingSpring: ForceDirectedSpring = null;

      var from = this.graph.getEdges(edge.source, edge.target);
      from.forEach(e => {
        if (!existingSpring && e.id in this.edgeSprings) {
          existingSpring = this.edgeSprings[e.id];
        }
      }, this);

      if (existingSpring) {
        return new ForceDirectedSpring(existingSpring.point1, existingSpring.point2, 0.0, 0.0);
      }

      var to = this.graph.getEdges(edge.target, edge.source);
      from.forEach(e => {
        if (!existingSpring && e.id in this.edgeSprings) {
          existingSpring = this.edgeSprings[e.id];
        }
      }, this);

      if (existingSpring) {
        return new ForceDirectedSpring(existingSpring.point2, existingSpring.point1, 0.0, 0.0);
      }

      this.edgeSprings[edge.id] = new ForceDirectedSpring(
        this.point(edge.source),
        this.point(edge.target),
        length,
        STIFFNESS
      );
    }

    return this.edgeSprings[edge.id];
  }

  // callback should accept two arguments: Node, Point
  eachNode(callback: (node: Node, point: ForceDirectedPoint) => void) {
    this.graph.nodes.forEach(n => {
      callback(n, this.point(n));
    });
  }

  // callback should accept two arguments: Edge, Spring
  eachEdge(callback: (node: Edge, spring: ForceDirectedSpring) => void) {
    this.graph.edges.forEach(function (e) {
      callback(e, this.spring(e));
    });
  }

  // callback should accept one argument: Spring
  eachSpring(callback: (spring: ForceDirectedSpring) => void) {
    this.graph.edges.forEach(e => {
      callback(this.spring(e));
    });
  }

  // Physics stuff
  applyCoulombsLaw() {
    this.eachNode((n1, point1) => {
      this.eachNode((n2, point2) => {
        if (point1 !== point2) {
          var d = point1.position.subtract(point2.position);
          var direction = d.normalise();

          //   var distance = d.magnitude() + 0.1; // avoid massive forces at small distances (and divide by zero)
          var distance = rectangle_distance(
            point1.position.x - n1.width / 2,
            point1.position.y - n1.height / 2,
            point1.position.x + n1.width / 2,
            point1.position.y + n1.height / 2,
            point2.position.x - n2.width / 2,
            point2.position.y - n2.height / 2,
            point2.position.x + n2.width / 2,
            point2.position.y + n2.height / 2
          );

          if (distance == null) distance = NODE_DISTANCE_OVERRIDE;
          else distance += MIN_NODE_DISTANCE;

          //   console.log('point1.position', point1.position);
          //   console.log('point2.position', point2.position);
          //   console.log('DIST', distance);

          // apply force to each end point
          point1.applyForce(direction.multiply(this.repulsion).divide(distance * distance * 0.5));
          point2.applyForce(direction.multiply(this.repulsion).divide(distance * distance * -0.5));
        }
      });
    });
  }

  applyHookesLaw() {
    this.eachSpring(spring => {
      var d = spring.point2.position.subtract(spring.point1.position); // the direction of the spring

      let point1 = spring.point1;
      let point2 = spring.point2;
      let n1 = point1.node;
      let n2 = point2.node;
      var distance = rectangle_distance(
        point1.position.x - n1.width / 2,
        point1.position.y - n1.height / 2,
        point1.position.x + n1.width / 2,
        point1.position.y + n1.height / 2,
        point2.position.x - n2.width / 2,
        point2.position.y - n2.height / 2,
        point2.position.x + n2.width / 2,
        point2.position.y + n2.height / 2
      );

      //var displacement = spring.length - d.magnitude();
      //console.log('Length', spring.length, 'distance', distance);
      var displacement = spring.length - distance;
      var direction = d.normalise();

      // apply force to each end point
      spring.point1.applyForce(direction.multiply(spring.k * displacement * -0.5));
      spring.point2.applyForce(direction.multiply(spring.k * displacement * 0.5));
    });
  }

  attractToCentre() {
    this.eachNode((node, point) => {
      var direction = point.position.multiply(-1.0);
      point.applyForce(direction.multiply(this.repulsion / 50.0));
    });
  }

  updateVelocity(timestep: number) {
    this.eachNode((node, point) => {
      // Is this, along with updatePosition below, the only places that your
      // integration code exist?
      point.velocity = point.velocity.add(point.acceleration.multiply(timestep)).multiply(this.damping);
      if (point.velocity.magnitude() > this.maxSpeed) {
        point.velocity = point.velocity.normalise().multiply(this.maxSpeed);
      }
      point.acceleration = new Vector(0, 0);
    });
  }

  updatePosition(timestep: number) {
    this.eachNode((node, point) => {
      // Same question as above; along with updateVelocity, is this all of
      // your integration code?
      point.position = point.position.add(point.velocity.multiply(timestep));
    });
  }

  solveOverlaps() {
    this.eachNode((n1, point1) => {
      for (let i = 0; i < MAX_OVERLAPS_MOVES; i += 1) {
        let overlap = false;
        this.eachNode((n2, point2) => {
          if (n1 == n2) return;
          const distance = rectangle_distance(
            point1.position.x - n1.width / 2,
            point1.position.y - n1.height / 2,
            point1.position.x + n1.width / 2,
            point1.position.y + n1.height / 2,
            point2.position.x - n2.width / 2,
            point2.position.y - n2.height / 2,
            point2.position.x + n2.width / 2,
            point2.position.y + n2.height / 2
          );
          if (distance == null) {
            overlap = true;
          }
        });
        if (!overlap) {
          break;
        }
        point1.position = point1.position.add(point1.velocity.multiply(TIMESTEP));
      }
    });
  }

  // Calculate the total kinetic energy of the system
  totalEnergy() {
    var energy = 0.0;
    this.eachNode((node, point) => {
      var speed = point.velocity.magnitude();
      energy += 0.5 * point.mass * speed * speed;
    });

    return energy;
  }

  //   start(render, onRenderStop, onRenderStart) {
  //     var t = this;

  //     if (this._started) return;
  //     this._started = true;
  //     this._stop = false;

  //     if (onRenderStart !== undefined) {
  //       onRenderStart();
  //     }

  //     window.requestAnimationFrame(function step() {
  //       t.tick(0.03);

  //       if (render !== undefined) {
  //         render();
  //       }

  //       // stop simulation when energy of the system goes below a threshold
  //       if (t._stop || t.totalEnergy() < t.minEnergyThreshold) {
  //         t._started = false;
  //         if (onRenderStop !== undefined) {
  //           onRenderStop();
  //         }
  //       } else {
  //         window.requestAnimationFrame(step);
  //       }
  //     });
  //   }

  //   stop() {
  //     this._stop = true;
  //   }

  tick(timestep: number, stepNumber) {
    // for(let nodeid in this.nodePoints) {
    //     console.log(this.nodePoints[nodeid].position);
    // }
    this.applyCoulombsLaw();
    this.applyHookesLaw();
    this.attractToCentre();
    this.updateVelocity(timestep);
    this.updatePosition(timestep);
    if (stepNumber >= SOLVE_OVERLAPS_FROM_STEP) {
      this.solveOverlaps();
    }
  }
  compute(): ISpringyNodePosition[] {
    for (let i = 0; i < STEP_COUNT; i += 1) {
      this.tick(TIMESTEP, i);
    }
    const positions = [];
    const boundingBox = this.getBoundingBox();
    this.eachNode((node, point) => {
      positions.push({
        nodeData: node.data,
        x: point.position.x - boundingBox.bottomleft.x,
        y: point.position.y - boundingBox.bottomleft.y,
        nodeWidth: node.width,
        nodeHeight: node.height,
      });
    });
    return positions;
  }

  getBoundingBox(): IBoundingBox {
    var bottomleft = new Vector(-2, -2);
    var topright = new Vector(2, 2);

    this.eachNode((n, point) => {
      if (point.position.x - n.width / 2 < bottomleft.x) {
        bottomleft.x = point.position.x - n.width / 2;
      }
      if (point.position.y - n.height / 2 < bottomleft.y) {
        bottomleft.y = point.position.y - n.height / 2;
      }
      if (point.position.x + n.width / 2 > topright.x) {
        topright.x = point.position.x + n.width / 2;
      }
      if (point.position.y + n.height / 2 > topright.y) {
        topright.y = point.position.y + n.height / 2;
      }
    });

    var padding = topright.subtract(bottomleft).multiply(0.07); // ~5% padding

    return { bottomleft: bottomleft.subtract(padding), topright: topright.add(padding) };
  }
  // Find the nearest point to a particular position
  nearest(pos: Vector) {
    var min = { node: null, point: null, distance: null };
    var t = this;
    this.graph.nodes.forEach(function (n) {
      var point = t.point(n);
      var distance = point.position.subtract(pos).magnitude();

      if (min.distance === null || distance < min.distance) {
        min = { node: n, point: point, distance: distance };
      }
    });

    return min;
  }

  //   // returns [bottomleft, topright]
  //   getBoundingBox(): IBoundingBox {
  //     var bottomleft = new Vector(-2, -2);
  //     var topright = new Vector(2, 2);

  //     this.eachNode((n, point) => {
  //       if (point.position.x - n.width / 2 < bottomleft.x) {
  //         bottomleft.x = point.position.x - n.width / 2;
  //       }
  //       if (point.position.y - n.height / 2 < bottomleft.y) {
  //         bottomleft.y = point.position.y - n.height / 2;
  //       }
  //       if (point.position.x + n.width / 2 > topright.x) {
  //         topright.x = point.position.x + n.width / 2;
  //       }
  //       if (point.position.y + n.height / 2 > topright.y) {
  //         topright.y = point.position.y + n.height / 2;
  //       }
  //     });

  //     var padding = topright.subtract(bottomleft).multiply(0.07); // ~5% padding

  //     return { bottomleft: bottomleft.subtract(padding), topright: topright.add(padding) };
  //   }
}

// export abstract class RendererBase {
//   layout: ForceDirectedLayout;

//   constructor(public graph: Graph) {
//     this.layout = new ForceDirectedLayout(graph);
//   }

//   start() {
//     this.layout.start(
//       () => {
//         let positions: INodePosition[] = [];

//         this.layout.eachNode((node, point) => {
//           positions.push({
//             nodeData: node.data,
//             x: point.position.x,
//             y: point.position.y,
//             nodeWidth: node.width,
//             nodeHeight: node.height,
//           });
//         });

//         this.updateNodePositions(positions);
//       },
//       this.onRenderStop.bind(this),
//       this.onRenderStart.bind(this)
//     );
//   }

//   abstract updateNodePositions(positions: INodePosition[]);
//   onRenderStop() {}
//   onRenderStart() {}

//   stop() {
//     this.layout.stop();
//   }
// }

function rectangle_distance(
  x1: number,
  y1: number,
  x1b: number,
  y1b: number,
  x2: number,
  y2: number,
  x2b: number,
  y2b: number
) {
  function dist(x1: number, y1: number, x2: number, y2: number) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  let left = x2b < x1;
  let right = x1b < x2;
  let bottom = y2b < y1;
  let top = y1b < y2;

  if (top && left) return dist(x1, y1b, x2b, y2);
  else if (left && bottom) return dist(x1, y1, x2b, y2b);
  else if (bottom && right) return dist(x1b, y1, x2, y2b);
  else if (right && top) return dist(x1b, y1b, x2, y2);
  else if (left) return x1 - x2b;
  else if (right) return x2 - x1b;
  else if (bottom) return y1 - y2b;
  else if (top) return y2 - y1b;
  // rectangles intersect
  else return null;
}
