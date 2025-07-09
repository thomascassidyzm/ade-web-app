const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const VirtualFileSystem = require('./vfs');
const AgentSpawner = require('./agent-spawner');
const ADEPhases = require('./ade-phases-guidance');
const VFSPersistence = require('./vfs-persistence');

const app = express();
const PORT = process.env.PORT || 3001;
const vfs = new VirtualFileSystem();
const vfsPersistence = new VFSPersistence(vfs);
const agentSpawner = new AgentSpawner(process.env.ANTHROPIC_API_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket server
const server = app.listen(PORT, () => {
  console.log(`ADE Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Map();
let bridgeWs = null;

// Connect to MCP bridge
function connectToBridge() {
  // Don't connect to external bridge - we ARE the bridge
  // bridgeWs = new WebSocket('wss://ade-app.up.railway.app');
  
  bridgeWs.on('open', () => {
    console.log('Connected to MCP bridge');
  });
  
  bridgeWs.on('message', async (message) => {
    // Forward messages from bridge to all connected clients
    const data = message.toString();
    
    // Handle VFS writes and agent creation
    try {
      const msg = JSON.parse(data);
      
      if (msg.type === 'vfs_write') {
        const result = await vfs.write(msg.content.path, msg.content.content, msg.content.metadata);
        console.log('VFS Write:', result);
        
        // Save snapshot on important writes
        if (msg.content.path.includes('/specs/') || msg.content.path.includes('/components/')) {
          await vfsPersistence.saveOnEvent('important_write');
        }
      }
      
      if (msg.type === 'create_worker') {
        const agent = await agentSpawner.spawnAgent(msg.content.type, msg.content.taskId, vfs);
        console.log('Agent spawned:', agent);
        
        // Send confirmation back
        bridgeWs.send(JSON.stringify({
          type: 'worker_created',
          agentId: agent.id,
          agentType: agent.type,
          taskId: agent.taskId,
          status: agent.status
        }));
      }
      
      if (msg.type === 'agent_connect' && msg.agentId === 'L1_ORCH') {
        console.log('L1_ORCH connected');
        
        // Send updated phase guidance to L1_ORCH
        bridgeWs.send(JSON.stringify({
          type: 'apml',
          content: `---
apml: 1.0
type: phase_guidance_v2
from: ADE_SYSTEM
to: L1_ORCH
timestamp: ${new Date().toISOString()}
---
content:
  version: 2.0.0
  message: "Updated ADE Phase Guidance - Reflecting our improved understanding"
  phases: ${JSON.stringify(ADEPhases.phases, null, 2)}
  key_principles: ${JSON.stringify(ADEPhases.key_principles, null, 2)}
  time_compression: ${JSON.stringify(ADEPhases.time_compression, null, 2)}
  instruction: "Use this updated guidance for the complete ADE flow: SPECIFY → VISUALIZE → BUILD → EYE-TEST → DEPLOY"`
        }));
        
        // Also send existing libraries
        bridgeWs.send(JSON.stringify({
          type: 'apml',
          content: `---
apml: 1.0
type: library_reminder
from: ADE_SYSTEM
to: L1_ORCH
---
content:
  message: "Remember: You have access to the complete APML component library and advanced capabilities"
  components: ["auth", "navigation", "data_patterns", "ui_patterns", "business_features"]
  capabilities: ["voice", "ai", "payments", "realtime", "location", "analytics", "media"]
  use_existing: "Always use existing components/capabilities instead of creating from scratch"`
        }));
        
        // Notify all web clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'orch_connected',
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
      
      if (msg.type === 'apml_message' && msg.to === 'user') {
        console.log('APML message for user:', msg);
        // Forward to all web clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'apml_from_orch',
              content: msg.content,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
    } catch (e) {
      // Not JSON or not a command we handle, just forward
    }
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
  
  bridgeWs.on('close', () => {
    console.log('MCP bridge disconnected, reconnecting...');
    setTimeout(connectToBridge, 3000);
  });
  
  bridgeWs.on('error', (error) => {
    console.error('Bridge connection error:', error.message);
  });
}

connectToBridge();

wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  clients.set(clientId, ws);
  
  console.log(`New WebSocket connection: ${clientId}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Forward to MCP bridge
      if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
        bridgeWs.send(JSON.stringify(data));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'MCP bridge not connected',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    connections: clients.size,
    timestamp: new Date().toISOString()
  });
});

// VFS endpoints
app.post('/api/vfs/write', async (req, res) => {
  const { path, content, metadata } = req.body;
  const result = await vfs.write(path, content, metadata);
  res.json(result);
});

app.get('/api/vfs/read/*', async (req, res) => {
  const filePath = req.params[0];
  const result = await vfs.read(filePath);
  res.json(result);
});

// Support both /api/vfs/list and /api/vfs/list/*
app.get('/api/vfs/list', async (req, res) => {
  const files = await vfs.list('');
  res.json({ files });
});

app.get('/api/vfs/list/*', async (req, res) => {
  const directory = req.params[0] || '';
  const files = await vfs.list(directory);
  res.json({ files });
});

// APML Libraries endpoint
app.get('/api/apml/libraries', (req, res) => {
  res.json({
    parser: 'apml-parser.js',
    library: 'apml-library-system.js',
    capabilities: 'apml-capability-library.js',
    components: require('./apml-library-system.js').components,
    capabilities: require('./apml-capability-library.js').capabilities
  });
});

// Agent management endpoints
app.post('/api/agents/spawn', async (req, res) => {
  const { type, taskId } = req.body;
  const agent = await agentSpawner.spawnAgent(type, taskId, vfs);
  res.json(agent);
});

app.get('/api/agents', (req, res) => {
  res.json({ agents: agentSpawner.getAllAgents() });
});

app.get('/api/agents/:id', (req, res) => {
  const agent = agentSpawner.getAgent(req.params.id);
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// VFS persistence endpoints
app.post('/api/vfs/snapshot', async (req, res) => {
  const result = await vfsPersistence.saveSnapshot('manual');
  res.json(result);
});

app.post('/api/vfs/export', async (req, res) => {
  const { projectName } = req.body;
  if (!projectName) {
    return res.status(400).json({ error: 'Project name required' });
  }
  
  try {
    const exportPath = await vfsPersistence.exportForDeployment(projectName);
    res.json({ success: true, path: exportPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});