/**
 * GraphQL Client for Music Graph API
 * Uses fetch to communicate with the GraphQL server
 */

// GraphQL endpoint - can be configured via environment variable or use default
// Check for Vite environment variable, or use default
let GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

// Try to get from environment (works with Vite or if set in window)
if (typeof window !== 'undefined' && (window as any).__GRAPHQL_ENDPOINT__) {
  GRAPHQL_ENDPOINT = (window as any).__GRAPHQL_ENDPOINT__;
} else if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GRAPHQL_URL) {
  GRAPHQL_ENDPOINT = (import.meta as any).env.VITE_GRAPHQL_URL;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

/**
 * Execute a GraphQL query
 */
async function query<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}`);
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return result.data;
}

// GraphQL Queries

const GET_GRAPH_QUERY = `
  query GetGraph($nodeTypes: [NodeType!]) {
    graph(nodeTypes: $nodeTypes) {
      nodes {
        id
        name
        nodeType
        communityId
        degree
        centrality
        year
        credits {
          writers
          producers
          performers
        }
        songIds
      }
      edges {
        source
        target
        relation
      }
      communities {
        id
        nodeCount
        nodes {
          id
          name
          nodeType
        }
      }
      nodeCount
      edgeCount
    }
  }
`;

const GET_SHORTEST_PATH_QUERY = `
  query GetShortestPath($from: ID!, $to: ID!) {
    shortestPath(from: $from, to: $to) {
      nodes {
        id
        name
        nodeType
      }
      length
    }
  }
`;

const SEARCH_QUERY = `
  query Search($query: String!, $nodeTypes: [NodeType!], $limit: Int) {
    search(query: $query, nodeTypes: $nodeTypes, limit: $limit) {
      nodes {
        id
        name
        nodeType
        degree
        centrality
      }
      count
    }
  }
`;

// Types

export interface GraphQLNode {
  id: string;
  name: string;
  nodeType: 'ARTIST' | 'SONG' | 'ALBUM';
  communityId?: string | null;
  degree: number;
  centrality: number;
  year?: number | null;
  credits?: {
    writers?: string[];
    producers?: string[];
    performers?: string[];
  } | null;
  songIds?: string[] | null;
}

export interface GraphQLEdge {
  source: string;
  target: string;
  relation?: string | null;
}

export interface GraphQLCommunity {
  id: string;
  nodeCount: number;
  nodes: Array<{
    id: string;
    name: string;
    nodeType: string;
  }>;
}

export interface GraphQLGraph {
  nodes: GraphQLNode[];
  edges: GraphQLEdge[];
  communities: GraphQLCommunity[];
  nodeCount: number;
  edgeCount: number;
}

export interface GraphQLPath {
  nodes: Array<{
    id: string;
    name: string;
    nodeType: string;
  }>;
  length: number;
}

export interface GraphQLSearchResult {
  nodes: GraphQLNode[];
  count: number;
}

// API Functions

/**
 * Load the full graph from GraphQL API
 */
export async function loadGraphFromGraphQL(nodeTypes?: ('ARTIST' | 'SONG' | 'ALBUM')[]): Promise<GraphQLGraph> {
  const response = await query<{ graph: GraphQLGraph }>(GET_GRAPH_QUERY, {
    nodeTypes: nodeTypes || ['ARTIST', 'SONG', 'ALBUM'],
  });
  return response.graph;
}

/**
 * Get shortest path between two nodes
 */
export async function getShortestPathFromGraphQL(from: string, to: string): Promise<GraphQLPath | null> {
  try {
    const response = await query<{ shortestPath: GraphQLPath | null }>(GET_SHORTEST_PATH_QUERY, {
      from,
      to,
    });
    return response.shortestPath;
  } catch (error) {
    console.error('Failed to get shortest path:', error);
    return null;
  }
}

/**
 * Search for nodes
 */
export async function searchNodesFromGraphQL(
  searchQuery: string,
  nodeTypes?: ('ARTIST' | 'SONG' | 'ALBUM')[],
  limit?: number
): Promise<GraphQLSearchResult> {
  const response = await query<{ search: GraphQLSearchResult }>(SEARCH_QUERY, {
    query: searchQuery,
    nodeTypes,
    limit,
  });
  return response.search;
}

/**
 * Check if GraphQL server is available
 * Uses the GraphQL endpoint itself with a simple query instead of health endpoint
 * to avoid CORS issues
 */
export async function checkGraphQLServer(): Promise<boolean> {
  try {
    // Use a simple GraphQL query to check if server is available
    // This avoids CORS issues with separate health endpoint
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ health }',
      }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

