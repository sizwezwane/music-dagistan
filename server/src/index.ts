import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express, { json } from 'express';
import http from 'http';
import cors from 'cors';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { MusicGraphDataSource } from './datasource.js';
import { Graph } from '../../src/graph.js';

const PORT = process.env.PORT || 4000;
const GRAPHQL_PATH = process.env.GRAPHQL_PATH || '/graphql';

/**
 * Create and configure the Apollo Server
 */
async function createServer() {
  // Initialize data source
  console.log('🚀 Starting GraphQL server...');
  const dataSource = new MusicGraphDataSource();
  await dataSource.initialize();

  // Create Express app
  const app = express();
  const httpServer = http.createServer(app);

  // Enable CORS for all routes
  app.use(cors<cors.CorsRequest>());

  // Create Apollo Server
  const server = new ApolloServer<{ graph: Graph }>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  // Start Apollo Server
  await server.start();

  // Apply GraphQL middleware
  app.use(
    GRAPHQL_PATH,
    json(),
    expressMiddleware(server, {
      context: async () => {
        return {
          graph: dataSource.getGraph(),
        };
      },
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'music-graphql-api' });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'Music GraphQL API',
      version: '1.0.0',
      endpoints: {
        graphql: GRAPHQL_PATH,
        health: '/health',
      },
      docs: `Visit ${req.protocol}://${req.get('host')}${GRAPHQL_PATH} for GraphQL Playground`,
    });
  });

  // Start HTTP server
  await new Promise<void>((resolve) => {
    httpServer.listen({ port: PORT }, resolve);
  });

  console.log(`✅ GraphQL server ready at http://localhost:${PORT}${GRAPHQL_PATH}`);
  console.log(`📊 GraphQL Playground available at http://localhost:${PORT}${GRAPHQL_PATH}`);
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`);

  return { server, app, httpServer, dataSource };
}

// Start server if running directly
createServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { createServer };

