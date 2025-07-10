#!/usr/bin/env node
/**
 * MCP Orchestrator (Quiet Mode) - Reduced logging for Claude Desktop
 * Full L1_ORCH capabilities with minimal stderr output
 */

const readline = require('readline');
const WebSocket = require('ws');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const ADE_WS_URL = process.env.ADE_WS_URL || 'wss://ade-web-app-production.up.railway.app';
const ADE_HTTP_URL = process.env.ADE_HTTP_URL || 'https://ade-web-app-production.up.railway.app';
const QUIET_MODE = process.env.MCP_QUIET !== 'false';

// Global state
let ws = null;
let isConnected = false;
let workingDirectory = process.cwd();
let reconnectAttempts = 0;
let lastError = null;

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Minimal logging - only critical errors
function log(message, level = 'info') {
  if (!QUIET_MODE || level === 'error') {
    if (level === 'error' && message !== lastError) {
      process.stderr.write(`[ERROR] ${message}\n`);
      lastError = message;
    } else if (!QUIET_MODE) {
      process.stderr.write(`[${level.toUpperCase()}] ${message}\n`);
    }
  }
}

// Connect to ADE WebSocket with exponential backoff
function connectWebSocket() {
  if (reconnectAttempts > 5) {
    log('Max reconnection attempts reached. Running in offline mode.', 'error');
    return;
  }
  
  ws = new WebSocket(ADE_WS_URL, {
    handshakeTimeout: 5000,
    perMessageDeflate: false
  });
  
  ws.on('open', () => {
    isConnected = true;
    reconnectAttempts = 0;
    lastError = null;
    
    // Register as L1_ORCH
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'agent_connect',
          agentId: 'L1_ORCH',
          capabilities: ['orchestration', 'coordination', 'planning', 'execution'],
          metadata: {
            powered_by: 'Claude Desktop Pro',
            version: '2.0.0',
            quiet_mode: QUIET_MODE
          }
        }));
      }
    }, 100);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      // Only log important messages
      if (message.type === 'l1_orch_protocol' || message.type === 'error') {
        log(`Important: ${message.type}`, 'info');
      }
    } catch (e) {
      // Silently ignore parse errors
    }
  });
  
  ws.on('close', () => {
    isConnected = false;
    reconnectAttempts++;
    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), 30000);
    setTimeout(connectWebSocket, delay);
  });
  
  ws.on('error', (error) => {
    if (error.code === 'ECONNREFUSED') {
      // Common error when ADE is not running - suppress
    } else {
      log(`WebSocket error: ${error.message}`, 'error');
    }
  });
}

// Execute bash command with timeout
function executeBash(command, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const options = {
      cwd: workingDirectory,
      timeout: timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    };
    
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error.message, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Tool definitions (same as before)
const tools = [
  // === ORCHESTRATION TOOLS ===
  {
    name: 'create_agent',
    description: 'Create a specialized AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        type: { 
          type: 'string',
          enum: ['designer', 'frontend', 'backend', 'database', 'tester', 'deployer'],
          description: 'Type of agent to create'
        },
        taskId: { 
          type: 'string',
          description: 'Unique task identifier'
        },
        instructions: {
          type: 'string',
          description: 'Specific instructions for the agent'
        }
      },
      required: ['type', 'instructions']
    }
  },
  
  // === VFS TOOLS ===
  {
    name: 'vfs_write',
    description: 'Write file to Virtual File System',
    inputSchema: {
      type: 'object',
      properties: {
        path: { 
          type: 'string',
          description: 'VFS path (e.g. /specs/app.apml, /components/Header.vue)'
        },
        content: { type: 'string' },
        metadata: { 
          type: 'object',
          properties: {
            phase: { type: 'string' },
            agentId: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      },
      required: ['path', 'content']
    }
  },
  
  {
    name: 'vfs_read',
    description: 'Read file from Virtual File System',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      },
      required: ['path']
    }
  },
  
  {
    name: 'vfs_list',
    description: 'List all files in VFS',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // === BASH & SYSTEM TOOLS ===
  {
    name: 'bash',
    description: 'Execute bash command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { 
          type: 'string',
          description: 'Bash command to execute'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 120000)'
        }
      },
      required: ['command']
    }
  },
  
  {
    name: 'cd',
    description: 'Change working directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      },
      required: ['path']
    }
  },
  
  {
    name: 'pwd',
    description: 'Get current working directory',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // === FILE SYSTEM TOOLS ===
  {
    name: 'read_file',
    description: 'Read local file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' }
      },
      required: ['path']
    }
  },
  
  {
    name: 'write_file',
    description: 'Write local file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['path', 'content']
    }
  },
  
  // === WORK QUEUE TOOLS ===
  {
    name: 'queue_stats',
    description: 'Get work queue statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  {
    name: 'create_build_tasks',
    description: 'Create a full set of build tasks',
    inputSchema: {
      type: 'object',
      properties: {
        appDescription: { 
          type: 'string',
          description: 'Description of the app to build'
        }
      },
      required: ['appDescription']
    }
  },
  
  {
    name: 'get_tasks',
    description: 'Get available tasks from queue',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by task type (optional)'
        }
      }
    }
  }
];

// Handle tool calls with better error handling
async function handleToolCall(tool, args, id) {
  try {
    switch (tool) {
      // === ORCHESTRATION ===
      case 'create_agent':
        if (ws && isConnected) {
          const agentId = `${args.type.toUpperCase()}_${Date.now()}`;
          ws.send(JSON.stringify({
            type: 'create_worker',
            content: {
              type: args.type,
              taskId: args.taskId || agentId,
              instructions: args.instructions
            }
          }));
          sendResponse(id, {
            content: [{
              type: 'text',
              text: `Creating ${args.type} agent: ${agentId}`
            }]
          });
        } else {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: 'Working in offline mode - agent creation simulated'
            }]
          });
        }
        break;
        
      // === VFS ===
      case 'vfs_write':
        if (ws && isConnected) {
          ws.send(JSON.stringify({
            type: 'vfs_write',
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
              text: `Written to VFS: ${args.path}`
            }]
          });
        } else {
          // Offline mode - write locally
          const localPath = path.join(workingDirectory, 'vfs-offline', args.path);
          await fs.mkdir(path.dirname(localPath), { recursive: true });
          await fs.writeFile(localPath, args.content);
          sendResponse(id, {
            content: [{
              type: 'text',
              text: `Written locally (offline): ${args.path}`
            }]
          });
        }
        break;
        
      case 'vfs_read':
        if (isConnected) {
          const readUrl = `${ADE_HTTP_URL}/api/vfs/read/${args.path}`;
          https.get(readUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                const result = JSON.parse(data);
                sendResponse(id, {
                  content: [{
                    type: 'text',
                    text: result.content || JSON.stringify(result)
                  }]
                });
              } catch (e) {
                sendResponse(id, {
                  content: [{
                    type: 'text',
                    text: data
                  }]
                });
              }
            });
          }).on('error', (err) => {
            sendError(id, -32603, `VFS unavailable - running in offline mode`);
          });
        } else {
          sendError(id, -32603, 'VFS read not available in offline mode');
        }
        break;
        
      // === BASH ===
      case 'bash':
        const result = await executeBash(args.command, args.timeout);
        sendResponse(id, {
          content: [{
            type: 'text',
            text: result.stdout || result.stderr || 'Command completed'
          }]
        });
        break;
        
      case 'cd':
        const newPath = path.isAbsolute(args.path) 
          ? args.path 
          : path.join(workingDirectory, args.path);
        try {
          await fs.access(newPath);
          workingDirectory = newPath;
          sendResponse(id, {
            content: [{
              type: 'text',
              text: `Changed directory to: ${workingDirectory}`
            }]
          });
        } catch (e) {
          throw new Error(`Directory not found: ${newPath}`);
        }
        break;
        
      case 'pwd':
        sendResponse(id, {
          content: [{
            type: 'text',
            text: workingDirectory
          }]
        });
        break;
        
      // === FILE SYSTEM ===
      case 'read_file':
        const filePath = path.isAbsolute(args.path) 
          ? args.path 
          : path.join(workingDirectory, args.path);
        const fileContent = await fs.readFile(filePath, 'utf8');
        sendResponse(id, {
          content: [{
            type: 'text',
            text: fileContent
          }]
        });
        break;
        
      case 'write_file':
        const writePath = path.isAbsolute(args.path) 
          ? args.path 
          : path.join(workingDirectory, args.path);
        await fs.writeFile(writePath, args.content, 'utf8');
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `File written: ${writePath}`
          }]
        });
        break;
        
      // === WORK QUEUE ===
      case 'queue_stats':
        if (isConnected) {
          https.get(`${ADE_HTTP_URL}/api/queue/stats`, (res) => {
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
          }).on('error', () => {
            sendResponse(id, {
              content: [{
                type: 'text',
                text: 'Queue stats unavailable - ADE offline'
              }]
            });
          });
        } else {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: 'Queue stats unavailable - running in offline mode'
            }]
          });
        }
        break;
        
      case 'create_build_tasks':
        if (isConnected) {
          const postData = JSON.stringify({ appDescription: args.appDescription });
          const options = {
            hostname: ADE_HTTP_URL.replace('https://', ''),
            path: '/api/queue/create-build',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': postData.length
            }
          };
          
          const req = https.request(options, (res) => {
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
          });
          
          req.on('error', () => {
            sendResponse(id, {
              content: [{
                type: 'text',
                text: 'Created local task list (ADE offline)'
              }]
            });
          });
          
          req.write(postData);
          req.end();
        } else {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: 'Task creation unavailable - running in offline mode'
            }]
          });
        }
        break;
        
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  } catch (error) {
    sendError(id, -32603, error.message);
  }
}

// MCP protocol handlers
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

// Handle MCP requests
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    const { method, params, id } = request;
    
    switch (method) {
      case 'initialize':
        // Try to connect but don't block initialization
        connectWebSocket();
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'ade-orchestrator-quiet',
            version: '2.1.0'
          }
        });
        break;
        
      case 'tools/list':
        sendResponse(id, { tools });
        break;
        
      case 'tools/call':
        if (!params || !params.name) {
          sendError(id, -32602, 'Invalid params');
          return;
        }
        handleToolCall(params.name, params.arguments || {}, id);
        break;
        
      case 'resources/list':
        sendResponse(id, { resources: [] });
        break;
        
      case 'prompts/list':
        sendResponse(id, { prompts: [] });
        break;
        
      default:
        sendError(id, -32601, 'Method not found');
    }
  } catch (e) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    }));
  }
});

// Start in quiet mode
if (!QUIET_MODE) {
  log('ADE Orchestrator MCP Server started (verbose mode)');
}