# Setting Up GraphQL Server

This guide shows how to set up a GraphQL server for the music graph visualization.

## Step 1: Install Dependencies

```bash
npm install express apollo-server-express graphql @apollo/client
npm install -D @types/express @types/node ts-node nodemon
```

## Step 2: Create Server File

Create `server/index.ts` (see `server/graphql-server.example.ts` for reference)

## Step 3: Add Scripts to package.json

```json
{
  "scripts": {
    "server": "ts-node server/index.ts",
    "server:dev": "nodemon --exec ts-node server/index.ts",
    "server:watch": "nodemon --watch server --exec ts-node server/index.ts"
  }
}
```

## Step 4: Start Server

```bash
npm run server
```

Server will start at `http://localhost:4000/graphql`

## Step 5: Test in GraphQL Playground

Open `http://localhost:4000/graphql` in your browser and try:

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

## Step 6: Update Client

Update `src/app.ts` to use GraphQL queries instead of loading JSON files.

## Alternative: Use REST API

If you prefer REST over GraphQL, see `SERVER_ARCHITECTURE.md` for REST API implementation.

## Benefits of GraphQL

1. **Single endpoint**: `/graphql` handles all queries
2. **Flexible queries**: Request exactly what you need
3. **Type safety**: Schema defines available data
4. **Great tooling**: GraphQL Playground for testing
5. **Efficient**: Single request can get complex nested data

## Example Queries

### Get full graph
```graphql
query {
  graph {
    nodes {
      id
      name
      nodeType
      degree
    }
    edges {
      source
      target
    }
  }
}
```

### Get specific node
```graphql
query {
  node(id: "tswift") {
    id
    name
    nodeType
    degree
    neighbors {
      id
      name
    }
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
    }
  }
}
```

### Shortest path
```graphql
query {
  shortestPath(from: "tswift", to: "edsheeran") {
    nodes {
      id
      name
    }
    length
  }
}
```

