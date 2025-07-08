const Anthropic = require('@anthropic-ai/sdk');

class AgentSpawner {
  constructor(apiKey) {
    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null;
    this.agents = new Map();
    this.specialties = {
      frontend: {
        systemPrompt: `You are a Frontend Specialist Agent for ADE. Your expertise:
- Vue.js, React, and modern UI frameworks
- Responsive design and accessibility
- User experience optimization
- APML UI component implementation
You receive tasks via APML and deliver working frontend code.`,
        model: 'claude-3-sonnet-20240229'
      },
      backend: {
        systemPrompt: `You are a Backend Specialist Agent for ADE. Your expertise:
- Node.js, Express, and API design
- Database architecture and optimization
- Security and authentication
- APML backend service implementation
You receive tasks via APML and deliver working backend code.`,
        model: 'claude-3-sonnet-20240229'
      },
      architect: {
        systemPrompt: `You are an Architecture Specialist Agent for ADE. Your expertise:
- System design and scalability
- Technology selection and integration
- Performance optimization
- APML architecture patterns
You receive tasks via APML and deliver system designs.`,
        model: 'claude-3-sonnet-20240229'
      },
      ai_specialist: {
        systemPrompt: `You are an AI Specialist Agent for ADE. Your expertise:
- LLM integration and prompt engineering
- Machine learning implementation
- AI feature development
- APML AI capability implementation
You receive tasks via APML and deliver AI-powered features.`,
        model: 'claude-3-sonnet-20240229'
      },
      tester: {
        systemPrompt: `You are a Testing Specialist Agent for ADE. Your expertise:
- Automated testing frameworks
- Quality assurance processes
- Performance testing
- APML test suite implementation
You receive tasks via APML and deliver comprehensive test coverage.`,
        model: 'claude-3-sonnet-20240229'
      }
    };
  }

  async spawnAgent(type, taskId, vfs) {
    if (!this.anthropic) {
      // Dev mode - return mock agent
      return this.createMockAgent(type, taskId, vfs);
    }

    const specialty = this.specialties[type];
    if (!specialty) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agentId = `${type}_${Date.now()}`;
    const agent = {
      id: agentId,
      type,
      taskId,
      status: 'active',
      created: new Date().toISOString()
    };

    this.agents.set(agentId, agent);

    // In production, this would create actual Claude instances
    // For now, we'll simulate the work
    this.simulateAgentWork(agent, specialty, vfs);

    return agent;
  }

  createMockAgent(type, taskId, vfs) {
    const agentId = `${type}_${Date.now()}_mock`;
    const agent = {
      id: agentId,
      type,
      taskId,
      status: 'active',
      mock: true,
      created: new Date().toISOString()
    };

    this.agents.set(agentId, agent);
    
    // Simulate work for dev mode
    setTimeout(() => {
      this.completeAgentTask(agent, vfs);
    }, 3000);

    return agent;
  }

  async simulateAgentWork(agent, specialty, vfs) {
    // Simulate the agent working on its task
    setTimeout(async () => {
      // Agent writes its deliverable to VFS
      const deliverable = {
        agentId: agent.id,
        type: agent.type,
        taskId: agent.taskId,
        status: 'completed',
        result: `Mock ${agent.type} deliverable for task ${agent.taskId}`,
        timestamp: new Date().toISOString()
      };

      await vfs.write(
        `agents/${agent.id}/deliverable.json`,
        deliverable,
        { agent: agent.id }
      );

      agent.status = 'completed';
    }, 5000);
  }

  async completeAgentTask(agent, vfs) {
    const mockDeliverables = {
      frontend: {
        components: ['AppHeader.vue', 'AppLayout.vue', 'ThinkPhase.vue'],
        code: 'Mock Vue.js components implementation'
      },
      backend: {
        endpoints: ['/api/projects', '/api/agents', '/api/apml'],
        code: 'Mock Express.js API implementation'
      },
      architect: {
        design: 'Microservices architecture with APML message bus',
        diagrams: ['system-overview.apml', 'data-flow.apml']
      }
    };

    const deliverable = {
      agentId: agent.id,
      type: agent.type,
      taskId: agent.taskId,
      status: 'completed',
      result: mockDeliverables[agent.type] || 'Generic deliverable',
      timestamp: new Date().toISOString()
    };

    await vfs.write(
      `agents/${agent.id}/deliverable.json`,
      deliverable,
      { agent: agent.id }
    );

    agent.status = 'completed';
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }
}

module.exports = AgentSpawner;