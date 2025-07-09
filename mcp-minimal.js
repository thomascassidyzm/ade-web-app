#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Simple logging to stderr
function log(message) {
  process.stderr.write(`[MCP] ${message}\n`);
}

// Send response
function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
  console.log(JSON.stringify(response));
}

// Send error
function sendError(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    id: id,
    error: {
      code: code,
      message: message
    }
  };
  console.log(JSON.stringify(response));
}

// Handle requests
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    const { method, params, id } = request;
    
    log(`Received: ${method}`);
    
    switch (method) {
      case 'initialize':
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: {},
          serverInfo: {
            name: 'ade-minimal',
            version: '1.0.0'
          }
        });
        break;
        
      case 'initialized':
        // No response needed for initialized
        break;
        
      case 'tools/list':
        sendResponse(id, {
          tools: [
            {
              name: 'test_tool',
              description: 'A simple test tool',
              inputSchema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description: 'Test message'
                  }
                },
                required: []
              }
            }
          ]
        });
        break;
        
      case 'tools/call':
        if (params && params.name === 'test_tool') {
          sendResponse(id, {
            content: [{
              type: 'text',
              text: `Test response: ${params.arguments?.message || 'no message'}`
            }]
          });
        } else {
          sendError(id, -32602, 'Unknown tool');
        }
        break;
        
      case 'resources/list':
        sendResponse(id, { resources: [] });
        break;
        
      case 'prompts/list':
        sendResponse(id, { prompts: [] });
        break;
        
      default:
        sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    log(`Error: ${e.message}`);
    // Send parse error with null id
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

log('Minimal MCP server started');