import { intersection, arrayDifference } from 'interval-operations';
import _ from 'lodash';

export interface IPoint {
  x: number;
  y: number;
}

export interface IBoxBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// helpers for figuring out where to draw arrows
export function intersectLineLine(p1: IPoint, p2: IPoint, p3: IPoint, p4: IPoint): IPoint {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  // lines are parallel
  if (denom === 0) {
    return null;
  }

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null;
  }

  return {
    x: p1.x + ua * (p2.x - p1.x),
    y: p1.y + ua * (p2.y - p1.y),
  };
}

export function intersectLineBox(p1: IPoint, p2: IPoint, box: IBoxBounds): IPoint[] {
  const tl = { x: box.left, y: box.top };
  const tr = { x: box.right, y: box.top };
  const bl = { x: box.left, y: box.bottom };
  const br = { x: box.right, y: box.bottom };

  const res = [];
  let item;
  if ((item = intersectLineLine(p1, p2, tl, tr))) {
    res.push(item);
  } // top
  if ((item = intersectLineLine(p1, p2, tr, br))) {
    res.push(item);
  } // right
  if ((item = intersectLineLine(p1, p2, br, bl))) {
    res.push(item);
  } // bottom
  if ((item = intersectLineLine(p1, p2, bl, tl))) {
    res.push(item);
  } // left

  return res;
}

export function rectangleDistance(r1: IBoxBounds, r2: IBoxBounds) {
  function dist(x1: number, y1: number, x2: number, y2: number) {
    let dx = x1 - x2;
    let dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const x1 = r1.left;
  const y1 = r1.top;
  const x1b = r1.right;
  const y1b = r1.bottom;
  const x2 = r2.left;
  const y2 = r2.top;
  const x2b = r2.right;
  const y2b = r2.bottom;

  const left = x2b < x1;
  const right = x1b < x2;
  const bottom = y2b < y1;
  const top = y1b < y2;

  if (top && left) return dist(x1, y1b, x2b, y2);
  else if (left && bottom) return dist(x1, y1, x2b, y2b);
  else if (bottom && right) return dist(x1b, y1, x2, y2b);
  else if (right && top) return dist(x1b, y1b, x2, y2);
  else if (left) return x1 - x2b;
  else if (right) return x2 - x1b;
  else if (bottom) return y1 - y2b;
  else if (top) return y2 - y1b;
  // rectangles intersect
  else return 0;
}

export function rectangleIntersectArea(rect1: IBoxBounds, rect2: IBoxBounds) {
  const x_overlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
  const y_overlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
  // console.log('rectangleIntersectArea', rect1, rect2, x_overlap * y_overlap);
  // if (rect1.left < 100 && rect2.left < 100) {
  //   console.log('rectangleIntersectArea', rect1, rect2, x_overlap * y_overlap);
  // }
  return x_overlap * y_overlap;
}

export function rectanglesHaveIntersection(rect1: IBoxBounds, rect2: IBoxBounds) {
  const xIntersection = intersection([rect1.left, rect1.right], [rect2.left, rect2.right]);
  const yIntersection = intersection([rect1.top, rect1.bottom], [rect2.top, rect2.bottom]);

  return !!xIntersection && !!yIntersection;
}

export class Vector2D {
  constructor(public x: number, public y: number) {}

  static random() {
    return new Vector2D(10.0 * (Math.random() - 0.5), 10.0 * (Math.random() - 0.5));
  }

  add(v2: Vector2D) {
    return new Vector2D(this.x + v2.x, this.y + v2.y);
  }

  subtract(v2: Vector2D) {
    return new Vector2D(this.x - v2.x, this.y - v2.y);
  }

  multiply(n: number) {
    return new Vector2D(this.x * n, this.y * n);
  }

  divide(n: number) {
    return new Vector2D(this.x / n || 0, this.y / n || 0); // Avoid divide by zero errors..
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normal(n: number) {
    return new Vector2D(-this.y, this.x);
  }

  normalise() {
    return this.divide(this.magnitude());
  }
}

export function solveOverlapsInIntervalArray(position: number, size: number, usedIntervals: [number, number][]) {
  const freeIntervals = arrayDifference([[-Infinity, Infinity]], usedIntervals) as [number, number][];

  const candidates = [];

  for (const interval of freeIntervals) {
    const intervalSize = interval[1] - interval[0];
    if (intervalSize < size) continue;
    if (interval[1] < position) {
      candidates.push(interval[1] - size / 2);
    } else if (interval[0] > position) {
      candidates.push(interval[0] + size / 2);
    } else {
      // position is in interval
      let candidate = position;
      if (candidate - size / 2 < interval[0]) candidate = interval[0] + size / 2;
      if (candidate + size / 2 > interval[1]) candidate = interval[1] - size / 2;
      candidates.push(candidate);
    }
  }

  return _.minBy(candidates, x => Math.abs(x - position));
}
