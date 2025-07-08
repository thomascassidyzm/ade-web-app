const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const VirtualFileSystem = require('./vfs');
const AgentSpawner = require('./agent-spawner');

const app = express();
const PORT = process.env.PORT || 3001;
const vfs = new VirtualFileSystem();
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
  bridgeWs = new WebSocket('wss://ade-app.up.railway.app');
  
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