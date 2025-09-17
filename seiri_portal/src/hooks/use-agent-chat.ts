"use client";

import { useCallback, useEffect, useState } from 'react';
// Temporarily disabled Apollo Client - need to configure properly
// import { useMutation, useQuery } from '@/lib/apollo';
// import { gql } from '@/lib/apollo';
import { useChatStore, ChatMessage, ChatAttachment } from '@/hooks/use-chat-state';
import { useAgentBase } from '@/hooks/agents';
// Apollo mutations temporarily disabled
// import { 
//   GENERATE_WORKSPACE_INSIGHTS,
//   OPTIMIZE_WORKSPACE,
//   GENERATE_WORKSPACE_STRATEGY,
//   PERFORM_WORKSPACE_HEALTH_CHECK,
//   GENERATE_TASK_BREAKDOWN,
//   ESTIMATE_TASK_EFFORT,
//   OPTIMIZE_TASK,
//   ANALYZE_TASK_DEPENDENCIES,
//   TRACK_TASK_PROGRESS,
//   AUTO_GENERATE_SUBTASKS
// } from '@/lib/apollo/mutations';

// GraphQL queries for agent chat - temporarily disabled
// const DISCOVER_AGENTS_FOR_CONTEXT = gql`...`;
// const GET_AGENT_INTERACTION_HISTORY = gql`...`;

// Agent interfaces
interface Agent {
  name: string;
  type: string;
  displayName?: string;
  description?: string;
  capabilities?: string[];
  isAvailable?: boolean;
}

interface AgentResponseMetadata {
  tokenCount?: number;
  duration?: number;
  cached?: boolean;
  confidence?: number;
}

interface AgentResponse {
  success: boolean;
  response?: string;
  error?: string;
  operationId?: string;
  metadata?: AgentResponseMetadata;
}

// Hook options interface
interface UseAgentChatOptions {
  contextNodeId?: string;
  contextNodeType?: string;
  contextNodeName?: string;
  autoDiscoverAgents?: boolean;
  enableRealtime?: boolean;
  maxHistorySize?: number;
}

// Return type interface
interface UseAgentChatReturn {
  // Chat state
  isOpen: boolean;
  currentConversation: any; // TODO: Define proper conversation type
  messages: ChatMessage[];
  isTyping: boolean;
  
  // Input state
  inputValue: string;
  attachments: ChatAttachment[];
  
  // Agent state
  availableAgents: Agent[];
  selectedAgent: Agent | null;
  
  // Actions
  sendMessage: (message: string, attachments?: ChatAttachment[]) => Promise<void>;
  sendQuickAction: (actionType: string, params?: Record<string, unknown>) => Promise<void>;
  toggleSidebar: () => void;
  selectAgent: (agentName: string) => void;
  
  // Input actions
  setInputValue: (value: string) => void;
  addAttachment: (attachment: ChatAttachment) => void;
  removeAttachment: (id: string) => void;
  clearInput: () => void;
  
  // Conversation actions
  createNewConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  
  // Loading states
  loading: {
    sendingMessage: boolean;
    discoveringAgents: boolean;
    loadingHistory: boolean;
  };
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const {
    contextNodeId,
    contextNodeType,
    contextNodeName,
    autoDiscoverAgents = true,
    enableRealtime = true,
    maxHistorySize = 100
  } = options;

  // Store selectors
  const {
    isOpen,
    currentConversationId,
    conversations,
    isTyping,
    inputValue,
    attachments,
    availableAgents,
    selectedAgentName,
    toggleSidebar,
    selectAgent: storeSelectAgent,
    setInputValue,
    addAttachment,
    removeAttachment,
    clearInput,
    clearAttachments,
    setCurrentContext,
    getOrCreateConversationForContext,
    addMessage,
    updateMessage,
    setTyping,
    setAvailableAgents,
    switchConversation,
    deleteConversation: storeDeleteConversation,
    createConversation
  } = useChatStore();

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    sendingMessage: false,
    discoveringAgents: false,
    loadingHistory: false
  });

  // Current conversation
  const currentConversation = currentConversationId ? conversations[currentConversationId] : undefined;
  const messages = currentConversation?.messages || [];

  // GraphQL mutations for different agent operations - temporarily mocked
  const generateWorkspaceInsights = async (args: any) => ({ data: { generateWorkspaceInsights: { success: true } } });
  const optimizeWorkspace = async (args: any) => ({ data: { optimizeWorkspace: { success: true } } });
  const generateWorkspaceStrategy = async (args: any) => ({ data: { generateWorkspaceStrategy: { success: true } } });
  const performWorkspaceHealthCheck = async (args: any) => ({ data: { performWorkspaceHealthCheck: { success: true } } });
  const generateTaskBreakdown = async (args: any) => ({ data: { generateTaskBreakdown: { success: true } } });
  const estimateTaskEffort = async (args: any) => ({ data: { estimateTaskEffort: { success: true } } });
  const optimizeTask = async (args: any) => ({ data: { optimizeTask: { success: true } } });
  const analyzeTaskDependencies = async (args: any) => ({ data: { analyzeTaskDependencies: { success: true } } });
  const trackTaskProgress = async (args: any) => ({ data: { trackTaskProgress: { success: true } } });
  const autoGenerateSubtasks = async (args: any) => ({ data: { autoGenerateSubtasks: { success: true } } });

  // Agent discovery query - temporarily mocked
  const agentDiscoveryData = null;
  const discoveryLoading = false;

  // Set context when props change
  useEffect(() => {
    if (contextNodeId && contextNodeType) {
      setCurrentContext(contextNodeId, contextNodeType, contextNodeName);
      
      // Create or switch to conversation for this context
      const conversationId = getOrCreateConversationForContext(
        contextNodeId, 
        contextNodeType, 
        contextNodeName
      );
      switchConversation(conversationId);
    }
  }, [contextNodeId, contextNodeType, contextNodeName, setCurrentContext, getOrCreateConversationForContext, switchConversation]);

  // Update loading states
  useEffect(() => {
    setLoadingStates(prev => ({
      ...prev,
      discoveringAgents: discoveryLoading
    }));
  }, [discoveryLoading]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  // Main message sending function
  const sendMessage = useCallback(async (message: string, messageAttachments?: ChatAttachment[]) => {
    if (!message.trim() || !currentConversationId) return;

    setLoadingStates(prev => ({ ...prev, sendingMessage: true }));
    setError(null);

    try {
      // Add user message
      addMessage(currentConversationId, {
        role: 'user',
        content: message,
        attachments: messageAttachments || attachments
      });

      // Clear input
      clearInput();
      clearAttachments();

      // Set typing indicator
      setTyping(true, selectedAgentName);

      // Determine which agent operation to use based on message content and context
      const operationType = determineOperationType(message, contextNodeType, selectedAgentName);
      
      let response: any; // TODO: Type GraphQL response properly
      let agentResponse: AgentResponse;

      // Execute appropriate agent operation
      switch (operationType) {
        case 'workspace_insights':
          response = await generateWorkspaceInsights({
            variables: { workspaceId: contextNodeId }
          });
          agentResponse = response.data?.generateWorkspaceInsights;
          break;
          
        case 'workspace_optimization':
          response = await optimizeWorkspace({
            variables: { workspaceId: contextNodeId }
          });
          agentResponse = response.data?.optimizeWorkspace;
          break;
          
        case 'workspace_strategy':
          // Parse strategy input from message if present
          const strategyInput = parseStrategyInput(message);
          response = await generateWorkspaceStrategy({
            variables: { 
              workspaceId: contextNodeId,
              input: strategyInput
            }
          });
          agentResponse = response.data?.generateWorkspaceStrategy;
          break;
          
        case 'workspace_health':
          response = await performWorkspaceHealthCheck({
            variables: { workspaceId: contextNodeId }
          });
          agentResponse = response.data?.performWorkspaceHealthCheck;
          break;
          
        case 'task_breakdown':
          response = await generateTaskBreakdown({
            variables: { taskId: contextNodeId }
          });
          agentResponse = response.data?.generateTaskBreakdown;
          break;
          
        case 'task_estimation':
          response = await estimateTaskEffort({
            variables: { taskId: contextNodeId }
          });
          agentResponse = response.data?.estimateTaskEffort;
          break;
          
        case 'task_optimization':
          response = await optimizeTask({
            variables: { taskId: contextNodeId }
          });
          agentResponse = response.data?.optimizeTask;
          break;
          
        case 'task_dependencies':
          response = await analyzeTaskDependencies({
            variables: { taskId: contextNodeId }
          });
          agentResponse = response.data?.analyzeTaskDependencies;
          break;
          
        case 'task_subtasks':
          response = await autoGenerateSubtasks({
            variables: { taskId: contextNodeId }
          });
          agentResponse = response.data?.autoGenerateSubtasks;
          break;
          
        default:
          // Generic chat response (could implement a general chat mutation)
          agentResponse = {
            success: true,
            response: "I understand your message. How can I help you with this " + 
                     (contextNodeType?.toLowerCase() || 'item') + "?"
          };
      }

      // Stop typing indicator
      setTyping(false);

      // Add agent response
      if (agentResponse?.success) {
        const responseContent = formatAgentResponse(agentResponse, operationType);
        
        addMessage(currentConversationId, {
          role: 'assistant',
          content: responseContent,
          agentName: selectedAgentName,
          agentType: availableAgents.find(a => a.name === selectedAgentName)?.type,
          operationId: agentResponse.operationId,
          metadata: {
            tokenCount: agentResponse.metadata?.tokenCount,
            duration: agentResponse.metadata?.duration,
            cached: agentResponse.metadata?.cached,
            confidence: agentResponse.metadata?.confidence
          }
        });
      } else {
        // Add error message
        addMessage(currentConversationId, {
          role: 'assistant',
          content: "I apologize, but I encountered an error processing your request. " +
                  (agentResponse?.error || "Please try again."),
          error: agentResponse?.error || "Unknown error",
          agentName: selectedAgentName
        });
      }

    } catch (err) {
      setTyping(false);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // Add error message to chat
      addMessage(currentConversationId, {
        role: 'assistant',
        content: "I apologize, but I'm experiencing technical difficulties. Please try again later.",
        error: errorMessage,
        agentName: selectedAgentName
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, sendingMessage: false }));
    }
  }, [
    currentConversationId, attachments, selectedAgentName, contextNodeId, contextNodeType,
    addMessage, clearInput, clearAttachments, setTyping, availableAgents,
    generateWorkspaceInsights, optimizeWorkspace, generateWorkspaceStrategy,
    performWorkspaceHealthCheck, generateTaskBreakdown, estimateTaskEffort,
    optimizeTask, analyzeTaskDependencies, autoGenerateSubtasks
  ]);

  // Quick action sender
  const sendQuickAction = useCallback(async (actionType: string, params?: any) => {
    if (!currentConversationId) return;

    setLoadingStates(prev => ({ ...prev, sendingMessage: true }));
    
    try {
      // Add user message indicating the quick action
      addMessage(currentConversationId, {
        role: 'user',
        content: `Quick action: ${actionType}`,
      });

      // Execute the specific operation
      await sendMessage(`Execute ${actionType}`, []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Quick action failed';
      setError(errorMessage);
    } finally {
      setLoadingStates(prev => ({ ...prev, sendingMessage: false }));
    }
  }, [currentConversationId, addMessage, sendMessage]);

  // Other actions
  const selectAgent = useCallback((agentName: string) => {
    storeSelectAgent(agentName);
  }, [storeSelectAgent]);

  const createNewConversation = useCallback(() => {
    if (contextNodeId && contextNodeType) {
      const conversationId = createConversation(
        contextNodeId, 
        contextNodeType,
        `New ${contextNodeType} Chat`
      );
      switchConversation(conversationId);
    }
  }, [contextNodeId, contextNodeType, createConversation, switchConversation]);

  const deleteConversation = useCallback((id: string) => {
    storeDeleteConversation(id);
  }, [storeDeleteConversation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const selectedAgent: Agent | null = availableAgents.find(agent => agent.name === selectedAgentName) ?? null;

  return {
    // Chat state
    isOpen,
    currentConversation,
    messages,
    isTyping,
    
    // Input state
    inputValue,
    attachments,
    
    // Agent state
    availableAgents,
    selectedAgent,
    
    // Actions
    sendMessage,
    sendQuickAction,
    toggleSidebar,
    selectAgent,
    
    // Input actions
    setInputValue,
    addAttachment,
    removeAttachment,
    clearInput,
    
    // Conversation actions
    createNewConversation,
    switchConversation,
    deleteConversation,
    
    // Loading states
    loading: loadingStates,
    
    // Error handling
    error,
    clearError
  };
}

// Helper functions
function determineOperationType(message: string, contextNodeType?: string, agentName?: string): string {
  const messageLower = message.toLowerCase();
  
  // Context-based determination
  if (contextNodeType === 'WORKSPACE') {
    if (messageLower.includes('insight') || messageLower.includes('analyze')) return 'workspace_insights';
    if (messageLower.includes('optimize') || messageLower.includes('improve')) return 'workspace_optimization';
    if (messageLower.includes('strategy') || messageLower.includes('plan')) return 'workspace_strategy';
    if (messageLower.includes('health') || messageLower.includes('check')) return 'workspace_health';
  }
  
  if (contextNodeType === 'TASK') {
    if (messageLower.includes('breakdown') || messageLower.includes('break down')) return 'task_breakdown';
    if (messageLower.includes('estimate') || messageLower.includes('effort')) return 'task_estimation';
    if (messageLower.includes('optimize') || messageLower.includes('improve')) return 'task_optimization';
    if (messageLower.includes('dependencies') || messageLower.includes('depend')) return 'task_dependencies';
    if (messageLower.includes('subtask') || messageLower.includes('sub-task')) return 'task_subtasks';
  }
  
  // Agent-based determination
  if (agentName?.includes('workspace')) {
    return 'workspace_insights';
  }
  if (agentName?.includes('task')) {
    return 'task_breakdown';
  }
  
  return 'general_chat';
}

function parseStrategyInput(message: string): any {
  // Simple parsing - in production, you might want more sophisticated NLP
  return {
    goals: [],
    constraints: [],
    timeline: "3 months",
    resources: []
  };
}

function formatAgentResponse(response: any, operationType: string): string {
  // Format the response based on operation type
  switch (operationType) {
    case 'workspace_insights':
      return formatWorkspaceInsights(response.insights);
    case 'workspace_optimization':
      return formatWorkspaceOptimization(response.optimization);
    case 'task_breakdown':
      return formatTaskBreakdown(response.breakdown);
    default:
      return response.response || JSON.stringify(response, null, 2);
  }
}

function formatWorkspaceInsights(insights: any): string {
  if (!insights) return "No insights available.";
  
  let formatted = `## Workspace Insights\n\n`;
  formatted += `**Overall Health:** ${insights.overallHealth}\n\n`;
  
  if (insights.keyMetrics?.length > 0) {
    formatted += `### Key Metrics\n`;
    insights.keyMetrics.forEach((metric: any) => {
      formatted += `- **${metric.name}:** ${metric.value} (${metric.trend})\n`;
    });
    formatted += `\n`;
  }
  
  if (insights.recommendations?.length > 0) {
    formatted += `### Recommendations\n`;
    insights.recommendations.forEach((rec: any, index: number) => {
      formatted += `${index + 1}. **${rec.title}** (${rec.priority})\n`;
      formatted += `   ${rec.description}\n\n`;
    });
  }
  
  return formatted;
}

function formatWorkspaceOptimization(optimization: any): string {
  if (!optimization) return "No optimization suggestions available.";
  
  let formatted = `## Workspace Optimization\n\n`;
  
  if (optimization.quickWins?.length > 0) {
    formatted += `### Quick Wins\n`;
    optimization.quickWins.forEach((win: any, index: number) => {
      formatted += `${index + 1}. **${win.title}**\n`;
      formatted += `   ${win.description}\n`;
      formatted += `   *Impact: ${win.impact} | Effort: ${win.effort}*\n\n`;
    });
  }
  
  return formatted;
}

function formatTaskBreakdown(breakdown: any): string {
  if (!breakdown) return "No task breakdown available.";
  
  let formatted = `## Task Breakdown\n\n`;
  
  if (breakdown.subtasks?.length > 0) {
    formatted += `### Subtasks\n`;
    breakdown.subtasks.forEach((subtask: any, index: number) => {
      formatted += `${index + 1}. **${subtask.title}**\n`;
      formatted += `   ${subtask.description}\n`;
      if (subtask.estimatedHours) {
        formatted += `   *Estimated: ${subtask.estimatedHours} hours*\n`;
      }
      formatted += `\n`;
    });
  }
  
  return formatted;
}