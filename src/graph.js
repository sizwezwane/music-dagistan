export class Graph {
  constructor() {
    this.adjacency = new Map(); // Map<string, Map<string, number>> weights optional
    this.nodeData = new Map(); // Map<string, { id, name, communityId?: string, [any] }>
  }

  addNode(node) {
    const id = node.id ?? node.name;
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Map());
    this.nodeData.set(id, { id, ...node });
  }

  addEdge(a, b, weight = 1, meta = {}) {
    if (!this.adjacency.has(a)) this.addNode({ id: a, name: a });
    if (!this.adjacency.has(b)) this.addNode({ id: b, name: b });
    this.adjacency.get(a).set(b, weight);
    this.adjacency.get(b).set(a, weight);
    // Optionally attach relationship info onto node data for reference
    this.nodeData.set(a, { ...this.nodeData.get(a) });
    this.nodeData.set(b, { ...this.nodeData.get(b) });
    // meta can be stored in a separate structure if needed in future
  }

  neighbors(id) {
    return Array.from(this.adjacency.get(id)?.keys() ?? []);
  }

  degree(id) {
    return this.adjacency.get(id)?.size ?? 0;
  }

  nodes() {
    return Array.from(this.adjacency.keys());
  }

  edges() {
    const seen = new Set();
    const all = [];
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

  // Unweighted shortest path using BFS
  shortestPath(source, target) {
    if (!this.adjacency.has(source) || !this.adjacency.has(target)) return null;
    if (source === target) return [source];
    const queue = [source];
    const visited = new Set([source]);
    const parent = new Map();

    while (queue.length) {
      const current = queue.shift();
      for (const nbr of this.neighbors(current)) {
        if (visited.has(nbr)) continue;
        visited.add(nbr);
        parent.set(nbr, current);
        if (nbr === target) {
          return this.#reconstructPath(parent, source, target);
        }
        queue.push(nbr);
      }
    }
    return null;
  }

  #reconstructPath(parent, source, target) {
    const path = [target];
    let cur = target;
    while (cur !== source) {
      cur = parent.get(cur);
      if (cur == null) return null;
      path.push(cur);
    }
    return path.reverse();
  }

  // Degree centrality (normalized optional)
  degreeCentrality(normalize = false) {
    const N = this.adjacency.size;
    const scale = normalize && N > 1 ? 1 / (N - 1) : 1;
    const result = new Map();
    for (const id of this.nodes()) {
      result.set(id, this.degree(id) * scale);
    }
    return result;
  }

  // Simple community detection via connected components
  connectedComponents() {
    const visited = new Set();
    const components = [];
    for (const start of this.nodes()) {
      if (visited.has(start)) continue;
      const comp = [];
      const stack = [start];
      visited.add(start);
      while (stack.length) {
        const node = stack.pop();
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

  assignCommunities() {
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

export async function loadGraphFromJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  const graph = new Graph();
  // data = { nodes: [{id, name, ...}], edges: [{source, target, weight, relation}] }
  for (const n of data.nodes) graph.addNode(n);
  for (const e of data.edges) graph.addEdge(e.source, e.target, e.weight ?? 1, e);
  graph.assignCommunities();
  return graph;
}


