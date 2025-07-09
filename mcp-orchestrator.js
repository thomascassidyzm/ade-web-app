#!/usr/bin/env node
/**
 * MCP Orchestrator - Full L1_ORCH capabilities for Claude Desktop
 * Combines agent orchestration, VFS access, code generation, and system operations
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

// Global state
let ws = null;
let isConnected = false;
let workingDirectory = process.cwd();

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Logging to stderr
function log(message) {
  process.stderr.write(`[ORCH] ${message}\n`);
}

// Connect to ADE WebSocket
function connectWebSocket() {
  log(`Connecting to ADE: ${ADE_WS_URL}`);
  
  ws = new WebSocket(ADE_WS_URL);
  
  ws.on('open', () => {
    log('Connected to ADE');
    isConnected = true;
    
    // Register as L1_ORCH
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'agent_connect',
          agentId: 'L1_ORCH',
          capabilities: ['orchestration', 'coordination', 'planning', 'execution'],
          metadata: {
            powered_by: 'Claude Desktop Pro',
            version: '2.0.0'
          }
        }));
      }
    }, 100);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      log(`Message received: ${message.type}`);
    } catch (e) {
      // Handle non-JSON messages
    }
  });
  
  ws.on('close', () => {
    log('Disconnected, reconnecting...');
    isConnected = false;
    setTimeout(connectWebSocket, 5000);
  });
  
  ws.on('error', (error) => {
    log(`WebSocket error: ${error.message}`);
  });
}

// Execute bash command with timeout
function executeBash(command, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const options = {
      cwd: workingDirectory,
      timeout: timeout
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

// Tool definitions
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
  
  {
    name: 'send_to_agent',
    description: 'Send message to a specific agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        message: { type: 'string' },
        data: { type: 'object' }
      },
      required: ['agentId', 'message']
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
  
  {
    name: 'list_files',
    description: 'List files in directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { 
          type: 'string',
          description: 'Directory path (default: current directory)'
        }
      }
    }
  },
  
  // === GIT TOOLS ===
  {
    name: 'git_status',
    description: 'Get git repository status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  {
    name: 'git_add',
    description: 'Stage files for commit',
    inputSchema: {
      type: 'object',
      properties: {
        files: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Files to stage (use ["."] for all)'
        }
      },
      required: ['files']
    }
  },
  
  {
    name: 'git_commit',
    description: 'Commit staged changes',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      required: ['message']
    }
  },
  
  {
    name: 'git_push',
    description: 'Push commits to remote',
    inputSchema: {
      type: 'object',
      properties: {
        remote: { 
          type: 'string',
          default: 'origin'
        },
        branch: {
          type: 'string',
          default: 'main'
        }
      }
    }
  },
  
  // === DEPLOYMENT TOOLS ===
  {
    name: 'railway_deploy',
    description: 'Deploy to Railway',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to project (default: current directory)'
        }
      }
    }
  },
  
  // === CODE GENERATION TOOLS ===
  {
    name: 'generate_component',
    description: 'Generate Vue/React/Svelte component',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { 
          type: 'string',
          enum: ['vue', 'react', 'svelte'],
          default: 'vue'
        },
        props: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              required: { type: 'boolean' }
            }
          }
        }
      },
      required: ['name']
    }
  },
  
  {
    name: 'generate_api',
    description: 'Generate API endpoint',
    inputSchema: {
      type: 'object',
      properties: {
        method: { 
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE']
        },
        path: { type: 'string' },
        handler: { type: 'string' }
      },
      required: ['method', 'path', 'handler']
    }
  },
  
  // === STATUS TOOLS ===
  {
    name: 'get_status',
    description: 'Get full system status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Handle tool calls
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
          throw new Error('Not connected to ADE');
        }
        break;
        
      case 'send_to_agent':
        if (ws && isConnected) {
          ws.send(JSON.stringify({
            type: 'agent_message',
            from: 'L1_ORCH',
            to: args.agentId,
            message: args.message,
            data: args.data
          }));
          sendResponse(id, {
            content: [{
              type: 'text',
              text: `Message sent to ${args.agentId}`
            }]
          });
        } else {
          throw new Error('Not connected to ADE');
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
          throw new Error('Not connected to ADE');
        }
        break;
        
      case 'vfs_read':
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
          sendError(id, -32603, `Failed to read VFS: ${err.message}`);
        });
        break;
        
      case 'vfs_list':
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
        
      case 'list_files':
        const listPath = args.path 
          ? (path.isAbsolute(args.path) ? args.path : path.join(workingDirectory, args.path))
          : workingDirectory;
        const files = await fs.readdir(listPath);
        sendResponse(id, {
          content: [{
            type: 'text',
            text: files.join('\n')
          }]
        });
        break;
        
      // === GIT ===
      case 'git_status':
        const gitStatus = await executeBash('git status --porcelain');
        sendResponse(id, {
          content: [{
            type: 'text',
            text: gitStatus.stdout || 'Clean working directory'
          }]
        });
        break;
        
      case 'git_add':
        const addCmd = `git add ${args.files.join(' ')}`;
        await executeBash(addCmd);
        sendResponse(id, {
          content: [{
            type: 'text',
            text: `Staged files: ${args.files.join(', ')}`
          }]
        });
        break;
        
      case 'git_commit':
        const commitCmd = `git commit -m "${args.message.replace(/"/g, '\\"')}"`;
        const commitResult = await executeBash(commitCmd);
        sendResponse(id, {
          content: [{
            type: 'text',
            text: commitResult.stdout
          }]
        });
        break;
        
      case 'git_push':
        const pushCmd = `git push ${args.remote || 'origin'} ${args.branch || 'main'}`;
        const pushResult = await executeBash(pushCmd);
        sendResponse(id, {
          content: [{
            type: 'text',
            text: pushResult.stdout || 'Push completed'
          }]
        });
        break;
        
      // === DEPLOYMENT ===
      case 'railway_deploy':
        const deployPath = args.projectPath || workingDirectory;
        const deployResult = await executeBash('railway up', 300000); // 5 min timeout
        sendResponse(id, {
          content: [{
            type: 'text',
            text: deployResult.stdout || 'Deployment initiated'
          }]
        });
        break;
        
      // === CODE GENERATION ===
      case 'generate_component':
        // Generate based on type
        let componentCode = '';
        if (args.type === 'vue') {
          componentCode = generateVueComponent(args.name, args.props);
        }
        // Save to VFS and local file
        const componentPath = `/components/${args.name}.${args.type}`;
        if (ws && isConnected) {
          ws.send(JSON.stringify({
            type: 'vfs_write',
            content: {
              path: componentPath,
              content: componentCode,
              metadata: { generator: 'L1_ORCH' }
            }
          }));
        }
        sendResponse(id, {
          content: [{
            type: 'text',
            text: componentCode
          }]
        });
        break;
        
      // === STATUS ===
      case 'get_status':
        const status = {
          orchestrator: {
            connected: isConnected,
            workingDirectory: workingDirectory,
            adeUrl: ADE_WS_URL
          },
          tools: {
            available: tools.map(t => t.name),
            count: tools.length
          }
        };
        sendResponse(id, {
          content: [{
            type: 'text',
            text: JSON.stringify(status, null, 2)
          }]
        });
        break;
        
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  } catch (error) {
    sendError(id, -32603, error.message);
  }
}

// Component generation helpers
function generateVueComponent(name, props = []) {
  const propsSection = props.length > 0 
    ? `\ninterface Props {\n${props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type || 'any'}`).join('\n')}\n}\n\ndefineProps<Props>()`
    : '';
    
  return `<script setup lang="ts">
${propsSection}

// Component logic here
</script>

<template>
  <div class="${name.toLowerCase()}">
    <h2>${name}</h2>
    <!-- Component template -->
  </div>
</template>

<style scoped>
.${name.toLowerCase()} {
  /* Component styles */
}
</style>`;
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
    
    log(`Request: ${method}`);
    
    switch (method) {
      case 'initialize':
        connectWebSocket();
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'ade-orchestrator',
            version: '2.0.0'
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
    log(`Error: ${e.message}`);
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

log('ADE Orchestrator MCP Server started');