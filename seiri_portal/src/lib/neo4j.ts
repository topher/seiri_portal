import "server-only";

import neo4j, { Driver, Session } from "neo4j-driver";

class Neo4jClient {
  private driver: Driver | null = null;
  private static instance: Neo4jClient;

  private constructor() {}

  public static getInstance(): Neo4jClient {
    if (!Neo4jClient.instance) {
      Neo4jClient.instance = new Neo4jClient();
    }
    return Neo4jClient.instance;
  }

  public getDriver(): Driver {
    if (!this.driver) {
      const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
      const user = process.env.NEO4J_USER || "neo4j";
      const password = process.env.NEO4J_PASSWORD || "password123";

      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }
    return this.driver;
  }

  public getSession(): Session {
    return this.getDriver().session();
  }

  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  public async verifyConnectivity(): Promise<boolean> {
    try {
      const session = this.getSession();
      await session.run("RETURN 1 as test");
      await session.close();
      return true;
    } catch (error) {
      console.error("Neo4j connectivity check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const neo4jClient = Neo4jClient.getInstance();

// Utility function to run queries
export async function runQuery<T = any>(
  query: string,
  parameters: Record<string, any> = {}
): Promise<T[]> {
  const session = neo4jClient.getSession();
  try {
    const result = await session.run(query, parameters);
    return result.records.map(record => {
      // Convert Neo4j record to plain object
      const obj: any = {};
      record.keys.forEach(key => {
        const value = record.get(key);
        if (value && typeof value === 'object' && value.properties) {
          // Node or relationship
          obj[key] = value.properties;
        } else {
          obj[key] = value;
        }
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

// Utility function to run a single query and return first result
export async function runSingleQuery<T = any>(
  query: string,
  parameters: Record<string, any> = {}
): Promise<T | null> {
  const results = await runQuery<T>(query, parameters);
  return results.length > 0 ? results[0] : null;
}

// Transaction utility
export async function runTransaction<T>(
  transactionWork: (tx: any) => Promise<T>
): Promise<T> {
  const session = neo4jClient.getSession();
  try {
    return await session.executeWrite(transactionWork);
  } finally {
    await session.close();
  }
}