import { neo4jClient, runQuery } from './neo4j';
import { SCHEMA_QUERIES } from './neo4j-schema';

export async function initializeNeo4jSchema() {
  console.log('🔄 Initializing Neo4j schema...');

  try {
    // Verify connectivity
    const isConnected = await neo4jClient.verifyConnectivity();
    if (!isConnected) {
      throw new Error('Cannot connect to Neo4j database');
    }

    // Create constraints
    console.log('📝 Creating constraints...');
    for (const constraint of SCHEMA_QUERIES.constraints) {
      try {
        await runQuery(constraint);
        console.log(`✅ Created constraint: ${constraint.split(' ')[2]}`);
      } catch (error: any) {
        // Ignore constraint already exists errors
        if (!(error instanceof Error ? error.message : String(error)).includes('already exists')) {
          console.error(`❌ Failed to create constraint: ${(error instanceof Error ? error.message : String(error))}`);
        }
      }
    }

    // Create indexes
    console.log('📊 Creating indexes...');
    for (const index of SCHEMA_QUERIES.indexes) {
      try {
        await runQuery(index);
        console.log(`✅ Created index: ${index.split(' ')[2]}`);
      } catch (error: any) {
        // Ignore index already exists errors
        if (!(error instanceof Error ? error.message : String(error)).includes('already exists')) {
          console.error(`❌ Failed to create index: ${(error instanceof Error ? error.message : String(error))}`);
        }
      }
    }

    console.log('🎉 Neo4j schema initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('💥 Failed to initialize Neo4j schema:', error);
    return false;
  }
}

// Utility function to clear all data (use with caution!)
export async function clearAllData() {
  console.log('🗑️ Clearing all data from Neo4j...');
  try {
    await runQuery('MATCH (n) DETACH DELETE n');
    console.log('✅ All data cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear data:', error);
    return false;
  }
}

// Function to get database statistics
export async function getDatabaseStats() {
  try {
    const stats = await runQuery(`
      CALL apoc.meta.stats() YIELD labels, relTypesCount, nodeCount, relCount
      RETURN labels, relTypesCount, nodeCount, relCount
    `);
    
    const nodeStats = await runQuery(`
      MATCH (n) 
      RETURN DISTINCT labels(n) as nodeType, count(n) as count
      ORDER BY count DESC
    `);

    const relationshipStats = await runQuery(`
      MATCH ()-[r]->() 
      RETURN DISTINCT type(r) as relationshipType, count(r) as count
      ORDER BY count DESC
    `);

    return {
      overview: stats[0] || {},
      nodes: nodeStats,
      relationships: relationshipStats
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return null;
  }
}