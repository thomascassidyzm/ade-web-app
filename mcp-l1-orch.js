#!/usr/bin/env node
/**
 * MCP L1_ORCH Server - Claude Desktop acts as the orchestrator
 * Connects via WebSocket to receive briefs from web UI
 */

const readline = require('readline');
const WebSocket = require('ws');
const https = require('https');

// Configuration
const ADE_WS_URL = process.env.ADE_WS_URL || 'wss://ade-web-app-production.up.railway.app';
const ADE_HTTP_URL = process.env.ADE_HTTP_URL || 'https://ade-web-app-production.up.railway.app';

// Global state
let ws = null;
let isConnected = false;
let pendingBriefs = [];

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Connect to ADE WebSocket as L1_ORCH
function connectWebSocket() {
  process.stderr.write(`Connecting to ADE WebSocket: ${ADE_WS_URL}\n`);
  
  ws = new WebSocket(ADE_WS_URL);
  
  ws.on('open', () => {
    process.stderr.write('WebSocket connected\n');
    isConnected = true;
    
    // Register as L1_ORCH after a small delay to ensure connection is stable
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'agent_connect',
          agentId: 'L1_ORCH',
          capabilities: ['orchestration', 'coordination', 'planning'],
          metadata: {
            powered_by: 'Claude Desktop Pro',
            version: '1.0.0'
          }
        }));
      }
    }, 100);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleWebSocketMessage(message);
    } catch (e) {
      // Try APML format
      handleAPMLMessage(data.toString());
    }
  });
  
  ws.on('close', () => {
    process.stderr.write('WebSocket disconnected, reconnecting...\n');
    isConnected = false;
    setTimeout(connectWebSocket, 5000);
  });
  
  ws.on('error', (error) => {
    process.stderr.write(`WebSocket error: ${error.message}\n`);
  });
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(message) {
  process.stderr.write(`WS Message: ${message.type}\n`);
  
  switch (message.type) {
    case 'user_request':
      // Brief from web UI user
      pendingBriefs.push({
        from: message.userId || 'web-user',
        request: message.request,
        sessionId: message.sessionId,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'connected':
      process.stderr.write('L1_ORCH registered successfully\n');
      break;
  }
}

// Handle APML messages
function handleAPMLMessage(apmlString) {
  // For now, add to pending briefs
  pendingBriefs.push({
    type: 'apml',
    content: apmlString,
    timestamp: new Date().toISOString()
  });
}

// MCP Request handling
rl.on('line', (line) => {
  process.stderr.write(`MCP Request: ${line}\n`);
  try {
    const request = JSON.parse(line);
    // Validate request has required fields
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request format');
    }
    handleMCPRequest(request);
  } catch (e) {
    // If we can't parse or validate, send error with id null
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error: ' + e.message
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

function handleMCPRequest(request) {
  const { method, params, id } = request;
  
  // Handle null/undefined id
  const requestId = id !== undefined ? id : null;
  
  // Extra validation
  if (!method) {
    sendError(requestId, -32600, 'Invalid request: missing method');
    return;
  }
  
  switch (method) {
    case 'initialize':
      connectWebSocket(); // Connect when MCP initializes
      sendResponse(requestId, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'ade-l1-orch',
          version: '1.0.0'
        }
      });
      break;
      
    case 'resources/list':
      sendResponse(requestId, { resources: [] });
      break;
      
    case 'prompts/list':
      sendResponse(requestId, { prompts: [] });
      break;
      
    case 'tools/list':
      sendResponse(requestId, {
        tools: [
          {
            name: 'get_messages',
            description: 'Check for user messages from web UI',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'send_apml',
            description: 'Send APML response to user',
            inputSchema: {
              type: 'object',
              properties: {
                to: { type: 'string' },
                type: { type: 'string' },
                content: { type: 'object' }
              },
              required: ['to', 'type', 'content']
            }
          },
          {
            name: 'get_status',
            description: 'Check connection status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'check_briefs',
            description: 'Check for pending briefs from web UI',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'send_to_agent',
            description: 'Send APML message to specific agent',
            inputSchema: {
              type: 'object',
              properties: {
                agentId: { type: 'string' },
                type: { type: 'string' },
                content: { type: 'object' }
              },
              required: ['agentId', 'type', 'content']
            }
          },
          {
            name: 'create_worker',
            description: 'Create a specialized worker agent',
            inputSchema: {
              type: 'object',
              properties: {
                type: { 
                  type: 'string',
                  enum: ['architect', 'frontend', 'backend', 'tester']
                },
                taskId: { type: 'string' }
              },
              required: ['type']
            }
          },
          {
            name: 'assign_task',
            description: 'Assign a task to a specific agent',
            inputSchema: {
              type: 'object',
              properties: {
                agentId: { type: 'string' },
                task: { type: 'object' }
              },
              required: ['agentId', 'task']
            }
          },
          {
            name: 'orchestrate_build',
            description: 'Orchestrate a complete build',
            inputSchema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                appType: { type: 'string' }
              },
              required: ['description']
            }
          },
          {
            name: 'report_progress',
            description: 'Send progress update to web UI',
            inputSchema: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' }
              },
              required: ['status', 'message']
            }
          },
          {
            name: 'write_apml_file',
            description: 'Write APML specification to VFS',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path in VFS (e.g. /specs/app.apml)' },
                content: { type: 'string', description: 'APML content to write' },
                metadata: { 
                  type: 'object',
                  description: 'Optional metadata',
                  properties: {
                    phase: { type: 'string' },
                    timestamp: { type: 'string' },
                    from: { type: 'string' }
                  }
                }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'read_vfs_file',
            description: 'Read file from VFS',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to read' }
              },
              required: ['path']
            }
          },
          {
            name: 'list_vfs_files',
            description: 'List all files in VFS',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      });
      break;
      
    case 'tools/call':
      if (!params || !params.name) {
        sendError(requestId, -32602, 'Invalid params: missing tool name');
        return;
      }
      try {
        handleToolCall(params.name, params.arguments || {}, requestId);
      } catch (error) {
        sendError(requestId, -32603, `Tool execution error: ${error.message}`);
      }
      break;
      
    default:
      sendError(requestId, -32601, 'Method not found');
  }
}

function handleToolCall(tool, args, id) {
  switch (tool) {
    case 'get_messages':
    case 'check_briefs':  // Alias for backward compatibility
      const briefs = [...pendingBriefs];
      pendingBriefs = []; // Clear after reading
      sendResponse(id, {
        content: [{
          type: 'text',
          text: briefs.length > 0 
            ? `Found ${briefs.length} pending briefs:\n${JSON.stringify(briefs, null, 2)}`
            : 'No pending briefs'
        }]
      });
      break;
      
    case 'send_apml':
      if (ws && isConnected) {
        // Send APML message through WebSocket
        ws.send(JSON.stringify({
          type: 'apml_message',
          from: 'L1_ORCH',
          to: args.to || 'user',
          messageType: args.type || 'response',
          content: args.content
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `APML message sent to ${args.to || 'user'}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'get_status':
      sendResponse(id, {
        content: [{
          type: 'text',
          text: JSON.stringify({
            connected: isConnected,
            websocket: ws ? 'active' : 'inactive',
            pendingBriefs: pendingBriefs.length
          }, null, 2)
        }]
      });
      break;
      
    case 'send_to_agent':
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'apml_message',
          from: 'L1_ORCH',
          to: args.agentId,
          messageType: args.type,
          content: args.content
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Sent ${args.type} to ${args.agentId}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'orchestrate_build':
      // High-level orchestration
      if (ws && isConnected) {
        // Send initial brief to all agents
        ws.send(JSON.stringify({
          type: 'apml_message',
          from: 'L1_ORCH',
          to: 'broadcast',
          messageType: 'brief',
          content: {
            task: 'build_application',
            description: args.description,
            appType: args.appType || 'web'
          }
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Started orchestrating build: ${args.description}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'report_progress':
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'agent_response',
          userId: args.userId || 'web-user',
          from: 'L1_ORCH',
          status: args.status,
          message: args.message
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Progress reported: ${args.status}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'create_worker':
      if (ws && isConnected) {
        const workerId = `${args.type.toUpperCase()}_${Date.now()}`;
        ws.send(JSON.stringify({
          type: 'spawn_agent',
          agentType: args.type,
          agentId: workerId,
          taskId: args.taskId,
          from: 'L1_ORCH'
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Spawning ${args.type} worker with ID: ${workerId}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'assign_task':
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'task',
          from: 'L1_ORCH',
          to: args.agentId,
          content: args.task
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Task assigned to ${args.agentId}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'write_apml_file':
      if (ws && isConnected) {
        // Send VFS write command via WebSocket
        ws.send(JSON.stringify({
          type: 'vfs_write',
          from: 'L1_ORCH',
          content: {
            path: args.path,
            content: args.content,
            metadata: args.metadata || {
              from: 'L1_ORCH',
              timestamp: new Date().toISOString()
            }
          }
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Writing APML file to VFS: ${args.path}`
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'read_vfs_file':
      // Make HTTPS request to read VFS file
      if (!args.path) {
        sendError(id, -32602, 'Missing required parameter: path');
        return;
      }
      const readUrl = `${ADE_HTTP_URL}/api/vfs/read/${args.path}`;
      https.get(readUrl, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: data
            }]
          });
        });
      }).on('error', (err) => {
        sendError(id, -32603, `Failed to read VFS: ${err.message}`);
      });
      break;
      
    case 'list_vfs_files':
      // Make HTTPS request to list VFS files
      https.get(`${ADE_HTTP_URL}/api/vfs/list`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: data
            }]
          });
        });
      }).on('error', (err) => {
        sendError(id, -32603, `Failed to list VFS: ${err.message}`);
      });
      break;
      
    default:
      sendError(id, -32602, 'Unknown tool');
  }
}

// MCP response helpers
function sendResponse(id, result) {
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    id: id,
    result: result
  }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  }));
}

// Start
process.stderr.write('ADE L1_ORCH MCP Server starting...\n');