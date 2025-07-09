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
  
  // Start auto-save
  setInterval(async () => {
    await vfsPersistence.saveOnEvent('periodic');
  }, 300000); // Every 5 minutes
});

const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Map();
const pendingRequests = [];

wss.on('connection', (ws) => {
  const clientId = Date.now().toString();
  clients.set(clientId, ws);
  
  console.log(`New WebSocket connection: ${clientId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);
      
      switch(data.type) {
        case 'agent_connect':
          if (data.agentId === 'L1_ORCH') {
            console.log('L1_ORCH connected');
            
            // Send phase guidance
            ws.send(JSON.stringify({
              type: 'phase_guidance',
              phases: ADEPhases.phases,
              key_principles: ADEPhases.key_principles,
              time_compression: ADEPhases.time_compression,
              timestamp: new Date().toISOString()
            }));
            
            // Notify web clients
            broadcast({
              type: 'orch_connected',
              timestamp: new Date().toISOString()
            });
          }
          break;
          
        case 'vfs_write':
          const result = await vfs.write(
            data.content.path, 
            data.content.content, 
            data.content.metadata
          );
          console.log('VFS Write:', result);
          
          // Save snapshot on important writes
          if (data.content.path.includes('/specs/') || 
              data.content.path.includes('/components/')) {
            await vfsPersistence.saveOnEvent('important_write');
          }
          
          ws.send(JSON.stringify({
            type: 'vfs_write_result',
            result: result,
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'create_worker':
          const agent = await agentSpawner.spawnAgent(
            data.content.type, 
            data.content.taskId, 
            vfs
          );
          console.log('Agent spawned:', agent);
          
          ws.send(JSON.stringify({
            type: 'worker_created',
            agentId: agent.id,
            agentType: agent.type,
            taskId: agent.taskId,
            status: agent.status
          }));
          break;
          
        case 'user_request':
          // From web UI
          pendingRequests.push({
            ...data,
            receivedAt: new Date().toISOString()
          });
          
          // Acknowledge
          ws.send(JSON.stringify({
            type: 'request_acknowledged',
            message: 'Your request has been queued',
            timestamp: new Date().toISOString()
          }));
          
          // Notify all clients
          broadcast({
            type: 'new_request_available',
            count: pendingRequests.length
          });
          break;
          
        case 'get_pending_requests':
          // L1_ORCH checking for requests
          ws.send(JSON.stringify({
            type: 'pending_requests',
            requests: pendingRequests,
            count: pendingRequests.length
          }));
          
          // Clear after sending
          pendingRequests.length = 0;
          break;
          
        case 'apml_message':
          if (data.to === 'user') {
            // Route to web clients
            broadcast({
              type: 'apml_from_orch',
              content: data.content,
              timestamp: new Date().toISOString()
            });
          }
          break;
      }
    } catch (error) {
      console.error('Message parsing error:', error);
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

// Broadcast to all clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    connections: clients.size,
    pendingRequests: pendingRequests.length,
    vfs: {
      ready: true,
      persistence: true
    },
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});