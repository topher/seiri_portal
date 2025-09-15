import { NextRequest } from 'next/server';

// Mock GraphQL responses for initiative mutations
function handleInitiativeMutation(operationName: string, variables: any) {
  const { initiativeId } = variables;
  
  switch (operationName) {
    case 'GenerateInitiativePlanning':
      return {
        data: {
          generateInitiativePlanning: {
            success: true,
            planning: {
              initiativeId,
              phases: [],
              resources: [],
              timeline: [],
              risks: [],
              generatedAt: new Date().toISOString()
            },
            operationId: `planning-${Date.now()}`,
            error: null
          }
        }
      };
      
    case 'GenerateInitiativeStrategy':
      return {
        data: {
          generateInitiativeStrategy: {
            success: true,
            strategy: {
              initiativeId,
              objectives: [],
              approaches: [],
              implementation: [],
              success_criteria: [],
              generatedAt: new Date().toISOString()
            },
            operationId: `strategy-${Date.now()}`,
            error: null
          }
        }
      };
      
    case 'TrackInitiativeProgress':
      return {
        data: {
          trackInitiativeProgress: {
            success: true,
            progress: {
              initiativeId,
              overallProgress: 45,
              currentPhase: 'Planning',
              completedMilestones: [],
              upcomingMilestones: [],
              blockers: [],
              metrics: [],
              recommendations: [],
              updatedAt: new Date().toISOString()
            },
            operationId: `progress-${Date.now()}`,
            error: null
          }
        }
      };
      
    case 'AutoGenerateInitiativeTasks':
      return {
        data: {
          autoGenerateInitiativeTasks: {
            success: true,
            tasks: [
              {
                id: `task-${Date.now()}-1`,
                title: 'Generated Task 1',
                description: 'Auto-generated task description',
                priority: 'medium',
                estimatedHours: 8,
                dependencies: [],
                skills: ['javascript'],
                phase: 'development',
                createdAt: new Date().toISOString()
              }
            ],
            operationId: `tasks-${Date.now()}`,
            error: null
          }
        }
      };
      
    default:
      return {
        errors: [{ message: `Unknown operation: ${operationName}` }]
      };
  }
}

async function handler(request: NextRequest) {
  try {
    // Parse request body for GraphQL query
    const body = await request.text();
    const { query, variables, operationName } = JSON.parse(body);
    
    console.log('GraphQL request:', { query, variables, operationName });
    
    // Handle initiative mutations
    if (operationName && operationName.startsWith('Generate') || operationName === 'TrackInitiativeProgress' || operationName === 'AutoGenerateInitiativeTasks') {
      const result = handleInitiativeMutation(operationName, variables);
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Handle basic queries
    if (query.includes('hello')) {
      return new Response(
        JSON.stringify({ data: { hello: 'GraphQL server is working!' } }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Default response
    return new Response(
      JSON.stringify({ 
        errors: [{ message: 'Query not implemented yet' }] 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('GraphQL handler error:', error);
    return new Response(
      JSON.stringify({ 
        errors: [{ 
          message: 'Internal server error',
          extensions: { 
            code: 'INTERNAL_ERROR',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
          }
        }] 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}