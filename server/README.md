# Music GraphQL API Service

GraphQL API service for the music graph visualization. This is a standalone service that provides a GraphQL endpoint for querying artist, song, and album relationships.

## Features

- ✅ GraphQL API with full schema
- ✅ Query artists, songs, and albums
- ✅ Graph traversal (neighbors, shortest path)
- ✅ Search functionality
- ✅ Community detection
- ✅ Health check endpoint
- ✅ GraphQL Playground for testing

## Installation

Dependencies are installed at the project root. Make sure you've run:

```bash
npm install
```

## Running the Server

### Development (with auto-reload)

```bash
npm run server:dev
```

### Development (with file watching)

```bash
npm run server:watch
```

### Production

```bash
npm run server
```

## Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 4000)
- `GRAPHQL_PATH` - GraphQL endpoint path (default: /graphql)

Example:

```bash
PORT=4000 GRAPHQL_PATH=/graphql npm run server
```

## Endpoints

### GraphQL Endpoint

- **URL**: `http://localhost:4000/graphql`
- **Method**: POST
- **Content-Type**: application/json

### Health Check

- **URL**: `http://localhost:4000/health`
- **Method**: GET
- **Response**: `{ "status": "OK", "service": "music-graphql-api" }`

### Root

- **URL**: `http://localhost:4000/`
- **Method**: GET
- **Response**: API information and endpoints

## GraphQL Playground

When the server is running, you can access the GraphQL Playground at:

```
http://localhost:4000/graphql
```

This provides an interactive interface for testing GraphQL queries.

## Example Queries

### Get Full Graph

```graphql
query {
  graph {
    nodeCount
    edgeCount
    nodes {
      id
      name
      nodeType
      degree
      centrality
    }
    edges {
      source
      target
      relation
    }
  }
}
```

### Get Specific Node

```graphql
query {
  node(id: "tswift") {
    id
    name
    nodeType
    degree
    centrality
    year
    credits {
      writers
      producers
      performers
    }
  }
}
```

### Get Neighbors

```graphql
query {
  neighbors(id: "tswift") {
    id
    name
    nodeType
    degree
  }
}
```

### Search

```graphql
query {
  search(query: "taylor", nodeTypes: [ARTIST]) {
    nodes {
      id
      name
      nodeType
    }
    count
  }
}
```

### Shortest Path

```graphql
query {
  shortestPath(from: "tswift", to: "edsheeran") {
    nodes {
      id
      name
      nodeType
    }
    length
  }
}
```

### Get Communities

```graphql
query {
  communities {
    id
    nodeCount
    nodes {
      id
      name
      nodeType
    }
  }
}
```

## Schema

The GraphQL schema defines the following types:

- `Node` - Represents an artist, song, or album
- `Edge` - Represents a relationship between nodes
- `Graph` - The complete graph structure
- `Community` - A connected component in the graph
- `Path` - A path between two nodes
- `SearchResult` - Search results

## Project Structure

```
server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── schema.ts         # GraphQL schema definition
│   ├── resolvers.ts      # GraphQL resolvers
│   └── datasource.ts     # Data source (loads graph data)
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Development

### Type Checking

```bash
npm run server:build
```

### Adding New Queries

1. Update `server/src/schema.ts` to add the query to the schema
2. Update `server/src/resolvers.ts` to implement the resolver
3. Test in GraphQL Playground

## Integration with Client

The client can connect to this service using Apollo Client or fetch. See `client/graphql-client.example.ts` for examples.

## Troubleshooting

### Port Already in Use

If port 4000 is already in use, set a different port:

```bash
PORT=4001 npm run server
```

### Data Not Loading

Make sure the data files exist in the `data/` directory:
- `data/artists.json`
- `data/song-credits.json`
- `data/albums.json`

### Module Resolution Issues

If you encounter module resolution issues, make sure you're using Node.js 18+ with ES modules support.

## License

Same as the main project.

