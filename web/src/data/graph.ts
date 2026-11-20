// Simplified, simulated tunnel graph. Inspired by the layout of a campus sanitary sewer map:
// manholes become junction nodes, pipe runs become tunnel segments. All data is simulated.

export interface LevelInfo {
  id: number;
  name: string;
  depth: number;
  /** thousands of residents in this simulated sector */
  population: number;
  /** last known temperature in C (unverified baseline) */
  baseTemp: number;
  color: string;
}

export interface GNode {
  id: string;
  label: string;
  level: number;
  x: number;
  y: number;
}

export interface GEdge {
  id: string;
  from: string;
  to: string;
}

export const LEVELS: LevelInfo[] = [
  { id: 1, name: 'Upper Terrace', depth: 1, population: 40, baseTemp: 22, color: '#7fd6ff' },
  { id: 2, name: 'Concourse', depth: 2, population: 60, baseTemp: 25, color: '#5fe0c0' },
  { id: 3, name: 'Midworks', depth: 3, population: 90, baseTemp: 29, color: '#c5e26b' },
  { id: 4, name: 'Lowtown', depth: 4, population: 130, baseTemp: 33, color: '#ffc94d' },
  { id: 5, name: 'The Sump', depth: 5, population: 170, baseTemp: 37, color: '#ff9150' },
  { id: 6, name: 'Deepgate', depth: 6, population: 210, baseTemp: 41, color: '#ff5a4d' },
];

const n = (id: string, level: number, x: number, y: number, label = `Junction ${id}`): GNode => ({ id, label, level, x, y });

export const NODES: GNode[] = [
  n('026', 1, 80, 70), n('027', 1, 170, 140), n('435', 1, 260, 90), n('436', 1, 340, 55),
  n('028', 2, 250, 205), n('029', 2, 340, 230), n('030', 2, 430, 240), n('437', 2, 430, 140),
  n('031', 3, 520, 280), n('032', 3, 600, 315), n('451', 3, 540, 375), n('452', 3, 630, 395),
  n('033', 4, 700, 345), n('034', 4, 765, 400), n('035', 4, 700, 455), n('447', 4, 830, 330),
  n('036', 5, 780, 490), n('037', 5, 865, 440), n('038', 5, 910, 510), n('453', 5, 690, 545),
  n('039', 6, 820, 575), n('040', 6, 930, 585), n('473', 6, 965, 470), n('474', 6, 740, 600),
];

const pairs: [string, string][] = [
  ['026', '027'], ['027', '028'], ['027', '435'], ['435', '436'], ['435', '437'],
  ['028', '029'], ['029', '030'], ['030', '437'], ['030', '031'], ['031', '032'],
  ['032', '033'], ['031', '451'], ['451', '452'], ['452', '033'], ['032', '452'],
  ['033', '034'], ['033', '447'], ['034', '035'], ['034', '037'], ['035', '036'],
  ['451', '035'], ['036', '037'], ['037', '038'], ['036', '453'], ['453', '474'],
  ['474', '039'], ['036', '039'], ['039', '040'], ['038', '040'], ['038', '473'],
];

export const EDGES: GEdge[] = pairs.map(([from, to]) => ({ id: `${from}-${to}`, from, to }));

export const NODE_BY_ID = new Map(NODES.map((x) => [x.id, x]));
export const EDGE_BY_ID = new Map(EDGES.map((x) => [x.id, x]));
export const LEVEL_BY_ID = new Map(LEVELS.map((x) => [x.id, x]));

export function edgeLength(e: GEdge): number {
  const a = NODE_BY_ID.get(e.from)!;
  const b = NODE_BY_ID.get(e.to)!;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function incidentEdges(nodeId: string): GEdge[] {
  return EDGES.filter((e) => e.from === nodeId || e.to === nodeId);
}

/** Level of a report target. An edge belongs to the deeper of its two endpoints. */
export function levelOfTarget(kind: 'node' | 'edge', id: string): number {
  if (kind === 'node') return NODE_BY_ID.get(id)?.level ?? 1;
  const e = EDGE_BY_ID.get(id);
  if (!e) return 1;
  return Math.max(NODE_BY_ID.get(e.from)!.level, NODE_BY_ID.get(e.to)!.level);
}

export function targetLabel(kind: 'node' | 'edge', id: string): string {
  if (kind === 'node') return `Junction ${id}`;
  const e = EDGE_BY_ID.get(id);
  return e ? `Tunnel ${e.from}–${e.to}` : id;
}
