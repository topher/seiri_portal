# Seiri Platform - Complete Ecosystem

## 🎯 **Platform Overview**

The **Seiri Platform** is a unified ecosystem for AI-powered workspace management and distributed agent intelligence, designed to facilitate collaboration between teams and clients while providing powerful backend agent mesh capabilities.

## 🏗️ **Architecture Overview**

```
seiri_platform/                        # 🌟 Main platform directory
├── README.md                          # This file - Platform overview
├── docs/                              # 📚 Comprehensive system documentation
├── seiri_portal/                      # 🌐 Client collaboration and admin portal
└── agent-mesh/                        # 🤖 Distributed intelligence services
```

## 📂 **Project Structure**

### **🌐 Seiri Portal** (`seiri_portal/`)
**Next.js application with dual interfaces:**

#### **Client Collaboration** (`/dashboard`)
- **Purpose**: Jira-like collaboration platform between Seiri team and clients
- **Features**: Workspaces, tasks, initiatives, team member management
- **Users**: Seiri team + client teams working on shared projects
- **URL**: `http://localhost:3000/`

#### **Admin Portal** (`/admin`)
- **Purpose**: Internal agent mesh administration and monitoring
- **Features**: Agent management, service orchestration, system monitoring
- **Users**: Seiri team members with admin privileges
- **URL**: `http://localhost:3000/admin`

**Tech Stack**:
- Next.js 14.2+ with App Router
- TypeScript (strict mode)
- Tailwind CSS + Radix UI
- Clerk authentication
- Apollo Client for GraphQL

### **🤖 Agent Mesh** (`agent-mesh/`)
**Dockerized distributed intelligence platform:**

#### **Core Services**
- **GraphQL Gateway** (Port 4000): Unified API for admin portal
- **Agent Core**: Agent lifecycle, coordination, and execution
- **Service Orchestration**: YAML-driven workflows with human-loop controls
- **Vector Database**: Semantic search and embeddings (Weaviate)
- **Knowledge Graph**: Neo4j database for relationships and state
- **Monitoring**: Prometheus + Grafana for system monitoring

**Tech Stack**:
- Node.js + TypeScript for core services
- Python for service orchestration
- Neo4j for graph database
- Weaviate for vector search
- Redis for caching and pub/sub
- Docker Compose for orchestration

### **📚 Documentation** (`docs/`)
**Comprehensive system documentation from seiri_system_documents:**

- **Architecture Documentation**: Platform design and technical specifications
- **Business Context**: Business requirements and user journeys
- **Component Library**: Reusable patterns and components
- **Examples**: Real-world implementation examples
- **Workflow Executor**: Service orchestration patterns

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+
- Docker & Docker Compose
- Neo4j Desktop (optional, for local development)

### **Development Setup**

1. **Clone and Navigate**:
   ```bash
   git clone <repository>
   cd seiri_platform
   ```

2. **Start Seiri Portal**:
   ```bash
   cd seiri_portal
   npm install
   npm run dev                    # Port 3000
   ```

3. **Start Agent Mesh Services**:
   ```bash
   cd agent-mesh
   docker-compose up -d           # Port 4000
   ```

4. **Access Applications**:
   - **Client Collaboration**: `http://localhost:3000`
   - **Admin Portal**: `http://localhost:3000/admin`
   - **Agent Mesh GraphQL**: `http://localhost:4000/graphql`
   - **Neo4j Browser**: `http://localhost:7474`
   - **Monitoring Dashboard**: `http://localhost:3001`

### **Environment Configuration**

**Seiri Portal** (`.env`):
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Agent Mesh Integration
NEXT_PUBLIC_AGENT_MESH_SERVICE_URL=http://localhost:4000/graphql
AGENT_MESH_API_KEY=your-secret-api-key

# Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=seiristudio
```

**Agent Mesh** (`.env`):
```bash
# AI Services
OPENAI_API_KEY=your-openai-api-key

# Database Configuration
NEO4J_PASSWORD=seiristudio
REDIS_PASSWORD=

# Service Authentication
AGENT_MESH_SECRET=your-service-secret
```

## 🎯 **Use Cases & Workflows**

### **Client Collaboration Workflow**
1. **Project Setup**: Seiri team creates workspace for client project
2. **Collaboration**: Both teams add tasks, initiatives, and track progress
3. **Communication**: Shared visibility on project status and deliverables
4. **Delivery**: Collaborative completion of project milestones

### **Agent Mesh Administration Workflow**
1. **Agent Deployment**: Deploy and configure agents for specific tasks
2. **Service Orchestration**: Create YAML-driven workflows with human oversight
3. **Monitoring**: Track agent performance and system health
4. **Knowledge Management**: Maintain ontologies and semantic relationships

### **Integrated Development Workflow**
1. **Client Project**: Use portal for project management and collaboration
2. **Agent Support**: Deploy agents to assist with development tasks
3. **Continuous Improvement**: Monitor and optimize agent performance
4. **Knowledge Capture**: Build domain-specific knowledge graphs

## 🔧 **Development Commands**

### **Portal Development**
```bash
cd seiri_portal

# Development
npm run dev                      # Start development server
npm run build                    # Build for production
npm run typecheck               # TypeScript validation
npm run lint                    # Code linting

# Testing
npm run test                    # Run tests
python3 run-tests.py            # BDD tests

# Database
npm run db:start                # Start Neo4j
npm run db:reset                # Reset database
```

### **Agent Mesh Development**
```bash
cd agent-mesh

# Services
docker-compose up -d            # Start all services
docker-compose down             # Stop all services
docker-compose logs -f          # View logs

# Development
npm run dev:gateway             # Start GraphQL gateway
npm run dev:core                # Start agent core
npm run build                   # Build all services

# Management
npm run services:validate       # Validate service definitions
npm run vector:index           # Rebuild vector index
```

## 📊 **Architecture Benefits**

### **Unified Platform**
- **Single Ecosystem**: All components work together seamlessly
- **Shared Infrastructure**: Common database, authentication, and services
- **Consistent Experience**: Unified design and development patterns

### **Clean Separation**
- **Client Focus**: Portal dedicated to collaboration and project management
- **Technical Focus**: Agent mesh handles complex AI and automation tasks
- **Role-Based Access**: Different interfaces for different user types

### **Scalable Design**
- **Microservices**: Agent mesh components can scale independently
- **Docker Native**: Easy deployment and scaling with containers
- **API Driven**: GraphQL APIs enable flexible integrations

### **Developer Experience**
- **Type Safety**: Full TypeScript implementation across platform
- **Documentation**: Comprehensive docs for all components
- **Testing**: BDD-first development with comprehensive test coverage

## 🔒 **Security & Access Control**

### **Authentication**
- **Clerk Integration**: Secure authentication for portal users
- **Role-Based Access**: Admin-only access to agent mesh features
- **API Security**: Secure GraphQL endpoints with authentication

### **Data Privacy**
- **Project Isolation**: Client project data remains separate
- **Audit Logging**: Comprehensive logging for security and compliance
- **Encryption**: Secure communication between all services

## 📈 **Monitoring & Observability**

### **System Health**
- **Real-time Metrics**: Live dashboards for system performance
- **Alert Management**: Proactive alerting for system issues
- **Service Monitoring**: Health checks for all components

### **Performance Tracking**
- **Agent Metrics**: Track agent performance and efficiency
- **Service Analytics**: Monitor workflow execution and success rates
- **User Analytics**: Track portal usage and engagement

## 🔄 **Deployment Strategy**

### **Development**
- **Local Docker**: Complete local development environment
- **Hot Reload**: Fast development cycles with live reloading
- **Mock Services**: Isolated testing with mock dependencies

### **Production**
- **Container Orchestration**: Kubernetes deployment ready
- **Service Mesh**: Istio integration for advanced networking
- **Auto-scaling**: Dynamic scaling based on load
- **Zero-downtime Deployments**: Rolling updates with health checks

## 📚 **Documentation Structure**

The `docs/` directory contains comprehensive documentation migrated from `seiri_system_documents`:

- **`seiri_agent_architecture.md`**: Agent system architecture
- **`seiri_business_context.md`**: Business requirements and context
- **`seiri_component_library.md`**: Reusable component patterns
- **`seiri_ecosystem_design.md`**: Overall ecosystem design
- **`seiri_tech_stack.md`**: Technology stack documentation
- **`seiri_user_journey.md`**: User experience and workflows
- **`examples/`**: Real-world implementation examples
- **`prompts/`**: Template prompts for development
- **`workflow_executor/`**: Service orchestration patterns

## 🤝 **Contributing**

### **Development Guidelines**
1. Follow TypeScript strict mode requirements
2. Use BDD-first development approach
3. Maintain comprehensive test coverage
4. Update documentation with changes
5. Follow established code review process

### **Project Structure Guidelines**
- **Portal Changes**: Work in `seiri_portal/` directory
- **Agent Changes**: Work in `agent-mesh/` directory
- **Documentation**: Update relevant docs in `docs/` directory
- **Cross-cutting**: Consider impact on both portal and agent mesh

---

**Welcome to the Seiri Platform - where intelligent collaboration meets distributed AI capabilities!** 🚀