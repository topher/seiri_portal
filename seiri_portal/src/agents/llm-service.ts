import "server-only";

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// LLM Provider types
export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface StructuredGenerationConfig {
  prompt: string;
  schema?: any;
  examples?: any[];
  temperature?: number;
  maxTokens?: number;
}

// Default configurations for different providers
const DEFAULT_CONFIGS: Record<LLMProvider, LLMConfig> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 30000
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 30000
  }
};

export class LLMService {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private defaultProvider: LLMProvider;

  constructor(defaultProvider: LLMProvider = 'openai') {
    this.defaultProvider = defaultProvider;
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Anthropic client if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }

    // Validate that at least one client is available
    if (!this.openaiClient && !this.anthropicClient) {
      console.warn('No LLM API keys configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to environment variables.');
    }
  }

  /**
   * Generate a response using the configured LLM
   */
  async generate(
    prompt: string,
    config: Partial<LLMConfig> = {}
  ): Promise<LLMResponse> {
    const finalConfig = { ...DEFAULT_CONFIGS[this.defaultProvider], ...config };
    
    // Ensure we have a client for the requested provider
    this.validateProvider(finalConfig.provider);

    switch (finalConfig.provider) {
      case 'openai':
        return this.generateWithOpenAI(prompt, finalConfig);
      case 'anthropic':
        return this.generateWithAnthropic(prompt, finalConfig);
      default:
        throw new Error(`Unsupported LLM provider: ${finalConfig.provider}`);
    }
  }

  /**
   * Generate with conversation context (multiple messages)
   */
  async generateWithMessages(
    messages: LLMMessage[],
    config: Partial<LLMConfig> = {}
  ): Promise<LLMResponse> {
    const finalConfig = { ...DEFAULT_CONFIGS[this.defaultProvider], ...config };
    
    this.validateProvider(finalConfig.provider);

    switch (finalConfig.provider) {
      case 'openai':
        return this.generateWithOpenAIMessages(messages, finalConfig);
      case 'anthropic':
        return this.generateWithAnthropicMessages(messages, finalConfig);
      default:
        throw new Error(`Unsupported LLM provider: ${finalConfig.provider}`);
    }
  }

  /**
   * Generate structured output (useful for agents returning specific formats)
   */
  async generateStructured<T>(
    config: StructuredGenerationConfig & { provider?: LLMProvider }
  ): Promise<T> {
    const provider = config.provider || this.defaultProvider;
    
    // Build prompt with schema and examples
    let fullPrompt = config.prompt;
    
    if (config.schema) {
      fullPrompt += `\n\nReturn your response in the following JSON format:\n${JSON.stringify(config.schema, null, 2)}`;
    }
    
    if (config.examples && config.examples.length > 0) {
      fullPrompt += `\n\nExamples:\n${config.examples.map(ex => JSON.stringify(ex, null, 2)).join('\n\n')}`;
    }
    
    fullPrompt += '\n\nReturn only valid JSON without any markdown formatting or additional text.';

    const response = await this.generate(fullPrompt, {
      provider,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });

    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      throw new Error(`Failed to parse structured response: ${error}. Raw response: ${response.content}`);
    }
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(provider: LLMProvider): string[] {
    switch (provider) {
      case 'openai':
        return [
          'gpt-4o',
          'gpt-4o-mini', 
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo'
        ];
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      default:
        return [];
    }
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: LLMProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!this.openaiClient;
      case 'anthropic':
        return !!this.anthropicClient;
      default:
        return false;
    }
  }

  /**
   * Get provider status and health
   */
  async getProviderStatus(): Promise<Record<LLMProvider, { available: boolean; models: string[] }>> {
    return {
      openai: {
        available: this.isProviderAvailable('openai'),
        models: this.getAvailableModels('openai')
      },
      anthropic: {
        available: this.isProviderAvailable('anthropic'),
        models: this.getAvailableModels('anthropic')
      }
    };
  }

  // Private implementation methods
  private validateProvider(provider: LLMProvider): void {
    if (!this.isProviderAvailable(provider)) {
      throw new Error(`LLM provider '${provider}' is not available. Check your API key configuration.`);
    }
  }

  private async generateWithOpenAI(prompt: string, config: LLMConfig): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: choice.message.content,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        finishReason: choice.finish_reason || 'unknown'
      };
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error}`);
    }
  }

  private async generateWithOpenAIMessages(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: choice.message.content,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        finishReason: choice.finish_reason || 'unknown'
      };
    } catch (error) {
      throw new Error(`OpenAI generation failed: ${error}`);
    }
  }

  private async generateWithAnthropic(prompt: string, config: LLMConfig): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const response = await this.anthropicClient.messages.create({
        model: config.model,
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected Anthropic response type');
      }

      return {
        content: content.text,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        finishReason: response.stop_reason || 'unknown'
      };
    } catch (error) {
      throw new Error(`Anthropic generation failed: ${error}`);
    }
  }

  private async generateWithAnthropicMessages(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      // Anthropic requires system messages to be separate
      const systemMessages = messages.filter(msg => msg.role === 'system');
      const conversationMessages = messages.filter(msg => msg.role !== 'system');
      
      const systemPrompt = systemMessages.map(msg => msg.content).join('\n');

      const response = await this.anthropicClient.messages.create({
        model: config.model,
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature,
        system: systemPrompt || undefined,
        messages: conversationMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected Anthropic response type');
      }

      return {
        content: content.text,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        finishReason: response.stop_reason || 'unknown'
      };
    } catch (error) {
      throw new Error(`Anthropic generation failed: ${error}`);
    }
  }
}

// Singleton instance
export const llmService = new LLMService();