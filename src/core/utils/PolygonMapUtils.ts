export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Returns vertices of a regular polygon centered at (cx, cy).
 * The inscribed circle radius (apothem) is kept constant so playable area feels consistent.
 * First vertex points upward (angle = -PI/2).
 */
export function getPolygonVertices(sides: number, inscribedRadius: number, cx: number, cy: number): Vec2[] {
  const circumradius = inscribedRadius / Math.cos(Math.PI / sides);
  const vertices: Vec2[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / sides;
    vertices.push({
      x: cx + circumradius * Math.cos(angle),
      y: cy + circumradius * Math.sin(angle),
    });
  }
  return vertices;
}

/**
 * Point-in-convex-polygon test. Works for convex polygons (regular polygons are convex).
 * Uses cross-product winding method for reliability.
 */
export function isInsidePolygon(px: number, py: number, vertices: Vec2[]): boolean {
  const n = vertices.length;
  let positive = 0;
  let negative = 0;
  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];
    const cross = (v2.x - v1.x) * (py - v1.y) - (v2.y - v1.y) * (px - v1.x);
    if (cross > 0) positive++;
    else if (cross < 0) negative++;
    if (positive > 0 && negative > 0) return false;
  }
  return true;
}

/**
 * Pushes a point back inside the polygon if it's outside.
 * Returns the closest point on the polygon boundary (with inward offset).
 */
export function clampToPolygon(px: number, py: number, vertices: Vec2[], inset: number = 10): Vec2 {
  if (isInsidePolygon(px, py, vertices)) return { x: px, y: py };

  let closestDist = Infinity;
  let closest: Vec2 = { x: px, y: py };
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const pt = closestPointOnSegment(px, py, a, b);
    const dx = px - pt.x;
    const dy = py - pt.y;
    const dist = dx * dx + dy * dy;
    if (dist < closestDist) {
      closestDist = dist;
      closest = pt;
    }
  }

  // Push slightly inward from edge
  const cx = vertices.reduce((s, v) => s + v.x, 0) / n;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / n;
  const dx = cx - closest.x;
  const dy = cy - closest.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    closest.x += (dx / len) * inset;
    closest.y += (dy / len) * inset;
  }

  return closest;
}

function closestPointOnSegment(px: number, py: number, a: Vec2, b: Vec2): Vec2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = px - a.x;
  const apy = py - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));
  return { x: a.x + t * abx, y: a.y + t * aby };
}

/**
 * Returns a random point inside the polygon using rejection sampling.
 * Computes bounding box once, then samples until inside.
 */
export function randomPointInPolygon(vertices: Vec2[], margin: number = 50): Vec2 {
  const minX = Math.min(...vertices.map(v => v.x)) + margin;
  const maxX = Math.max(...vertices.map(v => v.x)) - margin;
  const minY = Math.min(...vertices.map(v => v.y)) + margin;
  const maxY = Math.max(...vertices.map(v => v.y)) - margin;

  for (let attempt = 0; attempt < 1000; attempt++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    if (isInsidePolygon(x, y, vertices)) return { x, y };
  }
  // Fallback to center
  const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;
  return { x: cx, y: cy };
}

/**
 * Generates star polygon vertices for the victory visual at map center.
 * A star with N outer points, alternating between outer and inner radius.
 */
export function getStarShape(sides: number, outerRadius: number, innerRadius: number, center: Vec2): Vec2[] {
  const points: Vec2[] = [];
  const totalPoints = sides * 2;
  for (let i = 0; i < totalPoints; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / totalPoints;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    points.push({
      x: center.x + r * Math.cos(angle),
      y: center.y + r * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Returns the circumradius for a given inscribed radius and number of sides.
 */
export function getCircumradius(inscribedRadius: number, sides: number): number {
  return inscribedRadius / Math.cos(Math.PI / sides);
}

/**
 * Computes approximate polygon area for scaling entity counts.
 */
export function polygonArea(vertices: Vec2[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}
