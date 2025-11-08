import { Graph } from '../../src/graph.js';
import { GraphQLResolveInfo } from 'graphql';

/**
 * Convert node type string to GraphQL enum
 */
function toNodeTypeEnum(nodeType: string | undefined): string {
  if (!nodeType) return 'ARTIST';
  return nodeType.toUpperCase();
}

/**
 * Convert GraphQL node type enum to string
 */
function fromNodeTypeEnum(nodeType: string): string {
  return nodeType.toLowerCase();
}

/**
 * Create a node object for GraphQL response
 */
function createNodeObject(id: string, graph: Graph, centrality: Map<string, number>) {
  const data = graph.nodeData.get(id) || { id, name: id };
  return {
    id,
    name: data.name ?? id,
    nodeType: toNodeTypeEnum(data.nodeType as string),
    communityId: data.communityId,
    degree: graph.degree(id),
    centrality: centrality.get(id) ?? 0,
    year: (data as any).year,
    credits: (data as any).credits,
    songIds: (data as any).songIds,
  };
}

/**
 * Filter nodes by type if specified
 */
function filterByNodeType(
  nodes: any[],
  nodeTypes?: string[]
): any[] {
  if (!nodeTypes || nodeTypes.length === 0) {
    return nodes;
  }
  return nodes.filter((node) => nodeTypes.includes(node.nodeType));
}

export const resolvers = {
  NodeType: {
    ARTIST: 'artist',
    SONG: 'song',
    ALBUM: 'album',
  },

  Query: {
    health: () => {
      return 'OK';
    },

    graph: async (
      _: any,
      { nodeTypes }: { nodeTypes?: string[] },
      context: { graph: Graph }
    ) => {
      const graph = context.graph;
      const centrality = graph.degreeCentrality(true);

      // Get all nodes
      let nodes = graph.nodes().map((id) => createNodeObject(id, graph, centrality));

      // Filter by node types if specified
      if (nodeTypes && nodeTypes.length > 0) {
        nodes = filterByNodeType(nodes, nodeTypes);
      }

      // Get all edges
      const edges = graph.edges().map(([source, target]) => {
        // Check if both nodes are in the filtered set
        const sourceNode = nodes.find((n) => n.id === source);
        const targetNode = nodes.find((n) => n.id === target);
        
        if (!sourceNode || !targetNode) {
          return null;
        }

        return {
          source,
          target,
          relation: 'connected', // Could extract from edge metadata if needed
        };
      }).filter(Boolean) as Array<{ source: string; target: string; relation: string }>;

      // Get communities
      const components = graph.connectedComponents();
      const communities = components.map((comp, idx) => {
        const communityNodes = comp
          .map((nodeId) => {
            // Only include nodes that are in our filtered set
            const node = nodes.find((n) => n.id === nodeId);
            return node ? createNodeObject(nodeId, graph, centrality) : null;
          })
          .filter(Boolean);

        return {
          id: `C${idx + 1}`,
          nodes: communityNodes,
          nodeCount: communityNodes.length,
        };
      }).filter((comm) => comm.nodes.length > 0);

      return {
        nodes,
        edges,
        communities,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      };
    },

    node: async (
      _: any,
      { id }: { id: string },
      context: { graph: Graph }
    ) => {
      const graph = context.graph;
      const data = graph.nodeData.get(id);
      if (!data) return null;

      const centrality = graph.degreeCentrality(true);
      return createNodeObject(id, graph, centrality);
    },

    neighbors: async (
      _: any,
      { id, nodeTypes }: { id: string; nodeTypes?: string[] },
      context: { graph: Graph }
    ) => {
      const graph = context.graph;
      const neighborIds = graph.neighbors(id);
      const centrality = graph.degreeCentrality(true);

      let neighbors = neighborIds.map((nodeId) => createNodeObject(nodeId, graph, centrality));

      // Filter by node types if specified
      if (nodeTypes && nodeTypes.length > 0) {
        neighbors = filterByNodeType(neighbors, nodeTypes);
      }

      return neighbors;
    },

    shortestPath: async (
      _: any,
      { from, to }: { from: string; to: string },
      context: { graph: Graph }
    ) => {
      const graph = context.graph;
      const path = graph.shortestPath(from, to);

      if (!path) return null;

      const centrality = graph.degreeCentrality(true);
      const nodes = path.map((id) => createNodeObject(id, graph, centrality));

      return {
        nodes,
        length: path.length - 1,
      };
    },

    search: async (
      _: any,
      { query, nodeTypes, limit }: { query: string; nodeTypes?: string[]; limit?: number },
      context: { graph: Graph }
    ) => {
      const graph = context.graph;
      const q = query.toLowerCase();
      const centrality = graph.degreeCentrality(true);

      let results = graph
        .nodes()
        .map((id) => {
          const data = graph.nodeData.get(id) || { id, name: id };
          const name = (data.name ?? id).toLowerCase();

          if (!name.includes(q)) return null;

          return createNodeObject(id, graph, centrality);
        })
        .filter(Boolean);

      // Filter by node types if specified
      if (nodeTypes && nodeTypes.length > 0) {
        results = filterByNodeType(results, nodeTypes);
      }

      // Apply limit
      if (limit && limit > 0) {
        results = results.slice(0, limit);
      }

      return {
        nodes: results,
        count: results.length,
      };
    },

    community: async (
      _: any,
      { id }: { id: string },
      context: { graph: Graph }
    ) => {
      const graph = context.graph;
      const components = graph.connectedComponents();
      const comp = components.find((c) => c.includes(id));

      if (!comp) return null;

      const centrality = graph.degreeCentrality(true);
      const nodes = comp.map((nodeId) => createNodeObject(nodeId, graph, centrality));

      const communityId = (graph.nodeData.get(id) as any)?.communityId || 'C0';

      return {
        id: communityId,
        nodes,
        nodeCount: nodes.length,
      };
    },

    communities: async (_: any, __: any, context: { graph: Graph }) => {
      const graph = context.graph;
      const components = graph.connectedComponents();
      const centrality = graph.degreeCentrality(true);

      return components.map((comp, idx) => ({
        id: `C${idx + 1}`,
        nodes: comp.map((nodeId) => createNodeObject(nodeId, graph, centrality)),
        nodeCount: comp.length,
      }));
    },
  },
};

