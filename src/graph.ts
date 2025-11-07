export type ArtistNode = {
  id: string;
  name: string;
  communityId?: string;
  // Additional metadata welcome, but kept open-ended
  [key: string]: unknown;
};

export type EdgeMeta = {
  source: string;
  target: string;
  weight?: number;
  relation?: string;
  [key: string]: unknown;
};

export type GraphData = {
  nodes: ArtistNode[];
  edges: EdgeMeta[];
};

export class Graph {
  private adjacency: Map<string, Map<string, number>>;
  public nodeData: Map<string, ArtistNode>;

  constructor() {
    this.adjacency = new Map();
    this.nodeData = new Map();
  }

  addNode(node: ArtistNode): void {
    const id = node.id ?? node.name;
    if (!id) throw new Error('Node must have an id or name');
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Map());
    this.nodeData.set(id, { id, ...node });
  }

  addEdge(a: string, b: string, weight: number = 1, _meta: EdgeMeta | Record<string, unknown> = {}): void {
    if (!this.adjacency.has(a)) this.addNode({ id: a, name: a });
    if (!this.adjacency.has(b)) this.addNode({ id: b, name: b });
    this.adjacency.get(a)!.set(b, weight);
    this.adjacency.get(b)!.set(a, weight);
  }

  neighbors(id: string): string[] {
    return Array.from(this.adjacency.get(id)?.keys() ?? []);
  }

  degree(id: string): number {
    return this.adjacency.get(id)?.size ?? 0;
  }

  nodes(): string[] {
    return Array.from(this.adjacency.keys());
  }

  edges(): Array<[string, string]> {
    const seen = new Set<string>();
    const all: Array<[string, string]> = [];
    for (const [a, nbrs] of this.adjacency.entries()) {
      for (const b of nbrs.keys()) {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push([a, b]);
      }
    }
    return all;
  }

  shortestPath(source: string, target: string): string[] | null {
    if (!this.adjacency.has(source) || !this.adjacency.has(target)) return null;
    if (source === target) return [source];
    const queue: string[] = [source];
    const visited = new Set<string>([source]);
    const parent = new Map<string, string>();

    while (queue.length) {
      const current = queue.shift()!;
      for (const nbr of this.neighbors(current)) {
        if (visited.has(nbr)) continue;
        visited.add(nbr);
        parent.set(nbr, current);
        if (nbr === target) {
          return this.reconstructPath(parent, source, target);
        }
        queue.push(nbr);
      }
    }
    return null;
  }

  private reconstructPath(parent: Map<string, string>, source: string, target: string): string[] | null {
    const path: string[] = [target];
    let cur: string | undefined = target;
    while (cur !== source) {
      cur = parent.get(cur!);
      if (cur == null) return null;
      path.push(cur);
    }
    return path.reverse();
  }

  degreeCentrality(normalize: boolean = false): Map<string, number> {
    const N = this.adjacency.size;
    const scale = normalize && N > 1 ? 1 / (N - 1) : 1;
    const result = new Map<string, number>();
    for (const id of this.nodes()) {
      result.set(id, this.degree(id) * scale);
    }
    return result;
  }

  connectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const start of this.nodes()) {
      if (visited.has(start)) continue;
      const comp: string[] = [];
      const stack: string[] = [start];
      visited.add(start);
      while (stack.length) {
        const node = stack.pop()!;
        comp.push(node);
        for (const nbr of this.neighbors(node)) {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            stack.push(nbr);
          }
        }
      }
      components.push(comp);
    }
    return components;
  }

  assignCommunities(): string[][] {
    const components = this.connectedComponents();
    components.forEach((comp, idx) => {
      const communityId = `C${idx + 1}`;
      for (const id of comp) {
        const data = this.nodeData.get(id) || { id, name: id };
        this.nodeData.set(id, { ...data, communityId });
      }
    });
    return components;
  }
}

export async function loadGraphFromJson(url: string): Promise<Graph> {
  const res = await fetch(url);
  const data = (await res.json()) as GraphData;
  const graph = new Graph();
  for (const n of data.nodes) graph.addNode(n);
  for (const e of data.edges) graph.addEdge(e.source, e.target, e.weight ?? 1, e);
  graph.assignCommunities();
  return graph;
}


