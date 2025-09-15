import "server-only";

import { v4 as uuidv4 } from 'uuid';
import { AgentContext, NodeType } from './context-engine';
import { LLMService } from './llm-service';
import { CacheService } from './cache-service';
import { runQuery, runSingleQuery } from '@/lib/neo4j';

// Core agent types and interfaces
export interface AgentCapabilities {
  canAnalyze: boolean;
  canGenerate: boolean;
  canOptimize: boolean;
  canSuggest: boolean;
  canAutomate: boolean;
}

export interface AgentInteraction {
  id: string;
  agentName: string;
  agentType: AgentType;
  userId: string;
  contextNodeId: string;
  contextNodeType: NodeType;
  operation: string;
  input: any;
  output: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  metadata: {
    requestId: string;
    cacheHit: boolean;
    modelUsed?: string;
    tokenCount?: number;
    confidenceScore?: number;
  };
}

export interface AgentResponse<T = any> {
  data: T;
  metadata: {
    agentName: string;
    agentType: AgentType;
    operation: string;
    duration: number;
    cached: boolean;
    confidence: number;
    modelUsed: string;
    interactionId: string;
  };
  error?: string;
}

export interface AgentOperationConfig {
  useCache?: boolean;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
  modelOverride?: string;
  temperature?: number;
  maxTokens?: number;
}

export type AgentType = 'WORKSPACE' | 'SUITE' | 'INITIATIVE' | 'TASK' | 'GENERAL';

// Base abstract agent class
export abstract class BaseAgent {
  protected llm: LLMService;
  protected cache: CacheService;
  
  // Agent identification
  abstract readonly name: string;
  abstract readonly type: AgentType;
  abstract readonly capabilities: AgentCapabilities;
  abstract readonly version: string;
  
  // Configuration
  protected defaultConfig: AgentOperationConfig = {
    useCache: true,
    cacheTTL: 300, // 5 minutes
    timeout: 30000, // 30 seconds
    retries: 2,
    temperature: 0.7,
    maxTokens: 2000
  };

  constructor(llmService: LLMService, cacheService: CacheService) {
    this.llm = llmService;
    this.cache = cacheService;
  }

  /**
   * Execute an agent operation with full lifecycle management
   */
  protected async executeOperation<T>(
    operation: string,
    context: AgentContext,
    input: any,
    handler: (context: AgentContext, input: any) => Promise<T>,
    config: AgentOperationConfig = {}
  ): Promise<AgentResponse<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const interactionId = uuidv4();
    const startTime = new Date();

    // Create interaction record
    const interaction: AgentInteraction = {
      id: interactionId,
      agentName: this.name,
      agentType: this.type,
      userId: context.user.id,
      contextNodeId: context.currentNode.id,
      contextNodeType: context.nodeType,
      operation,
      input,
      output: null,
      status: 'pending',
      startTime,
      metadata: {
        requestId: context.metadata.requestId,
        cacheHit: false
      }
    };

    try {
      // Store interaction start
      await this.storeInteraction(interaction);

      // Check cache if enabled
      let result: T | undefined;
      let cached = false;
      
      if (finalConfig.useCache) {
        const cacheKey = this.buildCacheKey(operation, context, input);
        const cachedResult = await this.cache.get<T>(cacheKey);
        
        if (cachedResult) {
          result = cachedResult;
          cached = true;
          interaction.metadata.cacheHit = true;
        }
      }

      // Execute operation if not cached
      if (!cached) {
        interaction.status = 'processing';
        await this.updateInteraction(interaction);

        // Execute with timeout
        result = await this.withTimeout(
          handler(context, input),
          finalConfig.timeout!
        );

        // Cache result if enabled
        if (finalConfig.useCache && finalConfig.cacheTTL! > 0) {
          const cacheKey = this.buildCacheKey(operation, context, input);
          await this.cache.set(cacheKey, result, finalConfig.cacheTTL!);
        }
      }

      // Complete interaction
      const endTime = new Date();
      if (result === undefined) {
        throw new Error('Operation result is undefined');
      }
      interaction.output = result;
      interaction.status = 'completed';
      interaction.endTime = endTime;
      interaction.duration = endTime.getTime() - startTime.getTime();
      await this.updateInteraction(interaction);

      // Build response
      return {
        data: result,
        metadata: {
          agentName: this.name,
          agentType: this.type,
          operation,
          duration: interaction.duration,
          cached,
          confidence: this.calculateConfidence(result, context),
          modelUsed: interaction.metadata.modelUsed || 'unknown',
          interactionId
        }
      };

    } catch (error) {
      // Handle failure
      const endTime = new Date();
      interaction.status = 'failed';
      interaction.endTime = endTime;
      interaction.duration = endTime.getTime() - startTime.getTime();
      interaction.error = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      
      await this.updateInteraction(interaction);

      throw error;
    }
  }

  /**
   * Validate context before operation
   */
  protected validateContext(context: AgentContext, requiredNodeType?: NodeType): void {
    if (!context.user?.id) {
      throw new Error('User context is required');
    }

    if (!context.currentNode?.id) {
      throw new Error('Current node context is required');
    }

    if (requiredNodeType && context.nodeType !== requiredNodeType) {
      throw new Error(`Agent requires ${requiredNodeType} context, got ${context.nodeType}`);
    }

    if (!context.permissions?.canRead) {
      throw new Error('User does not have read permissions');
    }
  }

  /**
   * Log agent activities for debugging and analytics
   */
  protected async logActivity(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: AgentContext,
    metadata?: any
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      level,
      agentName: this.name,
      agentType: this.type,
      userId: context.user.id,
      contextNodeId: context.currentNode.id,
      message,
      metadata
    };

    // In production, this would go to a proper logging service
    console.log(`[${level.toUpperCase()}] ${this.name}:`, logEntry);

    // Store in database for analytics
    try {
      await runQuery(`
        CREATE (log:AgentLog {
          id: $id,
          timestamp: $timestamp,
          level: $level,
          agentName: $agentName,
          agentType: $agentType,
          userId: $userId,
          contextNodeId: $contextNodeId,
          message: $message,
          metadata: $metadata
        })
      `, {
        id: uuidv4(),
        timestamp: logEntry.timestamp.toISOString(),
        level: logEntry.level,
        agentName: logEntry.agentName,
        agentType: logEntry.agentType,
        userId: logEntry.userId,
        contextNodeId: logEntry.contextNodeId,
        message: logEntry.message,
        metadata: JSON.stringify(logEntry.metadata || {})
      });
    } catch (error) {
      console.error('Failed to store agent log:', error);
    }
  }

  /**
   * Get agent analytics and performance metrics
   */
  async getAnalytics(timeRange: { start: Date; end: Date }): Promise<any> {
    const query = `
      MATCH (interaction:AgentInteraction {agentName: $agentName})
      WHERE datetime(interaction.startTime) >= datetime($start)
        AND datetime(interaction.startTime) <= datetime($end)
      RETURN 
        count(interaction) as totalInteractions,
        avg(interaction.duration) as avgDuration,
        collect(interaction.status) as statuses,
        avg(CASE WHEN interaction.cacheHit THEN 1.0 ELSE 0.0 END) as cacheHitRate
    `;

    const result = await runSingleQuery(query, {
      agentName: this.name,
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    });

    return result || {
      totalInteractions: 0,
      avgDuration: 0,
      statuses: [],
      cacheHitRate: 0
    };
  }

  // Abstract methods to be implemented by specific agents
  abstract canHandleOperation(operation: string, context: AgentContext): boolean;
  abstract getAvailableOperations(context: AgentContext): string[];

  // Protected utility methods
  protected buildCacheKey(operation: string, context: AgentContext, input: any): string {
    const keyParts = [
      this.name,
      this.version,
      operation,
      context.currentNode.id,
      context.nodeType,
      this.hashInput(input)
    ];
    return keyParts.join(':');
  }

  protected hashInput(input: any): string {
    // Simple hash for cache key - in production use a proper hash function
    return Buffer.from(JSON.stringify(input)).toString('base64').slice(0, 16);
  }

  protected async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  protected calculateConfidence(result: any, context: AgentContext): number {
    // Base confidence calculation - override in specific agents
    if (!result) return 0;
    
    // Simple heuristics
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for read operations
    if (context.permissions.canRead) confidence += 0.2;
    
    // Higher confidence for recent data
    const nodeAge = Date.now() - context.currentNode.updatedAt.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    if (nodeAge < dayInMs) confidence += 0.1;
    
    // Higher confidence for rich context
    if (context.hierarchy.children.length > 0) confidence += 0.1;
    if (context.hierarchy.dependencies.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  protected async storeInteraction(interaction: AgentInteraction): Promise<void> {
    try {
      await runQuery(`
        CREATE (interaction:AgentInteraction {
          id: $id,
          agentName: $agentName,
          agentType: $agentType,
          userId: $userId,
          contextNodeId: $contextNodeId,
          contextNodeType: $contextNodeType,
          operation: $operation,
          input: $input,
          output: $output,
          status: $status,
          startTime: $startTime,
          endTime: $endTime,
          duration: $duration,
          error: $error,
          metadata: $metadata
        })
      `, {
        id: interaction.id,
        agentName: interaction.agentName,
        agentType: interaction.agentType,
        userId: interaction.userId,
        contextNodeId: interaction.contextNodeId,
        contextNodeType: interaction.contextNodeType,
        operation: interaction.operation,
        input: JSON.stringify(interaction.input),
        output: interaction.output ? JSON.stringify(interaction.output) : null,
        status: interaction.status,
        startTime: interaction.startTime.toISOString(),
        endTime: interaction.endTime?.toISOString() || null,
        duration: interaction.duration || null,
        error: interaction.error || null,
        metadata: JSON.stringify(interaction.metadata)
      });
    } catch (error) {
      console.error('Failed to store agent interaction:', error);
    }
  }

  protected async updateInteraction(interaction: AgentInteraction): Promise<void> {
    try {
      await runQuery(`
        MATCH (interaction:AgentInteraction {id: $id})
        SET interaction.output = $output,
            interaction.status = $status,
            interaction.endTime = $endTime,
            interaction.duration = $duration,
            interaction.error = $error,
            interaction.metadata = $metadata
      `, {
        id: interaction.id,
        output: interaction.output ? JSON.stringify(interaction.output) : null,
        status: interaction.status,
        endTime: interaction.endTime?.toISOString() || null,
        duration: interaction.duration || null,
        error: interaction.error || null,
        metadata: JSON.stringify(interaction.metadata)
      });
    } catch (error) {
      console.error('Failed to update agent interaction:', error);
    }
  }
}