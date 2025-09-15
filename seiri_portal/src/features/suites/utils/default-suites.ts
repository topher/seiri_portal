import neo4j from "neo4j-driver";
import { generateId } from "@/lib/neo4j-schema";

export const DEFAULT_SUITES = [
  {
    name: "Ops",
    slug: "ops",
    description: "Operations and infrastructure management"
  },
  {
    name: "Product",
    slug: "product", 
    description: "Product development and management"
  },
  {
    name: "Coding",
    slug: "coding",
    description: "Software development and engineering"
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "Marketing campaigns and brand management"
  },
  {
    name: "Sales",
    slug: "sales",
    description: "Sales processes and customer acquisition"
  },
  {
    name: "Strategy",
    slug: "strategy",
    description: "Strategic planning and business development"
  }
];

export const createDefaultSuites = async (workspaceId: string) => {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password123'
    )
  );

  const session = driver.session();
  const createdSuites = [];

  try {
    for (const suite of DEFAULT_SUITES) {
      const suiteId = generateId();
      const now = new Date();

      const result = await session.run(`
        MATCH (w:Workspace {id: $workspaceId})
        CREATE (s:Suite {
          id: $suiteId,
          name: $name,
          slug: $slug,
          description: $description,
          workspaceId: $workspaceId,
          isActive: true,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        })
        CREATE (w)-[:CONTAINS]->(s)
        RETURN s
      `, {
        workspaceId,
        suiteId,
        name: suite.name,
        slug: suite.slug,
        description: suite.description,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      });

      if (result.records.length > 0) {
        const suiteNode = result.records[0].get('s');
        createdSuites.push({
          id: suiteNode.properties.id,
          name: suiteNode.properties.name,
          slug: suiteNode.properties.slug,
          description: suiteNode.properties.description,
          isActive: suiteNode.properties.isActive,
          workspaceId: suiteNode.properties.workspaceId,
          createdAt: suiteNode.properties.createdAt,
          updatedAt: suiteNode.properties.updatedAt
        });
      }
    }
  } catch (error) {
    console.error('Failed to create default suites:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }

  return createdSuites;
};