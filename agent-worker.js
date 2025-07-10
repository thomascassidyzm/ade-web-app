#!/usr/bin/env node

// Agent worker that auto-claims and completes tasks
const coordinator = require('./agent-coordinator');

const agentId = process.argv[2] || `AGENT_${Date.now()}`;
const capabilities = process.argv.slice(3) || ['any'];

console.log(`Starting agent ${agentId} with capabilities: ${capabilities}`);

// Simulate work completion
coordinator.on('taskClaimed', async ({ agentId: id, taskId }) => {
  if (id !== agentId) return;
  
  console.log(`Working on ${taskId}...`);
  
  // Simulate work (in real implementation, agents would do actual work)
  setTimeout(() => {
    coordinator.completeTask(agentId, `Completed by ${agentId}`);
  }, 5000);
});

// Register agent
coordinator.registerAgent(agentId, capabilities);

// Keep running
process.stdin.resume();