import { Graph, loadGraphFromJson } from './graph.js';
import * as d3 from 'd3';

type NodeDatum = {
  id: string;
  name: string;
  communityId: string;
  degree: number;
  centrality: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

type LinkDatum = { source: string | NodeDatum; target: string | NodeDatum };

const svg = d3.select<SVGSVGElement, unknown>('#graph');
const width = () => (svg.node() as SVGSVGElement).clientWidth;
const height = () => (svg.node() as SVGSVGElement).clientHeight;

const state: {
  graph: Graph | null;
  sim: d3.Simulation<NodeDatum, undefined> | null;
  selected: string | null;
  path: string[];
  nodesSel: d3.Selection<SVGGElement, NodeDatum, SVGGElement, unknown> | null;
  linksSel: d3.Selection<SVGLineElement, d3.SimulationLinkDatum<NodeDatum>, SVGGElement, unknown> | null;
  labelsSel: d3.Selection<SVGTextElement, NodeDatum, SVGGElement, unknown> | null;
} = {
  graph: null,
  sim: null,
  selected: null,
  path: [],
  nodesSel: null,
  linksSel: null,
  labelsSel: null,
};

function colorForCommunity(id: string): string {
  const colors = ['#60a5fa', '#34d399', '#f472b6', '#f59e0b', '#a78bfa', '#22d3ee', '#fb7185'];
  const idx = Math.abs(hashCode(id)) % colors.length;
  return colors[idx];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function render(graph: Graph): void {
  const centrality = graph.degreeCentrality(true);

  svg.selectAll('*').remove();
  const g = svg.append('g');

  const linkData: LinkDatum[] = graph.edges().map(([a, b]) => ({ source: a, target: b }));
  const nodeData: NodeDatum[] = graph.nodes().map((id) => {
    const info = graph.nodeData.get(id) || { id, name: id };
    return {
      id,
      name: info.name ?? id,
      communityId: info.communityId ?? 'C0',
      degree: graph.degree(id),
      centrality: centrality.get(id) ?? 0,
    };
  });

  const link = g
    .selectAll<SVGLineElement, d3.SimulationLinkDatum<NodeDatum>>('line')
    .data(linkData as unknown as d3.SimulationLinkDatum<NodeDatum>[]) // cast for D3 link force typing
    .join('line')
    .attr('class', 'edge');

  const node = g
    .selectAll<SVGGElement, NodeDatum>('g.node')
    .data(nodeData, (d: any) => d.id)
    .join((enter) => {
      const group = enter.append('g').attr('class', 'node');
      group
        .append('circle')
        .attr('r', (d) => 6 + Math.max(2, d.degree))
        .attr('fill', (d) => colorForCommunity(d.communityId))
        .attr('stroke', '#0b0f17');
      group.append('title').text((d) => `${d.name}\nDegree: ${d.degree}`);
      return group;
    });

  const labels = g
    .selectAll<SVGTextElement, NodeDatum>('text.node-label')
    .data(nodeData)
    .join('text')
    .attr('class', 'node-label')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', -12);

  node.call(
    d3
      .drag<SVGGElement, NodeDatum>()
      .on('start', (event, d) => {
        if (!state.sim) return;
        if (!event.active) state.sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!state.sim) return;
        if (!event.active) state.sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
  );

  const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
    g.attr('transform', (event.transform as unknown) as string);
  });
  svg.call(zoom);

  const sim = d3
    .forceSimulation<NodeDatum>(nodeData)
    .force('link', d3.forceLink<NodeDatum, d3.SimulationLinkDatum<NodeDatum>>(linkData).id((d) => d.id).distance(50).strength(0.3))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(0, 0))
    .force('collide', d3.forceCollide<NodeDatum>().radius((d) => 10 + Math.max(2, d.degree)))
    .on('tick', () => {
      link
        .attr('x1', (d) => (d.source as NodeDatum).x!)
        .attr('y1', (d) => (d.source as NodeDatum).y!)
        .attr('x2', (d) => (d.target as NodeDatum).x!)
        .attr('y2', (d) => (d.target as NodeDatum).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      labels.attr('x', (d) => d.x!).attr('y', (d) => d.y! - 12);
    });

  const fit = () => {
    const bounds = (g.node() as SVGGElement).getBBox();
    const fullWidth = width();
    const fullHeight = height();
    if (bounds.width === 0 || bounds.height === 0) return;
    const scale = 0.9 / Math.max(bounds.width / fullWidth, bounds.height / fullHeight);
    const translate = [fullWidth / 2 - scale * (bounds.x + bounds.width / 2), fullHeight / 2 - scale * (bounds.y + bounds.height / 2)];
    svg
      .transition()
      .duration(300)
      .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  };

  setTimeout(fit, 100);

  state.graph = graph;
  state.sim = sim;
  state.nodesSel = node;
  state.linksSel = link;
  state.labelsSel = labels;

  node.on('click', (_event, d) => {
    highlightSelection(d.id);
    showDetails(d.id);
  });

  window.addEventListener('resize', () => {
    if (!state.sim) return;
    state.sim.alpha(0.2).restart();
    setTimeout(fit, 100);
  });
}

function highlightSelection(id: string): void {
  if (!state.graph || !state.nodesSel || !state.linksSel) return;
  const nbrs = new Set<string>(state.graph.neighbors(id).concat([id]));
  state.nodesSel.classed('highlight', (d) => d.id === id).classed('dim', (d) => !nbrs.has(d.id));
  state.linksSel.classed('dim', (d) => {
    const a = (d.source as NodeDatum).id ?? (d.source as unknown as string);
    const b = (d.target as NodeDatum).id ?? (d.target as unknown as string);
    return !(nbrs.has(a) && nbrs.has(b));
  });
}

function clearHighlights(): void {
  if (!state.nodesSel || !state.linksSel) return;
  state.nodesSel.classed('highlight', false).classed('dim', false);
  state.linksSel.classed('dim', false).classed('path-highlight', false);
}

function showDetails(id: string): void {
  if (!state.graph) return;
  const el = document.getElementById('details')!;
  const data = state.graph.nodeData.get(id) || { id, name: id };
  const deg = state.graph.degree(id);
  const nbrs = state.graph.neighbors(id);
  el.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <strong style="font-size:16px;">${(data as any).name}</strong>
        <span class="badge">${(data as any).communityId ?? 'C?'}</span>
      </div>
      <div class="legend" style="margin:8px 0 6px;">
        <span>Degree: <strong>${deg}</strong></span>
      </div>
      <div style="margin-top:8px;">
        <div style="color:#94a3b8;margin-bottom:4px;">Neighbors</div>
        <div>${nbrs.map((n) => `<span class="badge">${(state.graph!.nodeData.get(n) as any)?.name ?? n}</span>`).join(' ') || '<em>None</em>'}</div>
      </div>
    </div>
  `;
}

function populateCommunities(graph: Graph): void {
  const select = document.getElementById('communitySelect') as HTMLSelectElement;
  const communities = new Map<string, number>();
  for (const id of graph.nodes()) {
    const c = graph.nodeData.get(id)?.communityId ?? 'C0';
    communities.set(c, (communities.get(c) ?? 0) + 1);
  }
  const options = Array.from(communities.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  select.innerHTML = '<option value="all">All</option>' + options.map(([c, n]) => `<option value="${c}">${c} (${n})</option>`).join('');
}

function filterByCommunity(communityId: string): void {
  if (!state.nodesSel || !state.linksSel) return;
  if (communityId === 'all') {
    state.nodesSel.classed('dim', false);
    state.linksSel.classed('dim', false);
    return;
  }
  const allowed = new Set<string>();
  for (const d of state.nodesSel.data()) {
    if (d.communityId === communityId) allowed.add(d.id);
  }
  state.nodesSel.classed('dim', (d) => !allowed.has(d.id));
  state.linksSel.classed('dim', (d) => {
    const a = ((d.source as NodeDatum).id ?? (d.source as unknown as string)) as string;
    const b = ((d.target as NodeDatum).id ?? (d.target as unknown as string)) as string;
    return !(allowed.has(a) && allowed.has(b));
  });
}

function highlightPath(path: string[]): void {
  if (!state.linksSel || !state.nodesSel) return;
  const edges = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    edges.add(a < b ? `${a}|${b}` : `${b}|${a}`);
  }
  state.linksSel.classed('path-highlight', (d) => {
    const a = ((d.source as NodeDatum).id ?? (d.source as unknown as string)) as string;
    const b = ((d.target as NodeDatum).id ?? (d.target as unknown as string)) as string;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    return edges.has(key);
  });
  state.nodesSel.classed('path-highlight', (d) => path.includes(d.id));
}

async function main(): Promise<void> {
  const graph = await loadGraphFromJson('data/artists.json');
  render(graph);
  populateCommunities(graph);

  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const clearSearchBtn = document.getElementById('clearSearchBtn') as HTMLButtonElement;
  const srcInput = document.getElementById('sourceInput') as HTMLInputElement;
  const tgtInput = document.getElementById('targetInput') as HTMLInputElement;
  const shortestBtn = document.getElementById('shortestPathBtn') as HTMLButtonElement;
  const clearPathBtn = document.getElementById('clearPathBtn') as HTMLButtonElement;
  const communitySelect = document.getElementById('communitySelect') as HTMLSelectElement;
  const reheatBtn = document.getElementById('reheatBtn') as HTMLButtonElement;

  searchInput.addEventListener('input', () => {
    if (!state.graph) return;
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      clearHighlights();
      return;
    }
    const match = state.graph
      .nodes()
      .find((id) => ((state.graph!.nodeData.get(id)?.name as string) ?? id).toLowerCase().includes(q));
    if (match) {
      highlightSelection(match);
      showDetails(match);
    }
  });
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearHighlights();
  });

  shortestBtn.addEventListener('click', () => {
    if (!state.graph) return;
    const a = findIdByName(srcInput.value.trim());
    const b = findIdByName(tgtInput.value.trim());
    if (!a || !b) {
      alert('Please enter valid artist names present in the graph.');
      return;
    }
    const path = state.graph.shortestPath(a, b);
    if (!path) {
      alert('No path found between the selected artists.');
      return;
    }
    highlightPath(path);
    showDetails(b);
  });
  clearPathBtn.addEventListener('click', () => {
    if (!state.linksSel || !state.nodesSel) return;
    state.linksSel.classed('path-highlight', false);
    state.nodesSel.classed('path-highlight', false);
  });

  communitySelect.addEventListener('change', () => filterByCommunity(communitySelect.value));
  reheatBtn.addEventListener('click', () => state.sim?.alpha(0.5).restart());
}

function findIdByName(name: string): string | null {
  if (!state.graph) return null;
  if (!name) return null;
  const needle = name.toLowerCase();
  for (const id of state.graph.nodes()) {
    const n = ((state.graph.nodeData.get(id)?.name as string) ?? id).toLowerCase();
    if (n === needle) return id;
  }
  return null;
}

void main();


