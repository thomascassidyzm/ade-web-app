const WebSocket = require('ws');

// Local development bridge - connects web app to Claude Desktop
const BRIDGE_PORT = 8765;
const ADE_SERVER = 'ws://127.0.0.1:3001';

// Create bridge server
const wss = new WebSocket.Server({ port: BRIDGE_PORT });
let adeConnection = null;
let claudeConnection = null;

console.log(`Local bridge running on port ${BRIDGE_PORT}`);

// Connect to ADE web server
function connectToADE() {
  adeConnection = new WebSocket(ADE_SERVER);
  
  adeConnection.on('open', () => {
    console.log('Connected to ADE server');
  });
  
  adeConnection.on('message', (data) => {
    // Forward to Claude Desktop if connected
    if (claudeConnection && claudeConnection.readyState === WebSocket.OPEN) {
      claudeConnection.send(data);
    }
  });
  
  adeConnection.on('close', () => {
    console.log('ADE server disconnected');
    setTimeout(connectToADE, 3000);
  });
}

// Handle Claude Desktop connections
wss.on('connection', (ws) => {
  console.log('Claude Desktop connected');
  claudeConnection = ws;
  
  ws.on('message', (data) => {
    // Forward to ADE server
    if (adeConnection && adeConnection.readyState === WebSocket.OPEN) {
      adeConnection.send(data);
    }
  });
  
  ws.on('close', () => {
    console.log('Claude Desktop disconnected');
    claudeConnection = null;
  });
});

connectToADE();