import { Graph } from './graph.js';
import * as d3 from 'd3';
import {
  loadGraphFromGraphQL,
  getShortestPathFromGraphQL,
  searchNodesFromGraphQL,
  checkGraphQLServer,
  type GraphQLGraph,
  type GraphQLNode,
} from './graphql-client.js';

type NodeDatum = {
  id: string;
  name: string;
  nodeType?: 'artist' | 'song' | 'album';
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
      nodeType: (info.nodeType as 'artist' | 'song' | 'album' | undefined) ?? 'artist',
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
    .join(
      (enter) => {
        const group = enter.append('g').attr('class', 'node');
        
      // Add shape based on node type
      group.each(function(d) {
        const el = d3.select(this);
        if (d.nodeType === 'song') {
          // Song nodes: use rectangles
          el.append('rect')
            .attr('class', 'song-shape')
            .attr('width', (d) => (6 + Math.max(2, d.degree)) * 2)
            .attr('height', (d) => (6 + Math.max(2, d.degree)) * 2)
            .attr('x', (d) => -(6 + Math.max(2, d.degree)))
            .attr('y', (d) => -(6 + Math.max(2, d.degree)))
            .attr('rx', 3)
            .attr('fill', '#fbbf24')
            .attr('stroke', '#0b0f17')
            .attr('stroke-width', 2);
        } else if (d.nodeType === 'album') {
          // Album nodes: use diamonds (rotated squares)
          const size = 6 + Math.max(2, d.degree);
          const points = [
            [0, -size],
            [size, 0],
            [0, size],
            [-size, 0]
          ].map(p => p.join(',')).join(' ');
          el.append('polygon')
            .attr('class', 'album-shape')
            .attr('points', points)
            .attr('fill', '#8b5cf6')
            .attr('stroke', '#0b0f17')
            .attr('stroke-width', 2);
        } else {
          // Artist nodes: use circles
          el.append('circle')
            .attr('class', 'artist-shape')
            .attr('r', (d) => 6 + Math.max(2, d.degree))
            .attr('fill', (d) => colorForCommunity(d.communityId))
            .attr('stroke', '#0b0f17');
        }
      });
        
      group.append('title').text((d) => {
        const type = d.nodeType === 'song' ? 'Song' : d.nodeType === 'album' ? 'Album' : 'Artist';
        return `${type}: ${d.name}\nDegree: ${d.degree}`;
      });
        return group;
      },
      (update) => {
        // Update existing nodes
        update.select('circle.artist-shape')
          .attr('r', (d) => 6 + Math.max(2, d.degree))
          .attr('fill', (d) => {
            if (d.nodeType === 'song') return '#fbbf24';
            if (d.nodeType === 'album') return '#8b5cf6';
            return colorForCommunity(d.communityId);
          });
        update.select('rect.song-shape')
          .attr('width', (d) => (6 + Math.max(2, d.degree)) * 2)
          .attr('height', (d) => (6 + Math.max(2, d.degree)) * 2)
          .attr('x', (d) => -(6 + Math.max(2, d.degree)))
          .attr('y', (d) => -(6 + Math.max(2, d.degree)));
        update.select('polygon.album-shape')
          .attr('points', (d) => {
            const size = 6 + Math.max(2, d.degree);
            return [
              [0, -size],
              [size, 0],
              [0, size],
              [-size, 0]
            ].map(p => p.join(',')).join(' ');
          });
        update.select('title').text((d) => {
          const type = d.nodeType === 'song' ? 'Song' : d.nodeType === 'album' ? 'Album' : 'Artist';
          return `${type}: ${d.name}\nDegree: ${d.degree}`;
        });
        return update;
      }
    );

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
    .force('collide', d3.forceCollide<NodeDatum>().radius((d) => {
      // Adjust collision radius based on node type
      const baseRadius = 6 + Math.max(2, d.degree);
      if (d.nodeType === 'song') return baseRadius * 1.5;
      if (d.nodeType === 'album') return baseRadius * 1.3;
      return baseRadius + 4;
    }))
    .on('tick', () => {
      link
        .attr('x1', (d) => (d.source as NodeDatum).x!)
        .attr('y1', (d) => (d.source as NodeDatum).y!)
        .attr('x2', (d) => (d.target as NodeDatum).x!)
        .attr('y2', (d) => (d.target as NodeDatum).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      labels.attr('x', (d) => d.x!).attr('y', (d) => {
        // Adjust label position based on node type
        let offset = -12;
        if (d.nodeType === 'song') offset = -15;
        if (d.nodeType === 'album') offset = -18;
        return d.y! + offset;
      });
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
  const nodeType = (data as any).nodeType ?? 'artist';
  
  let detailsHTML = `
    <div>
      <div style="display:flex;align-items:center;gap:8px;">
        <strong style="font-size:16px;">${(data as any).name}</strong>
        <span class="badge">${nodeType === 'song' ? '🎵 Song' : nodeType === 'album' ? '💿 Album' : '👤 Artist'}</span>
        <span class="badge">${(data as any).communityId ?? 'C?'}</span>
      </div>
      <div class="legend" style="margin:8px 0 6px;">
        <span>Degree: <strong>${deg}</strong></span>
      </div>
  `;
  
  // Show album-specific information
  if (nodeType === 'album') {
    const year = (data as any).year;
    const songIds = (data as any).songIds;
    if (year) {
      detailsHTML += `<div style="margin:4px 0;color:#94a3b8;">Year: <strong>${year}</strong></div>`;
    }
    if (songIds && songIds.length > 0) {
      detailsHTML += `<div style="margin:4px 0;"><span style="color:#94a3b8;">Tracks (${songIds.length}):</span> ${songIds.map((songId: string) => {
        const song = state.graph!.nodeData.get(songId);
        return song ? `<span class="badge">🎵 ${(song as any).name ?? songId}</span>` : `<span class="badge">🎵 ${songId}</span>`;
      }).join(' ')}</div>`;
    }
  }
  
  // Show song-specific information
  if (nodeType === 'song') {
    const year = (data as any).year;
    const credits = (data as any).credits;
    if (year) {
      detailsHTML += `<div style="margin:4px 0;color:#94a3b8;">Year: <strong>${year}</strong></div>`;
    }
    if (credits) {
      if (credits.writers && credits.writers.length > 0) {
        detailsHTML += `<div style="margin:4px 0;"><span style="color:#94a3b8;">Writers:</span> ${credits.writers.map((w: string) => {
          const artist = state.graph!.nodeData.get(w);
          return artist ? `<span class="badge">${(artist as any).name ?? w}</span>` : `<span class="badge">${w}</span>`;
        }).join(' ')}</div>`;
      }
      if (credits.producers && credits.producers.length > 0) {
        detailsHTML += `<div style="margin:4px 0;"><span style="color:#94a3b8;">Producers:</span> ${credits.producers.map((p: string) => {
          const artist = state.graph!.nodeData.get(p);
          return artist ? `<span class="badge">${(artist as any).name ?? p}</span>` : `<span class="badge">${p}</span>`;
        }).join(' ')}</div>`;
      }
      if (credits.performers && credits.performers.length > 0) {
        detailsHTML += `<div style="margin:4px 0;"><span style="color:#94a3b8;">Performers:</span> ${credits.performers.map((p: string) => {
          const artist = state.graph!.nodeData.get(p);
          return artist ? `<span class="badge">${(artist as any).name ?? p}</span>` : `<span class="badge">${p}</span>`;
        }).join(' ')}</div>`;
      }
    }
  }
  
  detailsHTML += `
      <div style="margin-top:8px;">
        <div style="color:#94a3b8;margin-bottom:4px;">${nodeType === 'song' ? 'Connected Artists' : nodeType === 'album' ? 'Connected Artists & Songs' : 'Neighbors'}</div>
        <div>${nbrs.map((n) => {
          const nData = state.graph!.nodeData.get(n);
          const nType = (nData as any)?.nodeType ?? 'artist';
          let icon = '👤';
          if (nType === 'song') icon = '🎵';
          else if (nType === 'album') icon = '💿';
          return `<span class="badge">${icon} ${(nData as any)?.name ?? n}</span>`;
        }).join(' ') || '<em>None</em>'}</div>
      </div>
    </div>
  `;
  
  el.innerHTML = detailsHTML;
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

/**
 * Convert GraphQL graph data to Graph instance
 */
function graphQLToGraph(graphData: GraphQLGraph): Graph {
  const graph = new Graph();

  // Add all nodes
  for (const node of graphData.nodes) {
    graph.addNode({
      id: node.id,
      name: node.name,
      nodeType: node.nodeType.toLowerCase() as 'artist' | 'song' | 'album',
      communityId: node.communityId || undefined,
      year: node.year || undefined,
      credits: node.credits || undefined,
      songIds: node.songIds || undefined,
      degree: node.degree,
      centrality: node.centrality,
    });
  }

  // Add all edges
  for (const edge of graphData.edges) {
    graph.addEdge(edge.source, edge.target, 1, {
      relation: edge.relation || 'connected',
    });
  }

  // Communities are already assigned in GraphQL response, but we need to ensure
  // the graph structure is correct (edges are bidirectional)
  // The graph structure is already built above, so we just need to verify communities
  // are properly set in nodeData (they should be from the GraphQL response)

  return graph;
}

function showLoadingMessage(): void {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-message';
  loadingDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 16px; border-radius: 8px; z-index: 10000; max-width: 400px;';
  loadingDiv.innerHTML = `
    <strong>Loading Graph...</strong><br/>
    <small>Fetching data from GraphQL API</small>
  `;
  document.body.appendChild(loadingDiv);
}

function hideLoadingMessage(): void {
  const loadingDiv = document.getElementById('loading-message');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

function showErrorMessage(title: string, message: string): void {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 10000; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
  errorDiv.innerHTML = `
    <strong>${title}</strong><br/>
    ${message}<br/>
    <small style="opacity: 0.9;">Check the console for more details</small>
  `;
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 10000);
}

async function main(): Promise<void> {
  showLoadingMessage();

  // Check if GraphQL server is available
  const serverAvailable = await checkGraphQLServer();
  
  if (!serverAvailable) {
    hideLoadingMessage();
    console.warn('GraphQL server not available. Please make sure the server is running at http://localhost:4000');
    showErrorMessage(
      'GraphQL Server Not Available',
      'Please start the GraphQL server:<br/><code style="background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; margin-top: 8px; display: inline-block;">npm run server</code>'
    );
    return;
  }

  try {
    // Load graph from GraphQL API
    console.log('Loading graph from GraphQL API...');
    const graphData = await loadGraphFromGraphQL(['ARTIST', 'SONG', 'ALBUM']);
    console.log(`Loaded ${graphData.nodeCount} nodes and ${graphData.edgeCount} edges`);

    // Convert to Graph instance
    const graph = graphQLToGraph(graphData);

    hideLoadingMessage();
    render(graph);
    populateCommunities(graph);
  } catch (error) {
    hideLoadingMessage();
    console.error('Failed to load graph from GraphQL:', error);
    showErrorMessage(
      'Failed to Load Graph',
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    return;
  }

  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const clearSearchBtn = document.getElementById('clearSearchBtn') as HTMLButtonElement;
  const srcInput = document.getElementById('sourceInput') as HTMLInputElement;
  const tgtInput = document.getElementById('targetInput') as HTMLInputElement;
  const shortestBtn = document.getElementById('shortestPathBtn') as HTMLButtonElement;
  const clearPathBtn = document.getElementById('clearPathBtn') as HTMLButtonElement;
  const communitySelect = document.getElementById('communitySelect') as HTMLSelectElement;
  const reheatBtn = document.getElementById('reheatBtn') as HTMLButtonElement;

  // Debounce search to avoid too many API calls
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  searchInput.addEventListener('input', () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(async () => {
      if (!state.graph) return;
      const q = searchInput.value.trim();
      if (!q) {
        clearHighlights();
        return;
      }
      
      // Use GraphQL API for search
      try {
        const searchResult = await searchNodesFromGraphQL(q, ['ARTIST', 'SONG', 'ALBUM'], 10);
        if (searchResult.nodes && searchResult.nodes.length > 0) {
          // Use the first match
          const match = searchResult.nodes[0].id;
          highlightSelection(match);
          showDetails(match);
        } else {
          clearHighlights();
        }
      } catch (error) {
        console.error('Failed to search via GraphQL:', error);
        // Fallback to local search
        const qLower = q.toLowerCase();
        const match = state.graph
          .nodes()
          .find((id) => {
            const nodeData = state.graph!.nodeData.get(id);
            const name = ((nodeData?.name as string) ?? id).toLowerCase();
            return name.includes(qLower);
          });
        if (match) {
          highlightSelection(match);
          showDetails(match);
        } else {
          clearHighlights();
        }
      }
    }, 300); // 300ms debounce
  });
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearHighlights();
  });

  shortestBtn.addEventListener('click', async () => {
    if (!state.graph) return;
    const a = findIdByName(srcInput.value.trim());
    const b = findIdByName(tgtInput.value.trim());
    if (!a || !b) {
      alert('Please enter valid artist names present in the graph.');
      return;
    }
    
    // Use GraphQL API for shortest path
    try {
      const pathResult = await getShortestPathFromGraphQL(a, b);
      if (!pathResult || !pathResult.nodes || pathResult.nodes.length === 0) {
        alert('No path found between the selected nodes.');
        return;
      }
      const path = pathResult.nodes.map((n) => n.id);
      highlightPath(path);
      showDetails(b);
    } catch (error) {
      console.error('Failed to get shortest path:', error);
      // Fallback to local graph calculation
      const path = state.graph.shortestPath(a, b);
      if (!path) {
        alert('No path found between the selected nodes.');
        return;
      }
      highlightPath(path);
      showDetails(b);
    }
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


