# Server-Side Data Processing Architecture Options

This document outlines different approaches for moving data processing server-side for the music graph visualization.

## Current Architecture

- **Client-side processing**: All graph construction, community detection, and calculations happen in the browser
- **Static JSON files**: Data loaded from multiple JSON files (`artists.json`, `song-credits.json`, `albums.json`)
- **Pros**: Simple deployment, fast for small datasets, no server costs
- **Cons**: All data loaded upfront, processing overhead in browser, harder to scale

## Option 1: GraphQL API ⭐ (Recommended for Graph Data)

### Overview
GraphQL is excellent for graph data because it naturally represents relationships and allows clients to query exactly what they need.

### Pros
- ✅ **Natural fit for graphs**: Relationships are first-class citizens
- ✅ **Flexible queries**: Clients request exactly what they need
- ✅ **Single endpoint**: No over/under-fetching
- ✅ **Strong typing**: Schema defines data structure
- ✅ **Excellent tooling**: GraphiQL, Apollo, etc.
- ✅ **Efficient traversal**: Can query connected nodes in one request
- ✅ **Future-proof**: Easy to add new fields/relationships

### Cons
- ❌ **Learning curve**: More complex than REST
- ❌ **Overkill for simple cases**: May be too much for small datasets
- ❌ **Caching complexity**: More complex than REST caching

### Implementation Example

```typescript
// server/schema.ts
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt } from 'graphql';

const ArtistType = new GraphQLObjectType({
  name: 'Artist',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    songs: {
      type: new GraphQLList(SongType),
      resolve: (artist, _, { dataSources }) => {
        return dataSources.musicAPI.getSongsByArtist(artist.id);
      }
    },
    albums: {
      type: new GraphQLList(AlbumType),
      resolve: (artist, _, { dataSources }) => {
        return dataSources.musicAPI.getAlbumsByArtist(artist.id);
      }
    },
    collaborators: {
      type: new GraphQLList(ArtistType),
      resolve: (artist, _, { dataSources }) => {
        return dataSources.musicAPI.getCollaborators(artist.id);
      }
    }
  })
});

const SongType = new GraphQLObjectType({
  name: 'Song',
  fields: () => ({
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    year: { type: GraphQLInt },
    artists: {
      type: new GraphQLList(ArtistType),
      resolve: (song, _, { dataSources }) => {
        return dataSources.musicAPI.getArtistsBySong(song.id);
      }
    },
    album: {
      type: AlbumType,
      resolve: (song, _, { dataSources }) => {
        return dataSources.musicAPI.getAlbumBySong(song.id);
      }
    },
    credits: {
      type: CreditsType,
      resolve: (song) => song.credits
    }
  })
});

const AlbumType = new GraphQLObjectType({
  name: 'Album',
  fields: () => ({
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    year: { type: GraphQLInt },
    artists: {
      type: new GraphQLList(ArtistType),
      resolve: (album, _, { dataSources }) => {
        return dataSources.musicAPI.getArtistsByAlbum(album.id);
      }
    },
    songs: {
      type: new GraphQLList(SongType),
      resolve: (album, _, { dataSources }) => {
        return dataSources.musicAPI.getSongsByAlbum(album.id);
      }
    }
  })
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    artist: {
      type: ArtistType,
      args: { id: { type: GraphQLString } },
      resolve: (_, { id }, { dataSources }) => {
        return dataSources.musicAPI.getArtist(id);
      }
    },
    graph: {
      type: new GraphQLObjectType({
        name: 'Graph',
        fields: {
          nodes: { type: new GraphQLList(NodeType) },
          edges: { type: new GraphQLList(EdgeType) },
          communities: { type: new GraphQLList(CommunityType) }
        }
      }),
      args: {
        nodeTypes: { type: new GraphQLList(GraphQLString) },
        limit: { type: GraphQLInt }
      },
      resolve: async (_, args, { dataSources }) => {
        return dataSources.musicAPI.buildGraph(args);
      }
    },
    shortestPath: {
      type: new GraphQLList(NodeType),
      args: {
        from: { type: GraphQLString },
        to: { type: GraphQLString }
      },
      resolve: (_, { from, to }, { dataSources }) => {
        return dataSources.musicAPI.shortestPath(from, to);
      }
    }
  }
});

export const schema = new GraphQLSchema({ query: QueryType });
```

### Client Query Example

```graphql
query GetGraph {
  graph(nodeTypes: ["artist", "song", "album"]) {
    nodes {
      id
      name
      type
      communityId
      degree
      centrality
    }
    edges {
      source
      target
      relation
    }
    communities {
      id
      nodes {
        id
        name
      }
    }
  }
}

query GetArtistDetails($id: String!) {
  artist(id: $id) {
    id
    name
    songs {
      id
      title
      year
    }
    albums {
      id
      title
      year
    }
    collaborators {
      id
      name
    }
  }
}
```

---

## Option 2: REST API

### Overview
Traditional REST endpoints with JSON responses. Simpler than GraphQL but less flexible.

### Pros
- ✅ **Simple**: Easy to understand and implement
- ✅ **Standard**: Well-established patterns
- ✅ **Caching**: Easy HTTP caching
- ✅ **Tooling**: Great browser dev tools support
- ✅ **Learning curve**: Most developers know REST

### Cons
- ❌ **Multiple requests**: May need multiple endpoints for related data
- ❌ **Over/under-fetching**: Fixed response structure
- ❌ **Less efficient**: More requests for graph traversal

### Implementation Example

```typescript
// server/routes.ts
import express from 'express';
import { MusicGraphService } from './services/musicGraph';

const router = express.Router();
const graphService = new MusicGraphService();

// Get full graph
router.get('/api/graph', async (req, res) => {
  const { nodeTypes, limit } = req.query;
  const graph = await graphService.buildGraph({
    nodeTypes: nodeTypes?.split(','),
    limit: limit ? parseInt(limit as string) : undefined
  });
  res.json(graph);
});

// Get specific node
router.get('/api/nodes/:id', async (req, res) => {
  const node = await graphService.getNode(req.params.id);
  if (!node) return res.status(404).json({ error: 'Not found' });
  res.json(node);
});

// Get neighbors
router.get('/api/nodes/:id/neighbors', async (req, res) => {
  const neighbors = await graphService.getNeighbors(req.params.id);
  res.json(neighbors);
});

// Shortest path
router.get('/api/path', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'Missing from or to parameter' });
  }
  const path = await graphService.shortestPath(from as string, to as string);
  res.json(path);
});

// Search
router.get('/api/search', async (req, res) => {
  const { q, nodeTypes } = req.query;
  const results = await graphService.search(q as string, {
    nodeTypes: nodeTypes?.split(',')
  });
  res.json(results);
});

export default router;
```

---

## Option 3: Pre-Processed Static Generation

### Overview
Process data at build time and generate optimized static JSON files.

### Pros
- ✅ **Fast**: No server processing at runtime
- ✅ **Simple**: Still static, but optimized
- ✅ **CDN-friendly**: Can be cached aggressively
- ✅ **Cost-effective**: No server costs
- ✅ **SEO-friendly**: Pre-rendered data

### Cons
- ❌ **Rebuild required**: Data changes need rebuild
- ❌ **Limited queries**: Can't do dynamic filtering
- ❌ **Large files**: Still loading all data

### Implementation Example

```typescript
// scripts/build-graph.ts
import { Graph } from '../src/graph';
import { loadGraphFromJson, addSongCreditsToGraph, addAlbumsToGraph } from '../src/graph';
import { readFileSync, writeFileSync } from 'fs';

async function buildGraph() {
  // Load and process all data
  const graph = await loadGraphFromJson('./data/artists.json');
  const songCredits = JSON.parse(readFileSync('./data/song-credits.json', 'utf-8'));
  const albums = JSON.parse(readFileSync('./data/albums.json', 'utf-8'));
  
  addSongCreditsToGraph(graph, songCredits);
  addAlbumsToGraph(graph, albums);
  
  // Export optimized format
  const nodes = graph.nodes().map(id => ({
    id,
    ...graph.nodeData.get(id),
    degree: graph.degree(id),
    centrality: graph.degreeCentrality(true).get(id)
  }));
  
  const edges = graph.edges().map(([source, target]) => ({
    source,
    target
  }));
  
  const communities = graph.connectedComponents();
  
  const output = {
    nodes,
    edges,
    communities: communities.map((comp, idx) => ({
      id: `C${idx + 1}`,
      nodes: comp
    })),
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      communityCount: communities.length,
      builtAt: new Date().toISOString()
    }
  };
  
  writeFileSync('./data/graph.json', JSON.stringify(output, null, 2));
  console.log(`Built graph with ${nodes.length} nodes, ${edges.length} edges`);
}

buildGraph();
```

---

## Option 4: Graph Database (Neo4j, ArangoDB)

### Overview
Use a native graph database to store and query the music graph.

### Pros
- ✅ **Optimized for graphs**: Built for graph queries
- ✅ **Cypher queries**: Powerful graph query language
- ✅ **Scalable**: Handles large graphs efficiently
- ✅ **Relationship queries**: Fast traversal
- ✅ **Built-in algorithms**: Community detection, centrality, etc.

### Cons
- ❌ **Infrastructure**: Requires database server
- ❌ **Complexity**: More moving parts
- ❌ **Cost**: Database hosting costs
- ❌ **Overkill**: May be too much for small datasets

### Implementation Example

```cypher
// Neo4j Cypher queries

// Get full graph
MATCH (n)-[r]->(m)
RETURN n, r, m
LIMIT 1000

// Get artist with relationships
MATCH (a:Artist {id: $artistId})
OPTIONAL MATCH (a)-[:PERFORMS|WRITES|PRODUCES]->(s:Song)
OPTIONAL MATCH (a)-[:RELEASED]->(alb:Album)
OPTIONAL MATCH (a)-[:COLLABORATES_WITH]-(collab:Artist)
RETURN a, collect(DISTINCT s) as songs, 
       collect(DISTINCT alb) as albums,
       collect(DISTINCT collab) as collaborators

// Shortest path
MATCH path = shortestPath(
  (a:Artist {id: $fromId})-[*]-(b:Artist {id: $toId})
)
RETURN path

// Community detection (using GDS library)
CALL gds.louvain.stream({
  nodeQuery: 'MATCH (n) RETURN id(n) as id',
  relationshipQuery: 'MATCH (n)-[r]-(m) RETURN id(n) as source, id(m) as target'
})
YIELD nodeId, communityId
RETURN nodeId, communityId
```

---

## Option 5: Hybrid Approach

### Overview
Combine static pre-processing with API endpoints for dynamic queries.

### Architecture
- **Static files**: Pre-processed graph structure
- **API endpoints**: Dynamic queries (search, shortest path, filtering)
- **Client**: Loads base graph, queries API for specific operations

### Implementation

```typescript
// Client loads base graph
const graph = await loadGraphFromJson('/api/graph/base');

// API endpoints for dynamic operations
const searchResults = await fetch(`/api/search?q=${query}`).then(r => r.json());
const path = await fetch(`/api/path?from=${from}&to=${to}`).then(r => r.json());
```

---

## Recommendation

### For Your Use Case: **GraphQL** ⭐

**Why GraphQL is best for music graph:**

1. **Natural graph representation**: Your data is inherently a graph (artists ↔ songs ↔ albums)
2. **Flexible queries**: Clients can request exactly what they need
3. **Relationship traversal**: Easy to query connected nodes
4. **Future growth**: Easy to add new node types or relationships
5. **Efficient**: Single request can get entire subgraph

### Implementation Steps

1. **Set up GraphQL server** (Apollo Server, GraphQL Yoga, or similar)
2. **Create schema** defining Artist, Song, Album types
3. **Implement resolvers** that query your data sources
4. **Add data sources**: Could be JSON files, database, or external APIs
5. **Update client** to use GraphQL queries instead of loading JSON files

### Alternative: **Pre-Processed Static** (if data is static)

If your data doesn't change frequently:
- Pre-process at build time
- Generate optimized JSON
- Keep it static (fastest, simplest)

### When to Consider Graph Database

- Dataset > 100k nodes
- Need real-time updates
- Complex graph algorithms
- Multiple concurrent users
- Need graph analytics

---

## Next Steps

1. Choose an approach based on your needs
2. Set up server infrastructure (Node.js + Express/Fastify)
3. Implement data layer (GraphQL schema or REST routes)
4. Migrate client to use API instead of static files
5. Add caching layer (Redis) for performance
6. Consider adding a database if data is dynamic

Would you like me to implement one of these approaches?

