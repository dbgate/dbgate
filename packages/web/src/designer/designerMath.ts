interface IPoint {
  x: number;
  y: number;
}

interface IBoxBounds {
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
