const axios = require('axios');
const EventEmitter = require('events');

class AgentCoordinator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.taskAssignments = new Map();
    this.API_BASE = 'http://localhost:3001/api';
  }

  // Register agent with capabilities
  registerAgent(agentId, capabilities = ['any']) {
    this.agents.set(agentId, {
      id: agentId,
      capabilities,
      status: 'idle',
      currentTask: null
    });
    console.log(`Agent ${agentId} registered with capabilities: ${capabilities.join(', ')}`);
    this.assignWork(agentId);
  }

  // Auto-assign best task to agent
  async assignWork(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'idle') return;

    try {
      // Get all pending tasks
      const response = await axios.get(`${this.API_BASE}/queue/tasks`);
      const pendingTasks = response.data.filter(t => t.status === 'pending');
      
      // Find best match for agent capabilities
      let bestTask = null;
      
      // Priority 1: Vue compiler tasks
      if (agent.capabilities.includes('compiler')) {
        bestTask = pendingTasks.find(t => 
          t.title.toLowerCase().includes('compiler') || 
          t.id === 'TASK_50' || t.id === 'TASK_53'
        );
      }
      
      // Priority 2: Implementation tasks if compiler ready
      if (!bestTask && agent.capabilities.includes('implementation')) {
        bestTask = pendingTasks.find(t => 
          ['TASK_19', 'TASK_20', 'TASK_29', 'TASK_30'].includes(t.id.split('_')[0] + '_' + t.id.split('_')[1])
        );
      }
      
      // Priority 3: Any task
      if (!bestTask) {
        bestTask = pendingTasks[0];
      }
      
      if (bestTask) {
        await this.claimTask(agentId, bestTask.id);
      } else {
        console.log(`No tasks available for ${agentId}`);
      }
    } catch (error) {
      console.error(`Error assigning work to ${agentId}:`, error.message);
    }
  }

  // Claim task for agent
  async claimTask(agentId, taskId) {
    try {
      const response = await axios.post(`${this.API_BASE}/queue/claim`, {
        taskId,
        agentId
      });
      
      const agent = this.agents.get(agentId);
      agent.status = 'working';
      agent.currentTask = taskId;
      
      console.log(`Agent ${agentId} claimed task ${taskId}`);
      this.emit('taskClaimed', { agentId, taskId });
      
      return response.data;
    } catch (error) {
      console.error(`Failed to claim task ${taskId} for ${agentId}:`, error.message);
    }
  }

  // Complete task
  async completeTask(agentId, result) {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.currentTask) return;

    try {
      await axios.post(`${this.API_BASE}/queue/complete`, {
        taskId: agent.currentTask,
        result
      });
      
      console.log(`Agent ${agentId} completed task ${agent.currentTask}`);
      
      agent.status = 'idle';
      agent.currentTask = null;
      
      // Immediately assign new work
      this.assignWork(agentId);
    } catch (error) {
      console.error(`Failed to complete task:`, error.message);
    }
  }

  // Get status of all agents
  getStatus() {
    const status = {
      totalAgents: this.agents.size,
      idle: 0,
      working: 0,
      tasks: []
    };
    
    for (const [id, agent] of this.agents) {
      if (agent.status === 'idle') status.idle++;
      if (agent.status === 'working') status.working++;
      if (agent.currentTask) {
        status.tasks.push({ agent: id, task: agent.currentTask });
      }
    }
    
    return status;
  }
}

// Create singleton coordinator
const coordinator = new AgentCoordinator();

// Auto-spawn agents based on pending work
async function autoSpawnAgents() {
  const response = await axios.get(`${coordinator.API_BASE}/queue/stats`);
  const stats = response.data;
  
  // Spawn compiler agent if needed
  if (stats.pending > 0 && !coordinator.agents.has('COMPILER_AGENT')) {
    coordinator.registerAgent('COMPILER_AGENT', ['compiler', 'architect']);
  }
  
  // Spawn implementation agents
  const neededAgents = Math.min(stats.pending, 5);
  for (let i = 1; i <= neededAgents; i++) {
    const agentId = `IMPL_AGENT_${i}`;
    if (!coordinator.agents.has(agentId)) {
      coordinator.registerAgent(agentId, ['implementation', 'any']);
    }
  }
}

// Start coordinator
console.log('Agent Coordinator starting...');
autoSpawnAgents();
setInterval(autoSpawnAgents, 10000); // Check every 10 seconds

// Export for agent scripts
module.exports = coordinator;