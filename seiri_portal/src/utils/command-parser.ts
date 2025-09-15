/**
 * Command Parser - Natural Language Processing for Command Palette
 * Converts natural language commands into structured actions
 */

export interface ParsedCommand {
  action: CommandAction;
  entity?: EntityType;
  entityId?: string;
  entityName?: string;
  agentOperation?: string;
  confidence: number;
  parameters?: Record<string, any>;
  suggestions?: string[];
}

export type CommandAction = 
  | 'navigate' 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'analyze' 
  | 'optimize' 
  | 'generate' 
  | 'search'
  | 'ai_assist'
  | 'ai_chat'
  | 'ai_suggest';

export type EntityType = 
  | 'workspace' 
  | 'suite' 
  | 'initiative' 
  | 'task' 
  | 'user' 
  | 'team';

export interface CommandContext {
  currentWorkspaceId?: string;
  currentSuiteId?: string;
  currentInitiativeId?: string;
  currentTaskId?: string;
  userRole?: string;
  recentEntities: Array<{
    id: string;
    name: string;
    type: EntityType;
  }>;
}

export class CommandParser {
  private actionPatterns: Map<CommandAction, RegExp[]> = new Map();
  private entityPatterns: Map<EntityType, RegExp[]> = new Map();
  private agentPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    // Action patterns
    this.actionPatterns.set('navigate', [
      /^(go to|open|navigate to|show me|view)\s+(.+)$/i,
      /^(find|search for)\s+(.+)$/i
    ]);

    this.actionPatterns.set('create', [
      /^(create|add|new)\s+(workspace|suite|initiative|task)\s*(.*)$/i,
      /^(make a|start a)\s+(new\s+)?(workspace|suite|initiative|task)\s*(.*)$/i
    ]);

    this.actionPatterns.set('edit', [
      /^(edit|update|modify|change)\s+(.+)$/i,
      /^(rename)\s+(.+)\s+to\s+(.+)$/i
    ]);

    this.actionPatterns.set('delete', [
      /^(delete|remove|trash)\s+(.+)$/i,
      /^(get rid of)\s+(.+)$/i
    ]);

    this.actionPatterns.set('ai_assist', [
      /^(ai|assistant|help)\s+(analyze|review|optimize|improve)\s+(.+)$/i,
      /^(ask ai|ai help)\s+(.+)$/i,
      /^(analyze|optimize|improve|review)\s+(.+)$/i
    ]);

    this.actionPatterns.set('ai_chat', [
      /^(chat|talk)\s+(.+)$/i,
      /^(ask|question)\s+(.+)$/i,
      /^(help me with|assist with)\s+(.+)$/i
    ]);

    this.actionPatterns.set('generate', [
      /^(generate|create automatically)\s+(.+)$/i,
      /^(auto generate|auto create)\s+(.+)$/i
    ]);

    // Entity patterns
    this.entityPatterns.set('workspace', [
      /\b(workspace|work space)\b/i
    ]);

    this.entityPatterns.set('suite', [
      /\b(suite|project)\b/i
    ]);

    this.entityPatterns.set('initiative', [
      /\b(initiative|epic|feature)\b/i
    ]);

    this.entityPatterns.set('task', [
      /\b(task|todo|item|issue|ticket)\b/i
    ]);

    // Agent operation patterns
    this.agentPatterns.set('insights', [
      /\b(insights?|analysis|analytics|overview)\b/i
    ]);

    this.agentPatterns.set('optimization', [
      /\b(optimi[sz]e|improve|enhance|refactor)\b/i
    ]);

    this.agentPatterns.set('breakdown', [
      /\b(break down|breakdown|split|divide)\b/i
    ]);

    this.agentPatterns.set('estimation', [
      /\b(estimate|effort|time|duration)\b/i
    ]);

    this.agentPatterns.set('strategy', [
      /\b(strategy|plan|roadmap|approach)\b/i
    ]);

    this.agentPatterns.set('dependencies', [
      /\b(dependencies|blockers|relationships)\b/i
    ]);
  }

  /**
   * Parse natural language command into structured format
   */
  public parseCommand(input: string, context: CommandContext): ParsedCommand {
    const normalizedInput = input.trim();
    
    // Try exact matches first for common commands
    const exactMatch = this.checkExactMatches(normalizedInput);
    if (exactMatch) {
      return exactMatch;
    }

    // Parse using patterns
    const action = this.extractAction(normalizedInput);
    const entity = this.extractEntity(normalizedInput);
    const agentOperation = this.extractAgentOperation(normalizedInput);
    
    // Extract entity reference from context or input
    const entityRef = this.extractEntityReference(normalizedInput, context);
    
    // Calculate confidence based on pattern matches
    const confidence = this.calculateConfidence(normalizedInput, action, entity);
    
    // Generate suggestions for ambiguous commands
    const suggestions = this.generateSuggestions(normalizedInput, context);

    return {
      action,
      entity,
      entityId: entityRef?.id,
      entityName: entityRef?.name,
      agentOperation,
      confidence,
      parameters: this.extractParameters(normalizedInput),
      suggestions: confidence < 0.7 ? suggestions : undefined
    };
  }

  /**
   * Check for exact command matches
   */
  private checkExactMatches(input: string): ParsedCommand | null {
    const exactCommands: Record<string, ParsedCommand> = {
      'new task': {
        action: 'create',
        entity: 'task',
        confidence: 1.0
      },
      'new initiative': {
        action: 'create',
        entity: 'initiative',
        confidence: 1.0
      },
      'new suite': {
        action: 'create',
        entity: 'suite',
        confidence: 1.0
      },
      'ai chat': {
        action: 'ai_chat',
        confidence: 1.0
      },
      'help': {
        action: 'ai_chat',
        confidence: 0.9
      }
    };

    return exactCommands[input.toLowerCase()] || null;
  }

  /**
   * Extract action from command
   */
  private extractAction(input: string): CommandAction {
    for (const [action, patterns] of Array.from(this.actionPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return action;
        }
      }
    }
    
    // Default to search if no specific action found
    return 'search';
  }

  /**
   * Extract entity type from command
   */
  private extractEntity(input: string): EntityType | undefined {
    for (const [entity, patterns] of Array.from(this.entityPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return entity;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract agent operation from command
   */
  private extractAgentOperation(input: string): string | undefined {
    for (const [operation, patterns] of Array.from(this.agentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return operation;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract entity reference from context
   */
  private extractEntityReference(input: string, context: CommandContext): {id: string, name: string} | undefined {
    // Look for entity names in recent context
    for (const entity of context.recentEntities) {
      if (input.toLowerCase().includes(entity.name.toLowerCase())) {
        return { id: entity.id, name: entity.name };
      }
    }

    // Check for contextual references like "this task", "current suite"
    if (/\b(this|current)\s+(task|initiative|suite|workspace)\b/i.test(input)) {
      if (input.includes('task') && context.currentTaskId) {
        return { id: context.currentTaskId, name: 'Current Task' };
      }
      if (input.includes('initiative') && context.currentInitiativeId) {
        return { id: context.currentInitiativeId, name: 'Current Initiative' };
      }
      if (input.includes('suite') && context.currentSuiteId) {
        return { id: context.currentSuiteId, name: 'Current Suite' };
      }
      if (input.includes('workspace') && context.currentWorkspaceId) {
        return { id: context.currentWorkspaceId, name: 'Current Workspace' };
      }
    }

    return undefined;
  }

  /**
   * Extract parameters from command
   */
  private extractParameters(input: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract quoted strings as names/titles
    const quotedMatches = input.match(/"([^"]+)"/g);
    if (quotedMatches) {
      params.title = quotedMatches[0].replace(/"/g, '');
    }

    // Extract priority indicators
    if (/\b(high|urgent|critical)\s+priority\b/i.test(input)) {
      params.priority = 'high';
    } else if (/\b(low|minor)\s+priority\b/i.test(input)) {
      params.priority = 'low';
    }

    // Extract assignee information
    const assigneeMatch = input.match(/\bassign(?:ed)?\s+to\s+([^\s,]+)/i);
    if (assigneeMatch) {
      params.assignee = assigneeMatch[1];
    }

    return params;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(input: string, action: CommandAction, entity?: EntityType): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for clear action matches
    if (action !== 'search') {
      confidence += 0.3;
    }

    // Boost confidence for entity matches
    if (entity) {
      confidence += 0.2;
    }

    // Boost confidence for common command patterns
    if (input.length > 2 && input.split(' ').length >= 2) {
      confidence += 0.1;
    }

    // Penalize very short or very long commands
    if (input.length < 3) {
      confidence -= 0.3;
    } else if (input.length > 100) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate command suggestions
   */
  private generateSuggestions(input: string, context: CommandContext): string[] {
    const suggestions: string[] = [];
    
    // Add common command variations
    if (input.toLowerCase().includes('task')) {
      suggestions.push('create new task');
      suggestions.push('analyze task dependencies');
      suggestions.push('optimize task breakdown');
    }

    if (input.toLowerCase().includes('workspace')) {
      suggestions.push('generate workspace insights');
      suggestions.push('optimize workspace');
      suggestions.push('workspace health check');
    }

    // Add AI-related suggestions
    if (input.toLowerCase().includes('ai') || input.toLowerCase().includes('help')) {
      suggestions.push('ai chat about current project');
      suggestions.push('ask ai to analyze this workspace');
      suggestions.push('get ai suggestions for optimization');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Get command suggestions based on context
   */
  public getContextualSuggestions(context: CommandContext): string[] {
    const suggestions: string[] = [];

    // Add suggestions based on current context
    if (context.currentTaskId) {
      suggestions.push('optimize this task');
      suggestions.push('analyze task dependencies');
      suggestions.push('estimate task effort');
    }

    if (context.currentInitiativeId) {
      suggestions.push('generate initiative strategy');
      suggestions.push('track initiative progress');
      suggestions.push('optimize initiative timeline');
    }

    if (context.currentSuiteId) {
      suggestions.push('analyze suite performance');
      suggestions.push('optimize suite resources');
      suggestions.push('generate suite insights');
    }

    if (context.currentWorkspaceId) {
      suggestions.push('workspace health check');
      suggestions.push('generate workspace insights');
      suggestions.push('optimize workspace');
    }

    // Add general AI suggestions
    suggestions.push('ai chat');
    suggestions.push('ask ai for help');
    suggestions.push('new task');
    suggestions.push('new initiative');

    return suggestions.slice(0, 8);
  }
}

// Export singleton instance
export const commandParser = new CommandParser();