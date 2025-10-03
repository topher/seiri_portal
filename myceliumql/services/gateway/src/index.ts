// MyceliumQL Apollo Gateway Service
// Federation gateway for restaurant/wine platform APIs

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { readFileSync } from 'fs';
import { logger } from './utils/logger';
import { buildAuthContext } from './auth';
import { AuthenticatedDataSource } from './datasources';

export class MyceliumGateway {
  private gateway: ApolloGateway;
  private server: ApolloServer;

  constructor() {
    this.setupGateway();
    this.setupServer();
  }

  private setupGateway() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Production: Use static supergraph schema
      try {
        const supergraphSdl = readFileSync('./supergraph.graphql').toString();
        
        this.gateway = new ApolloGateway({
          supergraphSdl,
          buildService({ url }) {
            return new AuthenticatedDataSource({ url });
          }
        });
        
        logger.info('Gateway initialized with static supergraph schema');
        
      } catch (error) {
        logger.error('Failed to load supergraph schema, falling back to introspection', error);
        this.setupDevelopmentGateway();
      }
    } else {
      // Development: Use introspection and compose
      this.setupDevelopmentGateway();
    }
  }

  private setupDevelopmentGateway() {
    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs: [
          // Priority API subgraphs
          { 
            name: 'shopify', 
            url: process.env.SHOPIFY_CARTRIDGE_URL || 'http://localhost:4001/graphql' 
          },
          { 
            name: 'twilio', 
            url: process.env.TWILIO_CARTRIDGE_URL || 'http://localhost:4002/graphql' 
          },
          { 
            name: 'sendgrid', 
            url: process.env.SENDGRID_CARTRIDGE_URL || 'http://localhost:4003/graphql' 
          },
          // Core graph data layer
          { 
            name: 'neo4j', 
            url: process.env.NEO4J_GRAPHQL_URL || 'http://localhost:4004/graphql' 
          }
        ],
        introspectionHeaders: {
          // Add any required headers for subgraph introspection
        },
        pollIntervalInMs: 30000, // Poll every 30 seconds in development
        subgraphHealthCheck: true
      }),
      buildService({ url }) {
        return new AuthenticatedDataSource({ url });
      }
    });
    
    logger.info('Gateway initialized with introspection and compose for development');
  }

  private setupServer() {
    this.server = new ApolloServer({
      gateway: this.gateway,
      
      // Enable introspection and playground in development
      introspection: process.env.ENABLE_INTROSPECTION === 'true',
      
      // Custom formatError to handle federation errors gracefully
      formatError: (err) => {
        logger.error('GraphQL Error:', {
          message: err.message,
          locations: err.locations,
          path: err.path,
          extensions: err.extensions
        });
        
        // Don't expose internal errors in production
        if (process.env.NODE_ENV === 'production') {
          delete err.extensions?.exception?.stacktrace;
        }
        
        return err;
      },

      // Custom plugins for logging and metrics
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info('GraphQL Operation:', {
                  operationName: requestContext.request.operationName,
                  operationType: requestContext.operationName,
                  variables: requestContext.request.variables
                });
              },
              
              didEncounterErrors(requestContext) {
                logger.error('GraphQL Execution Errors:', {
                  operationName: requestContext.request.operationName,
                  errors: requestContext.errors?.map(err => ({
                    message: err.message,
                    path: err.path
                  }))
                });
              },
              
              willSendResponse(requestContext) {
                const duration = Date.now() - requestContext.request.http?.body?.timestamp;
                
                logger.info('GraphQL Response:', {
                  operationName: requestContext.request.operationName,
                  duration: `${duration}ms`,
                  errors: requestContext.errors?.length || 0
                });
              }
            };
          }
        }
      ]
    });
  }

  async start(port: number = 4000) {
    try {
      const { url } = await startStandaloneServer(this.server, {
        listen: { port },
        context: buildAuthContext
      });

      logger.info(`🚀 MyceliumQL Gateway ready at ${url}`, {
        environment: process.env.NODE_ENV,
        introspection: process.env.ENABLE_INTROSPECTION === 'true',
        playground: process.env.ENABLE_PLAYGROUND === 'true',
        subgraphs: {
          shopify: process.env.SHOPIFY_CARTRIDGE_URL || 'http://localhost:4001/graphql',
          twilio: process.env.TWILIO_CARTRIDGE_URL || 'http://localhost:4002/graphql',
          sendgrid: process.env.SENDGRID_CARTRIDGE_URL || 'http://localhost:4003/graphql',
          neo4j: process.env.NEO4J_GRAPHQL_URL || 'http://localhost:4004/graphql'
        }
      });

    } catch (error) {
      logger.error('Failed to start MyceliumQL Gateway:', error);
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      await this.server.stop();
      logger.info('MyceliumQL Gateway stopped');
    }
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the gateway if this file is run directly
if (require.main === module) {
  const gateway = new MyceliumGateway();
  const port = parseInt(process.env.GATEWAY_PORT || '4000');
  gateway.start(port);
}