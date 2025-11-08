/**
 * GraphQL Client Example
 * 
 * Example of how to use the GraphQL API from the client
 * 
 * Install: npm install @apollo/client graphql
 */

import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core';

// Create Apollo Client
const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
});

// Query: Get full graph
export const GET_GRAPH = gql`
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

// Query: Get specific node
export const GET_NODE = gql`
  query GetNode($id: ID!) {
    node(id: $id) {
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
  }
`;

// Query: Get neighbors
export const GET_NEIGHBORS = gql`
  query GetNeighbors($id: ID!, $nodeTypes: [NodeType!]) {
    neighbors(id: $id, nodeTypes: $nodeTypes) {
      id
      name
      nodeType
      degree
      centrality
    }
  }
`;

// Query: Get shortest path
export const GET_SHORTEST_PATH = gql`
  query GetShortestPath($from: ID!, $to: ID!) {
    shortestPath(from: $from, to: $to) {
      nodes {
        id
        name
        nodeType
        degree
      }
      length
    }
  }
`;

// Query: Search
export const SEARCH = gql`
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

// Usage examples:

// 1. Load full graph
export async function loadGraph(nodeTypes?: string[]) {
  const { data } = await client.query({
    query: GET_GRAPH,
    variables: { nodeTypes },
  });
  return data.graph;
}

// 2. Get node details
export async function getNode(id: string) {
  const { data } = await client.query({
    query: GET_NODE,
    variables: { id },
  });
  return data.node;
}

// 3. Get neighbors
export async function getNeighbors(id: string, nodeTypes?: string[]) {
  const { data } = await client.query({
    query: GET_NEIGHBORS,
    variables: { id, nodeTypes },
  });
  return data.neighbors;
}

// 4. Get shortest path
export async function getShortestPath(from: string, to: string) {
  const { data } = await client.query({
    query: GET_SHORTEST_PATH,
    variables: { from, to },
  });
  return data.shortestPath;
}

// 5. Search
export async function search(query: string, nodeTypes?: string[], limit?: number) {
  const { data } = await client.query({
    query: SEARCH,
    variables: { query, nodeTypes, limit },
  });
  return data.search;
}

// Example: Update app.ts to use GraphQL
/*
// In app.ts, replace the data loading:

import { loadGraph } from './graphql-client';

async function main(): Promise<void> {
  // Load graph from GraphQL API
  const graphData = await loadGraph(['ARTIST', 'SONG', 'ALBUM']);
  
  // Convert to Graph instance
  const graph = new Graph();
  for (const node of graphData.nodes) {
    graph.addNode({
      id: node.id,
      name: node.name,
      nodeType: node.nodeType.toLowerCase(),
      communityId: node.communityId,
      year: node.year,
      credits: node.credits,
      songIds: node.songIds,
    });
  }
  for (const edge of graphData.edges) {
    graph.addEdge(edge.source, edge.target, 1, { relation: edge.relation });
  }
  
  render(graph);
  populateCommunities(graph);
  // ... rest of the code
}
*/

