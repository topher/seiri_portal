// Claude Agent Discovery Service
// Discovers and registers Claude agents in the unified agent system

import { exec } from 'child_process';
import { promisify } from 'util';
import { agentRegistry } from '../registry';
// import { agentMonitoringService } from '@/features/admin-observatory/services/agent-monitoring.service';
import { neo4jClient } from '@/lib/neo4j';
import { BaseAgent } from '../base-agent';

const execAsync = promisify(exec);

interface ClaudeProcessInfo {
  pid: number;
  command: string;
  workingDirectory: string;
  user: string;
}

interface ClaudeAgentDiscovery {
  agentId: string;
  name: string;
  processInfo?: ClaudeProcessInfo;
  templates: string[];
  connectionType: 'process' | 'pipe' | 'api' | 'file';
  endpoint: string;
  capabilities: string[];
}

export class ClaudeDiscoveryService {
  name = 'claude-discovery';
  type = 'system' as const;
  
  private discoveredAgents = new Map<string, ClaudeAgentDiscovery>();
  private discoveryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startContinuousDiscovery();
  }

  private startContinuousDiscovery() {
    // Initial discovery
    this.discoverClaudeAgents().catch(console.error);
    
    // Schedule regular discovery scans
    this.discoveryInterval = setInterval(() => {
      this.discoverClaudeAgents().catch(console.error);
    }, 30000); // Every 30 seconds
  }

  public async discoverClaudeAgents(): Promise<ClaudeAgentDiscovery[]> {
    console.log('🔍 Starting Claude agent discovery...');
    
    try {
      const discoveries = await Promise.all([
        this.scanClaudeProcesses(),
        this.scanNamedPipes(),
        this.scanTemplateDirectories(),
        this.scanActiveConnections()
      ]);

      const allDiscoveries = discoveries.flat();
      
      // Register new agents
      for (const discovery of allDiscoveries) {
        if (!this.discoveredAgents.has(discovery.agentId)) {
          await this.registerClaudeAgent(discovery);
          this.discoveredAgents.set(discovery.agentId, discovery);
        } else {
          // Update existing agent status
          await this.updateAgentStatus(discovery);
        }
      }

      // Check for removed agents
      await this.checkForRemovedAgents(allDiscoveries);

      console.log(`✅ Claude discovery complete: ${allDiscoveries.length} agents found`);
      return allDiscoveries;

    } catch (error) {
      console.error('❌ Claude discovery failed:', error);
      return [];
    }
  }

  private async scanClaudeProcesses(): Promise<ClaudeAgentDiscovery[]> {
    try {
      const { stdout } = await execAsync(`
        ps aux | grep -E "(claude|Claude)" | grep -v grep | head -20
      `);

      const processes: ClaudeAgentDiscovery[] = [];
      const lines = stdout.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) continue;

        const user = parts[0];
        const pid = parseInt(parts[1]);
        const command = parts.slice(10).join(' ');

        // Get working directory
        let workingDirectory = 'unknown';
        try {
          if (process.platform === 'darwin') {
            const { stdout: cwd } = await execAsync(`lsof -p ${pid} | grep cwd | awk '{print $9}' | head -1`);
            workingDirectory = cwd.trim() || 'unknown';
          } else {
            workingDirectory = await execAsync(`readlink /proc/${pid}/cwd`).then(res => res.stdout.trim()).catch(() => 'unknown');
          }
        } catch {
          // Continue with unknown directory
        }

        const agentId = `claude-process-${pid}`;
        processes.push({
          agentId,
          name: `Claude Process ${pid}`,
          processInfo: { pid, command, workingDirectory, user },
          templates: [],
          connectionType: 'process',
          endpoint: `process://${pid}`,
          capabilities: ['code-generation', 'bash-execution', 'file-operations']
        });
      }

      return processes;
    } catch (error) {
      console.warn('Process scan failed:', error);
      return [];
    }
  }

  private async scanNamedPipes(): Promise<ClaudeAgentDiscovery[]> {
    try {
      const { stdout } = await execAsync(`
        find /tmp -name "*claude*" -type p 2>/dev/null | head -10
      `);

      const pipes: ClaudeAgentDiscovery[] = [];
      const pipePaths = stdout.trim().split('\n').filter(path => path.trim());

      for (const pipePath of pipePaths) {
        // Test if pipe is active
        let isActive = false;
        try {
          await execAsync(`timeout 1 cat "${pipePath}" &>/dev/null`);
          isActive = true;
        } catch {
          // Pipe not active or accessible
        }

        if (isActive) {
          const agentId = `claude-pipe-${Buffer.from(pipePath).toString('base64').slice(0, 8)}`;
          pipes.push({
            agentId,
            name: `Claude Pipe ${pipePath.split('/').pop()}`,
            templates: [],
            connectionType: 'pipe',
            endpoint: pipePath,
            capabilities: ['ipc-communication', 'real-time-responses']
          });
        }
      }

      return pipes;
    } catch (error) {
      console.warn('Named pipe scan failed:', error);
      return [];
    }
  }

  private async scanTemplateDirectories(): Promise<ClaudeAgentDiscovery[]> {
    try {
      const { stdout } = await execAsync(`
        find . -name "*.claude" -type d -o -name "*commands*.md" | head -20
      `);

      const templates: ClaudeAgentDiscovery[] = [];
      const paths = stdout.trim().split('\n').filter(path => path.trim());

      for (const path of paths) {
        let templateFiles: string[] = [];
        
        if (path.endsWith('.claude')) {
          // Template directory
          try {
            const { stdout: templateList } = await execAsync(`ls "${path}/commands/"*.md 2>/dev/null || echo ""`);
            templateFiles = templateList.trim().split('\n').filter(f => f.trim());
          } catch {
            // No templates found
          }
        } else if (path.endsWith('.md')) {
          // Individual template file
          templateFiles = [path];
        }

        if (templateFiles.length > 0) {
          const agentId = `claude-template-${Buffer.from(path).toString('base64').slice(0, 8)}`;
          templates.push({
            agentId,
            name: `Claude Template ${path.split('/').pop()}`,
            templates: templateFiles,
            connectionType: 'file',
            endpoint: path,
            capabilities: ['template-execution', 'structured-commands', 'domain-expertise']
          });
        }
      }

      return templates;
    } catch (error) {
      console.warn('Template scan failed:', error);
      return [];
    }
  }

  private async scanActiveConnections(): Promise<ClaudeAgentDiscovery[]> {
    try {
      const { stdout } = await execAsync(`
        netstat -an 2>/dev/null | grep -E ":(4000|8080|8081|3000)" | grep ESTABLISHED | head -10
      `);

      const connections: ClaudeAgentDiscovery[] = [];
      const lines = stdout.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        const match = line.match(/:(\d+)/);
        if (match) {
          const port = match[1];
          const agentId = `claude-api-${port}`;
          connections.push({
            agentId,
            name: `Claude API ${port}`,
            templates: [],
            connectionType: 'api',
            endpoint: `http://localhost:${port}`,
            capabilities: ['api-access', 'real-time-communication', 'http-protocol']
          });
        }
      }

      return connections;
    } catch (error) {
      console.warn('Connection scan failed:', error);
      return [];
    }
  }

  private async registerClaudeAgent(discovery: ClaudeAgentDiscovery): Promise<void> {
    console.log(`📝 Registering Claude agent: ${discovery.name}`);

    // Create agent in Neo4j
    const session = neo4jClient.getSession();
    try {
      await session.run(`
        MERGE (a:Agent {agentId: $agentId})
        SET a += {
          name: $name,
          agentType: 'claude-cli',
          discoveryMethod: 'auto-scan',
          discoveredAt: datetime(),
          discoveredBy: 'ClaudeDiscoveryService',
          claudeProperties: {
            processId: $processId,
            workingDirectory: $workingDirectory,
            commandTemplates: $templates,
            connectionType: $connectionType,
            endpoint: $endpoint
          },
          status: {
            state: 'active',
            lastSeen: datetime(),
            health: {
              responsiveness: 100
            }
          },
          capabilities: {
            canExecuteBash: true,
            canGenerateCode: true,
            canQueryGraphQL: false,
            supportedLanguages: ['markdown', 'bash', 'typescript', 'python'],
            domainExpertise: $capabilities
          }
        }
        
        // Create discovery relationship
        MERGE (d:DiscoveryAgent {name: 'ClaudeDiscoveryService'})
        MERGE (a)-[:DISCOVERED_BY {timestamp: datetime()}]->(d)
        
        RETURN a.agentId as registeredAgent
      `, {
        agentId: discovery.agentId,
        name: discovery.name,
        processId: discovery.processInfo?.pid || null,
        workingDirectory: discovery.processInfo?.workingDirectory || 'unknown',
        templates: discovery.templates,
        connectionType: discovery.connectionType,
        endpoint: discovery.endpoint,
        capabilities: discovery.capabilities
      });

      // Register with agent monitoring service
      // agentMonitoringService.registerExternalAgent({
      //   id: discovery.agentId,
      //   name: discovery.name,
      //   type: 'claude-cli',
      //   status: 'AVAILABLE',
      //   performance: {
      //     currentLoad: 0,
      //     averageResponseTime: 100,
      //     successRate: 100,
      //     tasksCompleted: 0,
      //     errors: 0,
      //     uptime: 0
      //   },
      //   health: {
      //     status: 'healthy',
      //     lastCheck: new Date(),
      //     issues: []
      //   },
      //   interactions: {
      //     total: 0,
      //     recent: [],
      //     averageDuration: 100
      //   },
      //   lastUpdate: new Date()
      // });

      console.log(`✅ Registered: ${discovery.name} (${discovery.agentId})`);

    } finally {
      await session.close();
    }
  }

  private async updateAgentStatus(discovery: ClaudeAgentDiscovery): Promise<void> {
    // Update last seen timestamp
    const session = neo4jClient.getSession();
    try {
      await session.run(`
        MATCH (a:Agent {agentId: $agentId})
        SET a.status.lastSeen = datetime(),
            a.status.state = 'active'
        RETURN a.name as updated
      `, { agentId: discovery.agentId });

      // Update monitoring service
      // agentMonitoringService.updateAgentStatus(discovery.agentId, 'AVAILABLE');

    } finally {
      await session.close();
    }
  }

  private async checkForRemovedAgents(currentDiscoveries: ClaudeAgentDiscovery[]): Promise<void> {
    const currentIds = new Set(currentDiscoveries.map(d => d.agentId));
    
    // Mark missing agents as offline
    for (const [agentId, discovery] of Array.from(this.discoveredAgents.entries())) {
      if (!currentIds.has(agentId)) {
        console.log(`📴 Agent went offline: ${discovery.name}`);
        
        const session = neo4jClient.getSession();
        try {
          await session.run(`
            MATCH (a:Agent {agentId: $agentId})
            SET a.status.state = 'disconnected',
                a.status.lastSeen = datetime()
          `, { agentId });

          // agentMonitoringService.updateAgentStatus(agentId, 'OFFLINE');

        } finally {
          await session.close();
        }
        
        this.discoveredAgents.delete(agentId);
      }
    }
  }

  public async getDiscoveredAgents(): Promise<ClaudeAgentDiscovery[]> {
    return Array.from(this.discoveredAgents.values());
  }

  public stop(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }
}

// Export singleton instance
export const claudeDiscoveryService = new ClaudeDiscoveryService();