const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

// Local modules
const VirtualFileSystem = require('./vfs');
const AgentSpawner = require('./agent-spawner');
const ADEPhases = require('./ade-phases-guidance');
const VFSPersistence = require('./vfs-persistence');

// Initialize
const vfs = new VirtualFileSystem();
const vfsPersistence = new VFSPersistence(vfs);
const agentSpawner = new AgentSpawner(process.env.ANTHROPIC_API_KEY);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Track connections
const clients = new Map();
const pendingRequests = [];

console.log('ADE Server starting...');

wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  clients.set(clientId, ws);
  
  console.log(`New WebSocket connection: ${clientId}`);
  
  // Send connection status
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to ADE server',
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);
      
      switch(data.type) {
        case 'user_request':
          // Handle user request from web UI
          console.log('User request:', data.request);
          
          // Add to pending requests for L1_ORCH
          pendingRequests.push({
            ...data,
            receivedAt: new Date().toISOString()
          });
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'request_acknowledged',
            message: 'Processing your request...',
            timestamp: new Date().toISOString()
          }));
          
          // Notify all clients (including L1_ORCH if connected)
          broadcast({
            type: 'new_request',
            request: data.request,
            features: data.features,
            userId: data.userId,
            sessionId: data.sessionId
          });
          break;
          
        case 'agent_connect':
          // Handle agent connection (like L1_ORCH)
          console.log(`Agent connected: ${data.agentId}`);
          
          if (data.agentId === 'L1_ORCH') {
            // Send phase guidance
            ws.send(JSON.stringify({
              type: 'phase_guidance',
              phases: ADEPhases.phases,
              principles: ADEPhases.key_principles,
              timeCompression: ADEPhases.time_compression
            }));
            
            // Notify web clients
            broadcastToWeb({
              type: 'orch_connected',
              timestamp: new Date().toISOString()
            });
          }
          break;
          
        case 'get_pending_requests':
          // L1_ORCH asking for pending requests
          ws.send(JSON.stringify({
            type: 'pending_requests',
            requests: pendingRequests,
            count: pendingRequests.length
          }));
          
          // Clear after sending
          pendingRequests.length = 0;
          break;
          
        case 'apml_message':
          // Route APML messages
          if (data.to === 'user') {
            broadcastToWeb({
              type: 'apml_from_orch',
              content: data.content,
              timestamp: new Date().toISOString()
            });
          }
          break;
          
        case 'vfs_write':
          // Handle VFS write
          const result = await vfs.write(data.content.path, data.content.content, data.content.metadata);
          console.log('VFS Write:', result);
          
          // Save snapshot on important writes
          if (data.content.path.includes('/specs/') || data.content.path.includes('/components/')) {
            await vfsPersistence.saveOnEvent('important_write');
          }
          
          ws.send(JSON.stringify({
            type: 'vfs_write_complete',
            result: result
          }));
          break;
          
        case 'create_worker':
          // Handle agent spawning
          const agent = await agentSpawner.spawnAgent(data.content.type, data.content.taskId, vfs);
          console.log('Agent spawned:', agent);
          
          ws.send(JSON.stringify({
            type: 'worker_created',
            agentId: agent.id,
            agentType: agent.type,
            taskId: agent.taskId,
            status: agent.status
          }));
          break;
      }
    } catch (error) {
      console.error('Message handling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Broadcast only to web clients (not agents)
function broadcastToWeb(message) {
  // For now, broadcast to all - in future could tag client types
  broadcast(message);
}

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    connections: clients.size,
    pendingRequests: pendingRequests.length,
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

app.get('/api/vfs/list', async (req, res) => {
  const structure = await vfs.getStructure();
  res.json(structure);
});

// APML libraries endpoint
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

// VFS persistence endpoints
app.post('/api/vfs/snapshot', async (req, res) => {
  const result = await vfsPersistence.saveSnapshot('manual');
  res.json(result);
});

app.get('/api/vfs/snapshots', (req, res) => {
  const snapshots = vfsPersistence.listSnapshots();
  res.json({ snapshots });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ADE server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
  
  // Auto-save VFS periodically
  setInterval(async () => {
    await vfsPersistence.saveOnEvent('periodic');
  }, 300000); // Every 5 minutes
});