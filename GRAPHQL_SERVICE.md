# GraphQL Service

The Music GraphQL API is now available as a standalone service!

## Quick Start

### Start the Server

```bash
npm run server
```

The server will start at `http://localhost:4000/graphql`

### Development Mode (with auto-reload)

```bash
npm run server:dev
```

### Watch Mode (reloads on file changes)

```bash
npm run server:watch
```

## Endpoints

- **GraphQL**: `http://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`
- **Root**: `http://localhost:4000/`

## Features

✅ Full GraphQL schema for artists, songs, and albums
✅ Graph traversal (neighbors, shortest path)
✅ Search functionality
✅ Community detection
✅ Type-safe queries
✅ GraphQL Playground for testing

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
    }
  }
}
```

### Search

```graphql
query {
  search(query: "taylor") {
    nodes {
      id
      name
      nodeType
    }
  }
}
```

### Get Node Details

```graphql
query {
  node(id: "tswift") {
    id
    name
    nodeType
    degree
    centrality
    neighbors {
      id
      name
    }
  }
}
```

## Integration

See `server/README.md` for full documentation and `client/graphql-client.example.ts` for client integration examples.

## Configuration

Set environment variables:

- `PORT` - Server port (default: 4000)
- `GRAPHQL_PATH` - GraphQL endpoint path (default: /graphql)

Example:

```bash
PORT=4000 GRAPHQL_PATH=/graphql npm run server
```

