import { gql } from 'graphql-tag';

export const typeDefs = gql`
  enum NodeType {
    ARTIST
    SONG
    ALBUM
  }

  type Node {
    id: ID!
    name: String!
    nodeType: NodeType!
    communityId: String
    degree: Int!
    centrality: Float!
    year: Int
    credits: Credits
    songIds: [ID!]
  }

  type Credits {
    writers: [String!]
    producers: [String!]
    performers: [String!]
  }

  type Edge {
    source: ID!
    target: ID!
    relation: String
  }

  type Community {
    id: ID!
    nodes: [Node!]!
    nodeCount: Int!
  }

  type Graph {
    nodes: [Node!]!
    edges: [Edge!]!
    communities: [Community!]!
    nodeCount: Int!
    edgeCount: Int!
  }

  type Path {
    nodes: [Node!]!
    length: Int!
  }

  type SearchResult {
    nodes: [Node!]!
    count: Int!
  }

  type Query {
    # Get the full graph
    graph(nodeTypes: [NodeType!]): Graph!
    
    # Get a specific node
    node(id: ID!): Node
    
    # Get neighbors of a node
    neighbors(id: ID!, nodeTypes: [NodeType!]): [Node!]!
    
    # Get shortest path between two nodes
    shortestPath(from: ID!, to: ID!): Path
    
    # Search nodes by name
    search(query: String!, nodeTypes: [NodeType!], limit: Int): SearchResult!
    
    # Get community information
    community(id: ID!): Community
    
    # Get all communities
    communities: [Community!]!
    
    # Health check
    health: String!
  }
`;

