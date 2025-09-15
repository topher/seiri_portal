// Development Suite Domain Ontology
// Defines data structures and validation rules for Development management

import { DomainOntology, ValidationResult } from '../suite.model';

export const DevelopmentOntology: DomainOntology = {
  namespace: "https://seiri.ai/ontology/development#",
  
  classes: [
    // API Specification Class Definition
    {
      name: "APISpecification",
      properties: [
        {
          name: "title",
          type: "String",
          required: true
        },
        {
          name: "version",
          type: "String",
          required: true,
          pattern: "^\\d+\\.\\d+\\.\\d+$"
        },
        {
          name: "baseURL",
          type: "String",
          required: true
        },
        {
          name: "authentication",
          type: "AuthenticationMethod",
          required: true
        },
        {
          name: "endpoints",
          type: "[APIEndpoint]",
          required: true,
          minItems: 1
        },
        {
          name: "dataModels",
          type: "[DataModel]",
          required: true,
          minItems: 1
        },
        {
          name: "errorHandling",
          type: "ErrorHandlingStrategy",
          required: true
        },
        {
          name: "rateLimiting",
          type: "RateLimitingConfig",
          required: false
        },
        {
          name: "documentation",
          type: "String",
          required: true,
          minItems: 100
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateRESTfulDesign",
          message: "API should follow RESTful design principles"
        },
        {
          type: "custom",
          value: "validateSecurityCompliance",
          message: "API must implement proper security measures"
        }
      ]
    },

    // Component Architecture Class Definition
    {
      name: "ComponentArchitecture",
      properties: [
        {
          name: "name",
          type: "String",
          required: true
        },
        {
          name: "type",
          type: "ComponentType",
          required: true
        },
        {
          name: "description",
          type: "String",
          required: true,
          minItems: 50
        },
        {
          name: "properties",
          type: "[ComponentProperty]",
          required: false
        },
        {
          name: "methods",
          type: "[ComponentMethod]",
          required: false
        },
        {
          name: "dependencies",
          type: "[String]", // Component names
          required: false
        },
        {
          name: "interfaces",
          type: "[ComponentInterface]",
          required: false
        },
        {
          name: "testingStrategy",
          type: "TestingStrategy",
          required: true
        },
        {
          name: "performance",
          type: "PerformanceRequirements",
          required: false
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateComponentCoupling",
          message: "Components should have low coupling and high cohesion"
        },
        {
          type: "custom",
          value: "validateTestCoverage",
          message: "Components must have adequate test coverage"
        }
      ]
    },

    // Technical Architecture Class Definition
    {
      name: "TechnicalArchitecture",
      properties: [
        {
          name: "systemName",
          type: "String",
          required: true
        },
        {
          name: "architecturePattern",
          type: "ArchitecturePattern",
          required: true
        },
        {
          name: "technologyStack",
          type: "TechnologyStack",
          required: true
        },
        {
          name: "dataArchitecture",
          type: "DataArchitecture",
          required: true
        },
        {
          name: "securityArchitecture",
          type: "SecurityArchitecture",
          required: true
        },
        {
          name: "scalabilityStrategy",
          type: "ScalabilityStrategy",
          required: true
        },
        {
          name: "deploymentStrategy",
          type: "DeploymentStrategy",
          required: true
        },
        {
          name: "monitoringStrategy",
          type: "MonitoringStrategy",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateArchitecturalConsistency",
          message: "Architecture decisions must be consistent across layers"
        }
      ]
    },

    // Development Process Class Definition
    {
      name: "DevelopmentProcess",
      properties: [
        {
          name: "methodology",
          type: "DevelopmentMethodology",
          required: true
        },
        {
          name: "workflow",
          type: "DevelopmentWorkflow",
          required: true
        },
        {
          name: "codeStandards",
          type: "CodeStandards",
          required: true
        },
        {
          name: "qualityGates",
          type: "[QualityGate]",
          required: true,
          minItems: 3
        },
        {
          name: "cicdPipeline",
          type: "CICDPipeline",
          required: true
        },
        {
          name: "testingProcess",
          type: "TestingProcess",
          required: true
        }
      ],
      constraints: []
    },

    // Technical Debt Assessment Class Definition
    {
      name: "TechnicalDebtAssessment",
      properties: [
        {
          name: "debtItems",
          type: "[TechnicalDebtItem]",
          required: true
        },
        {
          name: "totalDebtScore",
          type: "Number",
          required: true
        },
        {
          name: "prioritizedRemediationPlan",
          type: "[RemediationItem]",
          required: true
        },
        {
          name: "riskAssessment",
          type: "RiskAssessment",
          required: true
        }
      ],
      constraints: [
        {
          type: "custom",
          value: "validateDebtPrioritization",
          message: "Technical debt should be prioritized by business impact"
        }
      ]
    }
  ],

  relationships: [
    {
      from: "APISpecification",
      to: "ComponentArchitecture",
      type: "SERVES",
      cardinality: "many:many"
    },
    {
      from: "ComponentArchitecture",
      to: "TechnicalArchitecture",
      type: "PART_OF",
      cardinality: "1:many"
    },
    {
      from: "TechnicalArchitecture",
      to: "DevelopmentProcess",
      type: "GUIDES",
      cardinality: "1:1"
    },
    {
      from: "ComponentArchitecture",
      to: "TechnicalDebtAssessment",
      type: "ASSESSED_BY",
      cardinality: "1:many"
    }
  ],

  validationRules: [
    {
      name: "validateRESTfulDesign",
      description: "Ensure API follows RESTful design principles",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.apiSpec && data.apiSpec.endpoints) {
          data.apiSpec.endpoints.forEach((endpoint: any, index: number) => {
            // Check HTTP method usage
            if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)) {
              errors.push(`Endpoint ${index + 1}: Invalid HTTP method ${endpoint.method}`);
            }
            
            // Check URL patterns
            if (endpoint.path.includes('?')) {
              warnings.push(`Endpoint ${index + 1}: Query parameters should not be in path definition`);
            }
            
            // Check resource naming
            if (endpoint.method === 'GET' && endpoint.path.includes('/get')) {
              warnings.push(`Endpoint ${index + 1}: Avoid 'get' in URL for GET requests`);
            }
            
            // Check status codes
            if (!endpoint.responses || Object.keys(endpoint.responses).length < 2) {
              warnings.push(`Endpoint ${index + 1}: Should define multiple response status codes`);
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },

    {
      name: "validateSecurityCompliance",
      description: "Ensure API implements proper security measures",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.apiSpec) {
          // Check authentication
          if (!data.apiSpec.authentication || data.apiSpec.authentication === 'NONE') {
            errors.push('API must implement authentication');
          }
          
          // Check HTTPS
          if (data.apiSpec.baseURL && !data.apiSpec.baseURL.startsWith('https://')) {
            errors.push('API must use HTTPS');
          }
          
          // Check rate limiting
          if (!data.apiSpec.rateLimiting) {
            warnings.push('Consider implementing rate limiting');
          }
          
          // Check input validation
          if (data.apiSpec.endpoints) {
            const endpointsWithInput = data.apiSpec.endpoints.filter((e: any) => 
              ['POST', 'PUT', 'PATCH'].includes(e.method)
            );
            
            endpointsWithInput.forEach((endpoint: any, index: number) => {
              if (!endpoint.requestValidation) {
                warnings.push(`Endpoint ${endpoint.path}: Should implement input validation`);
              }
            });
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },

    {
      name: "validateComponentCoupling",
      description: "Ensure components have appropriate coupling",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.components && Array.isArray(data.components)) {
          data.components.forEach((component: any, index: number) => {
            const dependencyCount = component.dependencies?.length || 0;
            
            // Check for excessive dependencies
            if (dependencyCount > 5) {
              warnings.push(`Component ${index + 1}: High coupling detected (${dependencyCount} dependencies)`);
            }
            
            // Check for circular dependencies (simplified)
            if (component.dependencies && component.dependencies.includes(component.name)) {
              errors.push(`Component ${index + 1}: Circular dependency detected`);
            }
          });
          
          // Check for components with no interfaces
          const componentsWithoutInterfaces = data.components.filter((c: any) => 
            !c.interfaces || c.interfaces.length === 0
          );
          
          if (componentsWithoutInterfaces.length > 0) {
            warnings.push(`${componentsWithoutInterfaces.length} components lack defined interfaces`);
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    },

    {
      name: "validateTestCoverage",
      description: "Ensure adequate test coverage strategy",
      validator: (data: any): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (data.components && Array.isArray(data.components)) {
          data.components.forEach((component: any, index: number) => {
            if (!component.testingStrategy) {
              errors.push(`Component ${index + 1}: Must define testing strategy`);
            } else {
              const strategy = component.testingStrategy;
              
              if (!strategy.unitTests) {
                errors.push(`Component ${index + 1}: Must include unit testing`);
              }
              
              if (component.type === 'SERVICE' && !strategy.integrationTests) {
                warnings.push(`Component ${index + 1}: Services should include integration testing`);
              }
              
              if (strategy.coverageTarget && strategy.coverageTarget < 80) {
                warnings.push(`Component ${index + 1}: Coverage target (${strategy.coverageTarget}%) is below recommended 80%`);
              }
            }
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    }
  ]
};

// Enums for Development Domain
export enum ComponentType {
  SERVICE = 'SERVICE',
  CONTROLLER = 'CONTROLLER',
  REPOSITORY = 'REPOSITORY',
  MODEL = 'MODEL',
  UTILITY = 'UTILITY',
  MIDDLEWARE = 'MIDDLEWARE',
  UI_COMPONENT = 'UI_COMPONENT',
  API_CLIENT = 'API_CLIENT'
}

export enum ArchitecturePattern {
  MICROSERVICES = 'MICROSERVICES',
  MONOLITHIC = 'MONOLITHIC',
  LAYERED = 'LAYERED',
  EVENT_DRIVEN = 'EVENT_DRIVEN',
  SERVERLESS = 'SERVERLESS',
  CQRS = 'CQRS',
  HEXAGONAL = 'HEXAGONAL'
}

export enum DevelopmentMethodology {
  AGILE = 'AGILE',
  SCRUM = 'SCRUM',
  KANBAN = 'KANBAN',
  LEAN = 'LEAN',
  WATERFALL = 'WATERFALL',
  DEVOPS = 'DEVOPS'
}

export enum AuthenticationMethod {
  JWT = 'JWT',
  OAUTH2 = 'OAUTH2',
  API_KEY = 'API_KEY',
  BASIC_AUTH = 'BASIC_AUTH',
  SESSION = 'SESSION',
  SAML = 'SAML',
  NONE = 'NONE'
}

// Supporting interface definitions
export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security: string[];
  tags: string[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;
  description: string;
}

export interface RequestBody {
  description: string;
  required: boolean;
  schema: any;
}

export interface Response {
  description: string;
  schema?: any;
  headers?: Record<string, any>;
}

export interface DataModel {
  name: string;
  properties: Record<string, PropertySchema>;
  required: string[];
  relationships: ModelRelationship[];
}

export interface PropertySchema {
  type: string;
  format?: string;
  description: string;
  constraints?: any;
}

export interface ModelRelationship {
  target: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  description: string;
}

export interface ComponentProperty {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  description: string;
}

export interface ComponentMethod {
  name: string;
  parameters: Parameter[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  description: string;
}

export interface ComponentInterface {
  name: string;
  methods: string[];
  description: string;
}

export interface TestingStrategy {
  unitTests: boolean;
  integrationTests: boolean;
  e2eTests: boolean;
  coverageTarget: number;
  testFrameworks: string[];
}

export interface PerformanceRequirements {
  responseTime: number; // milliseconds
  throughput: number; // requests per second
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export interface TechnologyStack {
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
  tools: string[];
}

export interface QualityGate {
  name: string;
  criteria: string[];
  automated: boolean;
  blocksDeployment: boolean;
}

// Development-specific utility functions
export const DevelopmentUtils = {
  // Calculate technical debt score
  calculateTechnicalDebtScore: (components: any[]): number => {
    let totalScore = 0;
    let componentCount = 0;
    
    components.forEach(component => {
      let componentScore = 0;
      
      // Coupling score (0-25 points)
      const dependencyCount = component.dependencies?.length || 0;
      componentScore += Math.max(0, 25 - (dependencyCount * 3));
      
      // Test coverage score (0-25 points)
      const coverage = component.testingStrategy?.coverageTarget || 0;
      componentScore += (coverage / 100) * 25;
      
      // Code quality score (0-25 points) - mock calculation
      componentScore += 20; // Assume good quality baseline
      
      // Documentation score (0-25 points)
      const hasDocumentation = component.description && component.description.length > 50;
      componentScore += hasDocumentation ? 25 : 10;
      
      totalScore += componentScore;
      componentCount++;
    });
    
    return componentCount > 0 ? totalScore / componentCount : 0;
  },

  // Validate API design consistency
  validateAPIConsistency: (endpoints: APIEndpoint[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check naming consistency
    const pathPatterns = endpoints.map(e => e.path.split('/').filter(p => p.length > 0));
    const resourceNames = new Set(pathPatterns.map(p => p[0]));
    
    // Check if all endpoints use consistent resource naming
    endpoints.forEach((endpoint, index) => {
      if (endpoint.method === 'GET' && endpoint.path.includes('/get')) {
        warnings.push(`Endpoint ${index + 1}: Avoid redundant 'get' in GET endpoints`);
      }
      
      if (endpoint.method === 'POST' && !endpoint.requestBody) {
        warnings.push(`Endpoint ${index + 1}: POST endpoints should have request body`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  // Generate component dependency graph
  generateDependencyGraph: (components: any[]): {
    nodes: any[];
    edges: any[];
    cycles: string[][];
  } => {
    const nodes = components.map(c => ({ id: c.name, label: c.name, type: c.type }));
    const edges: any[] = [];
    
    components.forEach(component => {
      if (component.dependencies) {
        component.dependencies.forEach((dep: string) => {
          edges.push({
            from: component.name,
            to: dep,
            label: 'depends on'
          });
        });
      }
    });
    
    // Simple cycle detection (would need more sophisticated algorithm for production)
    const cycles: string[][] = [];
    
    return { nodes, edges, cycles };
  },

  // Suggest architecture improvements
  suggestArchitectureImprovements: (architecture: any): string[] => {
    const suggestions: string[] = [];
    
    if (architecture.components) {
      const highCouplingComponents = architecture.components.filter((c: any) => 
        (c.dependencies?.length || 0) > 5
      );
      
      if (highCouplingComponents.length > 0) {
        suggestions.push(`Consider breaking down high-coupling components: ${highCouplingComponents.map((c: any) => c.name).join(', ')}`);
      }
      
      const untestedComponents = architecture.components.filter((c: any) => 
        !c.testingStrategy || (c.testingStrategy.coverageTarget || 0) < 70
      );
      
      if (untestedComponents.length > 0) {
        suggestions.push(`Improve test coverage for: ${untestedComponents.map((c: any) => c.name).join(', ')}`);
      }
    }
    
    if (architecture.apiSpec && architecture.apiSpec.endpoints) {
      const inconsistentEndpoints = architecture.apiSpec.endpoints.filter((e: any) => 
        !e.security || e.security.length === 0
      );
      
      if (inconsistentEndpoints.length > 0) {
        suggestions.push('Ensure all API endpoints have proper security configuration');
      }
    }
    
    return suggestions;
  },

  // Calculate development velocity metrics
  calculateVelocityMetrics: (sprints: any[]): {
    averageVelocity: number;
    velocityTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
    predictedCapacity: number;
  } => {
    if (sprints.length === 0) {
      return {
        averageVelocity: 0,
        velocityTrend: 'STABLE',
        predictedCapacity: 0
      };
    }
    
    const velocities = sprints.map(s => s.completedStoryPoints || 0);
    const averageVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    
    // Simple trend analysis
    const recentVelocities = velocities.slice(-3);
    const earlierVelocities = velocities.slice(0, -3);
    
    let velocityTrend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
    
    if (recentVelocities.length > 0 && earlierVelocities.length > 0) {
      const recentAvg = recentVelocities.reduce((a, b) => a + b, 0) / recentVelocities.length;
      const earlierAvg = earlierVelocities.reduce((a, b) => a + b, 0) / earlierVelocities.length;
      
      if (recentAvg > earlierAvg * 1.1) {
        velocityTrend = 'INCREASING';
      } else if (recentAvg < earlierAvg * 0.9) {
        velocityTrend = 'DECREASING';
      }
    }
    
    // Predict next sprint capacity (with some buffer)
    const predictedCapacity = Math.round(averageVelocity * 0.9);
    
    return {
      averageVelocity: Math.round(averageVelocity),
      velocityTrend,
      predictedCapacity
    };
  }
};