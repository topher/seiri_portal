import { NextRequest } from 'next/server';

// Fetch real wine reservation data from Neo4j API
async function fetchWineReservationsFromApi(): Promise<any[]> {
  try {
    const response = await fetch('http://localhost:3000/api/reservations?userId=current-user-id', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.reservations || [];
    } else {
      console.warn('Failed to fetch reservations from API, using fallback');
    }
  } catch (error) {
    console.warn('Error fetching reservations from API:', error);
  }
  
  // Fallback mock data if API is unavailable
  return [{
    id: "res_1758070567200_z4c6e175r",
    confirmationNumber: "VV-1758070567200-jhncjcfyo",
    hostName: "Chris Williams",
    hostEmail: "topherfwilliams@gmail.com",
    hostId: "current-user-id",
    partySize: 1,
    dateTime: "2025-09-23T17:30:00",
    reservationDate: "2025-09-23",
    reservationTime: "17:30",
    reservationType: "bottle",
    status: "pending",
    guests: [],
    restaurant: {
      id: "obelix",
      name: "Obelix",
      address: "Chicago, IL",
      phone: "",
      isPartner: false,
      enhancedServices: {
        advanceWineSelection: true,
        glasswareOptions: true,
        temperatureControl: true,
        sommelierService: true
      }
    },
    wines: [
      {
        id: "test_wine_2",
        name: "Test Bordeaux",
        producer: "Chateau Test",
        vintage: "2018",
        varietal: "Cabernet Sauvignon",
        region: "Bordeaux",
        price: 200,
        quantity: 2,
        reservationType: "bottle",
        servicePreferences: {
          glassware: "bordeaux",
          servingTemperature: "cellar_temp",
          decantTime: 30,
          serviceNotes: ""
        }
      }
    ],
    servicePreferences: {
      glassware: "standard",
      decantTime: 0,
      servingTemperature: "cellar_temp"
    },
    createdAt: "2025-09-17",
    updatedAt: "2025-09-17",
    message: "Reservation created successfully"
  }];
}

// Handle reservation/wine queries and mutations
async function handleReservationQuery(operationName: string, variables: any, query: string) {
  // Handle queries
  if (query.includes('GetAcceptedOffers') || query.includes('offers')) {
    // Fetch real wine reservations from API
    const wineReservations = await fetchWineReservationsFromApi();
    
    // Convert wine reservations to offers format that the component expects
    const offers = wineReservations.map(reservation => ({
      id: reservation.id,
      name: `Wine Reservation - ${reservation.restaurant.name}`,
      description: `${reservation.wines.length} bottles for ${reservation.partySize} guests`,
      status: 'ACCEPTED',
      startTime: reservation.dateTime,
      endTime: reservation.dateTime,
      terms: `Wine service reservation at ${reservation.restaurant.name}`,
      price: reservation.wines.reduce((total: number, wine: any) => total + (wine.price * wine.quantity), 0),
      currency: 'USD',
      resourceQuantity: reservation.wines.reduce((total: number, wine: any) => total + wine.quantity, 0),
      provider: {
        id: reservation.restaurant.id,
        name: reservation.restaurant.name,
        email: 'restaurant@example.com'
      },
      receiver: {
        id: reservation.hostId,
        name: reservation.hostName,
        email: reservation.hostEmail
      },
      intent: {
        id: `intent_${reservation.id}`,
        name: 'Wine Service Intent',
        description: 'Wine service for dining experience',
        resourceSpecification: {
          id: 'wine_service',
          name: 'Wine Service',
          category: 'hospitality',
          unitOfMeasure: 'bottle'
        }
      },
      resource: {
        id: 'wine_resource',
        identifier: reservation.wines.map((w: any) => w.name).join(', '),
        condition: 'excellent',
        location: reservation.restaurant.address
      },
      agreement: null, // No agreement yet
      createdAt: reservation.createdAt,
      // Add wine-specific metadata
      wineReservation: {
        confirmationNumber: reservation.confirmationNumber,
        wines: reservation.wines,
        servicePreferences: reservation.servicePreferences,
        restaurant: reservation.restaurant
      }
    }));

    return {
      data: {
        offers: offers
      }
    };
  }

  // Handle agreement details query
  if (query.includes('GetAgreementDetails') && variables?.id) {
    const agreementId = variables.id;
    const wineReservations = await fetchWineReservationsFromApi();
    const reservation = wineReservations[0]; // Use the first reservation for demo
    
    const mockAgreement = {
      id: agreementId,
      name: `Wine Service Agreement - ${reservation.confirmationNumber}`,
      description: `Wine service agreement for reservation at ${reservation.restaurant.name}`,
      status: 'PENDING',
      terms: `Wine Service Terms and Conditions\n\n1. Wine Selection: ${reservation.wines.map((w: any) => `${w.quantity}x ${w.name} (${w.producer})`).join('\n   ')}\n\n2. Service Details:\n   - Date: ${reservation.reservationDate}\n   - Time: ${reservation.reservationTime}\n   - Party Size: ${reservation.partySize}\n   - Location: ${reservation.restaurant.name}, ${reservation.restaurant.address}\n\n3. Payment Terms:\n   - Total: $${reservation.wines.reduce((total: number, wine: any) => total + (wine.price * wine.quantity), 0)}\n   - Payment due upon service\n\n4. Cancellation Policy:\n   - 24 hours notice required for cancellation\n   - Sommelier service included\n\n5. Service Preferences:\n   - Glassware: ${reservation.servicePreferences.glassware}\n   - Serving Temperature: ${reservation.servicePreferences.servingTemperature}\n   - Decant Time: ${reservation.servicePreferences.decantTime} minutes`,
      price: reservation.wines.reduce((total: number, wine: any) => total + (wine.price * wine.quantity), 0),
      currency: 'USD',
      startTime: reservation.dateTime,
      endTime: reservation.dateTime,
      signedAt: null,
      fulfilledAt: null,
      provider: {
        id: reservation.restaurant.id,
        name: reservation.restaurant.name,
        email: 'restaurant@example.com'
      },
      receiver: {
        id: reservation.hostId,
        name: reservation.hostName,
        email: reservation.hostEmail
      },
      intent: {
        id: `intent_${reservation.id}`,
        name: 'Wine Service Intent',
        resourceSpecification: {
          name: 'Wine Service',
          category: 'hospitality'
        }
      },
      offer: {
        id: reservation.id,
        name: `Wine Reservation - ${reservation.restaurant.name}`
      },
      resource: {
        id: 'wine_resource',
        identifier: reservation.wines.map((w: any) => w.name).join(', '),
        condition: 'excellent',
        location: reservation.restaurant.address
      },
      fulfillments: [],
      createdAt: reservation.createdAt
    };

    return {
      data: {
        agreement: mockAgreement
      }
    };
  }

  // Handle mutations
  if (query.includes('CreateAgreement') || operationName === 'CreateAgreement') {
    const { input } = variables;
    const agreementId = `agreement_${Date.now()}`;
    
    return {
      data: {
        createAgreement: {
          id: agreementId,
          name: input.name,
          status: 'PENDING',
          terms: input.terms,
          price: 1450, // Total from wine prices
          currency: 'USD',
          provider: {
            id: 'obelix',
            name: 'Obelix'
          },
          receiver: {
            id: 'current-user-id',
            name: 'Chris Williams'
          },
          createdAt: new Date().toISOString()
        }
      }
    };
  }

  if (query.includes('SignAgreement') || operationName === 'SignAgreement') {
    const { id } = variables;
    
    return {
      data: {
        signAgreement: {
          id: id,
          status: 'SIGNED',
          signedAt: new Date().toISOString(),
          provider: {
            id: 'obelix',
            name: 'Obelix'
          },
          receiver: {
            id: 'current-user-id',
            name: 'Chris Williams'
          }
        }
      }
    };
  }

  return {
    errors: [{ message: `Unknown reservation query: ${operationName}` }]
  };
}

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
    
    // Handle reservation/wine queries
    if (query.includes('GetAcceptedOffers') || query.includes('offers') || query.includes('agreement') || operationName?.includes('Offer') || operationName?.includes('Agreement')) {
      const result = await handleReservationQuery(operationName || '', variables, query);
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
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