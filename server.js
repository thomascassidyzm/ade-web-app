const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

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
  
  bridgeWs.on('message', (message) => {
    // Forward messages from bridge to all connected clients
    const data = message.toString();
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

// Basic API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    connections: clients.size,
    timestamp: new Date().toISOString()
  });
});