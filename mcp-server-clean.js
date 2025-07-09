#!/usr/bin/env node
/**
 * Clean MCP Server for ADE - No APML dependencies, pure JSON schemas
 * Version 3.0.0
 */

const readline = require('readline');
const WebSocket = require('ws');

// Configuration
const ADE_WS_URL = process.env.ADE_WS_URL || 'wss://ade-web-app-production.up.railway.app';

// Global state
let ws = null;
let isConnected = false;

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Tool definitions with clean JSON schemas
const tools = {
  get_status: {
    description: "Get current system status",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  
  send_message: {
    description: "Send a message to the web interface",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message content"
        },
        phase: {
          type: "string",
          enum: ["thinking", "building", "testing", "deploying", "complete"],
          description: "Current development phase"
        },
        progress: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Progress percentage"
        }
      },
      required: ["message", "phase"]
    }
  },
  
  generate_vue_component: {
    description: "Generate a Vue 3 Single File Component",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          pattern: "^[A-Z][a-zA-Z0-9]*$",
          description: "Component name in PascalCase"
        },
        type: {
          type: "string",
          enum: ["page", "layout", "form", "list", "detail", "widget"],
          description: "Type of component"
        },
        props: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: {
                type: "string",
                enum: ["string", "number", "boolean", "object", "array"]
              },
              required: { type: "boolean", default: false },
              default: { type: "string" }
            },
            required: ["name", "type"]
          },
          description: "Component props definition"
        },
        children: {
          type: "array",
          items: { type: "string" },
          description: "Child component names"
        },
        styling: {
          type: "object",
          properties: {
            theme: {
              type: "string",
              enum: ["light", "dark", "auto"],
              default: "light"
            },
            size: {
              type: "string",
              enum: ["sm", "md", "lg", "xl"],
              default: "md"
            },
            variant: {
              type: "string",
              enum: ["primary", "secondary", "success", "warning", "error"],
              default: "primary"
            }
          },
          description: "Component styling options"
        }
      },
      required: ["name", "type"]
    }
  },
  
  generate_api_endpoint: {
    description: "Generate Express.js API endpoint",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          pattern: "^/[a-zA-Z0-9/_-]*$",
          description: "API endpoint path"
        },
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "HTTP method"
        },
        model: {
          type: "string",
          description: "Associated data model name"
        },
        authentication: {
          type: "boolean",
          default: true,
          description: "Require authentication"
        },
        validation: {
          type: "object",
          properties: {
            body: { type: "object" },
            params: { type: "object" },
            query: { type: "object" }
          },
          description: "Request validation rules"
        },
        response_schema: {
          type: "object",
          description: "Expected response structure"
        }
      },
      required: ["path", "method", "model"]
    }
  },
  
  create_database_model: {
    description: "Create Prisma database model",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          pattern: "^[A-Z][a-zA-Z0-9]*$",
          description: "Model name in PascalCase"
        },
        fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                pattern: "^[a-z][a-zA-Z0-9_]*$"
              },
              type: {
                type: "string",
                enum: ["String", "Int", "Float", "Boolean", "DateTime", "Json"]
              },
              required: { type: "boolean", default: false },
              unique: { type: "boolean", default: false },
              default_value: { type: "string" },
              relation: {
                type: "object",
                properties: {
                  model: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["one-to-one", "one-to-many", "many-to-many"]
                  }
                }
              }
            },
            required: ["name", "type"]
          },
          minItems: 1,
          description: "Model fields definition"
        },
        indexes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fields: {
                type: "array",
                items: { type: "string" }
              },
              unique: { type: "boolean", default: false }
            },
            required: ["fields"]
          },
          description: "Database indexes"
        }
      },
      required: ["name", "fields"]
    }
  },
  
  create_project_structure: {
    description: "Create complete project directory structure",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          pattern: "^[a-z][a-z0-9-]*$",
          description: "Project name in kebab-case"
        },
        framework: {
          type: "string",
          enum: ["vue3-typescript", "vue3-javascript"],
          default: "vue3-typescript"
        },
        backend: {
          type: "string",
          enum: ["express-typescript", "express-javascript"],
          default: "express-typescript"
        },
        database: {
          type: "string",
          enum: ["postgresql", "mysql", "sqlite"],
          default: "postgresql"
        },
        features: {
          type: "array",
          items: {
            type: "string",
            enum: ["auth", "payments", "websockets", "email", "storage"]
          }
        }
      },
      required: ["name"]
    }
  }
};

// Connect to ADE WebSocket
function connectWebSocket() {
  process.stderr.write(`Connecting to ADE WebSocket: ${ADE_WS_URL}\n`);
  
  ws = new WebSocket(ADE_WS_URL);
  
  ws.on('open', () => {
    process.stderr.write('WebSocket connected\n');
    isConnected = true;
    
    // Register as clean MCP server
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'agent_connect',
          agentId: 'MCP_CLEAN',
          capabilities: ['component_generation', 'api_generation', 'deployment'],
          metadata: {
            version: '3.0.0',
            type: 'clean_mcp_server'
          }
        }));
      }
    }, 100);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      process.stderr.write(`Received: ${message.type}\n`);
    } catch (e) {
      process.stderr.write(`Message parse error: ${e.message}\n`);
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

// MCP Request handling
function handleMCPRequest(request) {
  const { method, params, id } = request;
  
  switch (method) {
    case 'initialize':
      connectWebSocket();
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'ade-clean-mcp',
          version: '3.0.0'
        }
      });
      break;
      
    case 'tools/list':
      sendResponse(id, {
        tools: Object.entries(tools).map(([name, config]) => ({
          name,
          description: config.description,
          inputSchema: config.inputSchema
        }))
      });
      break;
      
    case 'tools/call':
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
}

// Tool execution
function handleToolCall(tool, args, id) {
  switch (tool) {
    case 'get_status':
      sendResponse(id, {
        content: [{
          type: 'text',
          text: JSON.stringify({
            connected: isConnected,
            active_agents: 0,
            pending_tasks: 0
          }, null, 2)
        }]
      });
      break;
      
    case 'send_message':
      if (ws && isConnected) {
        ws.send(JSON.stringify({
          type: 'progress_update',
          message: args.message,
          phase: args.phase,
          progress: args.progress || 0
        }));
        sendResponse(id, {
          content: [{
            type: 'text',
            text: 'Message sent successfully'
          }]
        });
      } else {
        sendError(id, -32603, 'WebSocket not connected');
      }
      break;
      
    case 'generate_vue_component':
      const component = generateVueComponent(args);
      sendResponse(id, {
        content: [{
          type: 'text',
          text: component
        }]
      });
      break;
      
    case 'generate_api_endpoint':
      const endpoint = generateAPIEndpoint(args);
      sendResponse(id, {
        content: [{
          type: 'text',
          text: endpoint
        }]
      });
      break;
      
    case 'create_database_model':
      const model = generateDatabaseModel(args);
      sendResponse(id, {
        content: [{
          type: 'text',
          text: model
        }]
      });
      break;
      
    case 'create_project_structure':
      const structure = createProjectStructure(args);
      sendResponse(id, {
        content: [{
          type: 'text',
          text: JSON.stringify(structure, null, 2)
        }]
      });
      break;
      
    default:
      sendError(id, -32601, `Unknown tool: ${tool}`);
  }
}

// Component generation functions
function generateVueComponent(args) {
  const { name, type, props = [], children = [], styling = {} } = args;
  
  const propsSection = props.length > 0 ? `
interface Props {
${props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type}${p.default ? ` // default: ${p.default}` : ''}`).join('\n')}
}

const props = defineProps<Props>()` : '';

  const template = `<template>
  <div class="${name.toLowerCase()}-${type}">
    <h2>${name}</h2>
    ${children.map(child => `<${child} />`).join('\n    ')}
  </div>
</template>

<script setup lang="ts">
${propsSection}

// Component logic here
</script>

<style scoped>
.${name.toLowerCase()}-${type} {
  /* Styling based on theme: ${styling.theme || 'light'} */
  /* Size: ${styling.size || 'md'} */
  /* Variant: ${styling.variant || 'primary'} */
}
</style>`;

  return template;
}

function generateAPIEndpoint(args) {
  const { path, method, model, authentication = true, validation = {} } = args;
  
  return `// ${method} ${path}
router.${method.toLowerCase()}('${path}', ${authentication ? 'authenticate, ' : ''}async (req, res) => {
  try {
    // Validation
    ${validation.body ? `const body = validateBody(req.body);` : ''}
    ${validation.params ? `const params = validateParams(req.params);` : ''}
    ${validation.query ? `const query = validateQuery(req.query);` : ''}
    
    // ${model} logic here
    const result = await ${model}Service.${method.toLowerCase()}(req.body);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});`;
}

function generateDatabaseModel(args) {
  const { name, fields, indexes = [] } = args;
  
  return `model ${name} {
${fields.map(f => `  ${f.name} ${f.type}${f.required ? '' : '?'}${f.unique ? ' @unique' : ''}${f.default_value ? ` @default(${f.default_value})` : ''}`).join('\n')}
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
${indexes.map(idx => `  @@index([${idx.fields.join(', ')}]${idx.unique ? ', unique: true' : ''})`).join('\n')}
}`;
}

function createProjectStructure(args) {
  const { name, framework = 'vue3-typescript', backend = 'express-typescript', features = [] } = args;
  
  return {
    name,
    structure: {
      frontend: {
        framework,
        directories: ['src', 'public', 'components', 'views', 'stores', 'utils']
      },
      backend: {
        framework: backend,
        directories: ['src', 'routes', 'models', 'services', 'middleware', 'utils']
      },
      features,
      config_files: ['package.json', 'tsconfig.json', '.env.example', 'README.md']
    }
  };
}

// Response helpers
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

// MCP message handling
rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    if (!request || typeof request !== 'object') {
      throw new Error('Invalid request format');
    }
    if (request.id === undefined) {
      throw new Error('Missing request id');
    }
    handleMCPRequest(request);
  } catch (e) {
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error: ' + e.message
      }
    }));
  }
});

// Start
process.stderr.write('Clean ADE MCP Server v3.0.0 starting...\n');