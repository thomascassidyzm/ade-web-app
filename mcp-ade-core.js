#!/usr/bin/env node
/**
 * ADE Core MCP Server - Single agent app building through conversation
 * Uses APML as source of truth, real-time visualization updates
 */

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

// Global state
let appState = {
  apml: {},
  conversation: [],
  patterns: [],
  phase: 'behavior',
  designs: {}
};

// Set up readline for MCP
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Tool definitions for ADE Core capabilities
const tools = {
  // 1. Conversational App Building
  analyze_request: {
    description: "Parse user request and identify app patterns needed",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "User's message" },
        current_apml: { type: "object", description: "Current APML state" }
      },
      required: ["message"]
    }
  },
  
  generate_apml: {
    description: "Generate/update APML from user requirements in real-time",
    inputSchema: {
      type: "object",
      properties: {
        requirements: { type: "string", description: "User requirements" },
        app_type: { type: "string", description: "Detected app type" },
        existing_apml: { type: "object", description: "Current APML to update" }
      },
      required: ["requirements"]
    }
  },
  
  update_visualization: {
    description: "Update Mermaid diagram and simulator from APML",
    inputSchema: {
      type: "object",
      properties: {
        apml: { type: "object", description: "APML to visualize" },
        update_type: { type: "string", enum: ["mermaid", "simulator", "both"] }
      },
      required: ["apml"]
    }
  },
  
  // 2. APML Pattern Management
  load_patterns: {
    description: "Load relevant APML patterns based on keywords",
    inputSchema: {
      type: "object",
      properties: {
        keywords: { type: "array", items: { type: "string" } },
        app_type: { type: "string" }
      },
      required: ["keywords"]
    }
  },
  
  combine_patterns: {
    description: "Merge patterns into cohesive app structure",
    inputSchema: {
      type: "object",
      properties: {
        patterns: { type: "array", description: "Patterns to combine" },
        user_requirements: { type: "string" }
      },
      required: ["patterns"]
    }
  },
  
  // 3. Phase 1: Behavior Mode
  render_mermaid: {
    description: "Generate Mermaid diagram from APML showing app flow",
    inputSchema: {
      type: "object",
      properties: {
        apml: { type: "object", description: "APML structure" },
        focus: { type: "string", description: "Focus area: screens, flows, or overview" }
      },
      required: ["apml"]
    }
  },
  
  simulate_flow: {
    description: "Show message choreography for user actions (user→app→app→user)",
    inputSchema: {
      type: "object",
      properties: {
        apml: { type: "object" },
        user_action: { type: "string", description: "Action to simulate" }
      },
      required: ["apml", "user_action"]
    }
  },
  
  validate_behavior: {
    description: "Check APML for completeness and consistency",
    inputSchema: {
      type: "object",
      properties: {
        apml: { type: "object" }
      },
      required: ["apml"]
    }
  },
  
  // 4. Phase 2: Design Mode
  generate_designs: {
    description: "Create A/B design options from same APML",
    inputSchema: {
      type: "object",
      properties: {
        apml: { type: "object" },
        design_preferences: { type: "string", description: "User preferences" }
      },
      required: ["apml"]
    }
  },
  
  // 5. Code Generation
  compile_to_vue: {
    description: "Generate complete Vue.js app from APML",
    inputSchema: {
      type: "object",
      properties: {
        apml: { type: "object" },
        design_tokens: { type: "object", description: "Chosen design system" }
      },
      required: ["apml"]
    }
  },
  
  // 6. Session Management
  save_session: {
    description: "Persist APML and conversation to client storage",
    inputSchema: {
      type: "object",
      properties: {
        session_data: { type: "object", description: "Complete session state" }
      },
      required: ["session_data"]
    }
  },
  
  restore_session: {
    description: "Continue previous app building session",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" }
      },
      required: ["session_id"]
    }
  }
};

// Resource definitions
const resources = {
  "session://current": {
    description: "Current app building session state",
    mimeType: "application/json"
  },
  "apml://current": {
    description: "Current APML document being built",
    mimeType: "application/yaml"
  },
  "patterns://library": {
    description: "Available APML patterns",
    mimeType: "application/json"
  }
};

// MCP Protocol handlers
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
    error: { code: code, message: message }
  }));
}

// Tool execution handlers
async function executeAnalyzeRequest(parameters) {
  const { message, current_apml = {} } = parameters;
  
  // Simple keyword detection for app patterns
  const keywords = [];
  const text = message.toLowerCase();
  
  // Detect app types
  if (text.includes('health') || text.includes('medical') || text.includes('wellness')) {
    keywords.push('health', 'tracking', 'assessment');
  }
  if (text.includes('social') || text.includes('message') || text.includes('chat')) {
    keywords.push('social', 'messaging', 'friends');
  }
  if (text.includes('shop') || text.includes('store') || text.includes('buy')) {
    keywords.push('ecommerce', 'cart', 'payment');
  }
  if (text.includes('task') || text.includes('todo') || text.includes('manage')) {
    keywords.push('productivity', 'tasks', 'lists');
  }
  
  return {
    keywords,
    app_type: keywords[0] || 'generic',
    suggested_patterns: keywords.slice(0, 3),
    confidence: keywords.length > 0 ? 0.8 : 0.3
  };
}

async function executeGenerateApml(parameters) {
  const { requirements, app_type, existing_apml = {} } = parameters;
  
  // Generate basic APML structure based on requirements
  const apml = {
    apml_version: "1.0",
    metadata: {
      title: extractAppName(requirements) || "New App",
      author: "ADE",
      created: new Date().toISOString(),
      app_type: app_type || "generic"
    },
    screens: generateScreens(requirements, app_type),
    flows: generateFlows(requirements, app_type),
    ...existing_apml
  };
  
  return { apml, updated: true };
}

async function executeUpdateVisualization(parameters) {
  const { apml, update_type = "both" } = parameters;
  
  const updates = {};
  
  if (update_type === "mermaid" || update_type === "both") {
    updates.mermaid = generateMermaidFromApml(apml);
  }
  
  if (update_type === "simulator" || update_type === "both") {
    updates.simulator = generateSimulatorFromApml(apml);
  }
  
  return updates;
}

// Helper functions
function extractAppName(text) {
  // Simple name extraction
  const matches = text.match(/app called (\w+)|(\w+) app/i);
  return matches ? (matches[1] || matches[2]) : null;
}

function generateScreens(requirements, app_type) {
  const screens = [];
  const text = requirements.toLowerCase();
  
  // Universal screens
  screens.push(
    { name: "welcome", type: "onboarding" },
    { name: "signin", type: "auth" },
    { name: "home", type: "main" }
  );
  
  // App-specific screens based on type
  if (app_type === 'health') {
    screens.push(
      { name: "assessment", type: "form" },
      { name: "results", type: "display" },
      { name: "recommendations", type: "list" }
    );
  }
  
  if (text.includes('chat') || text.includes('message')) {
    screens.push({ name: "chat", type: "messaging" });
  }
  
  return screens;
}

function generateFlows(requirements, app_type) {
  return [
    {
      name: "onboarding_flow",
      steps: [
        { from: "welcome", to: "signin", trigger: "get_started" },
        { from: "signin", to: "home", trigger: "auth_success" }
      ]
    }
  ];
}

function generateMermaidFromApml(apml) {
  if (!apml.screens) return "graph TD\n  A[Start] --> B[Building...]";
  
  let mermaid = "graph TD\n";
  
  // Add screens as nodes
  apml.screens.forEach((screen, index) => {
    const nodeId = String.fromCharCode(65 + index);
    mermaid += `  ${nodeId}[${screen.name.charAt(0).toUpperCase() + screen.name.slice(1)}]\n`;
  });
  
  // Add basic connections
  if (apml.screens.length > 1) {
    for (let i = 0; i < apml.screens.length - 1; i++) {
      const fromId = String.fromCharCode(65 + i);
      const toId = String.fromCharCode(65 + i + 1);
      mermaid += `  ${fromId} --> ${toId}\n`;
    }
  }
  
  return mermaid;
}

function generateSimulatorFromApml(apml) {
  return {
    current_screen: apml.screens?.[0]?.name || "welcome",
    available_actions: ["tap", "swipe", "input"],
    ui_elements: apml.screens?.[0] || { name: "welcome", type: "onboarding" }
  };
}

// Main message handler
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    switch (request.method) {
      case 'initialize':
        sendResponse(request.id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'ADE Core MCP Server',
            version: '1.0.0'
          }
        });
        break;
        
      case 'tools/list':
        sendResponse(request.id, { tools: Object.entries(tools).map(([name, def]) => ({ name, ...def })) });
        break;
        
      case 'tools/call':
        const { name, arguments: args } = request.params;
        let result;
        
        switch (name) {
          case 'analyze_request':
            result = await executeAnalyzeRequest(args);
            break;
          case 'generate_apml':
            result = await executeGenerateApml(args);
            break;
          case 'update_visualization':
            result = await executeUpdateVisualization(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        sendResponse(request.id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
        break;
        
      case 'resources/list':
        sendResponse(request.id, { resources: Object.entries(resources).map(([uri, def]) => ({ uri, ...def })) });
        break;
        
      default:
        sendError(request.id, -32601, `Method not found: ${request.method}`);
    }
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    if (request?.id) {
      sendError(request.id, -32603, error.message);
    }
  }
});

process.stderr.write('🚀 ADE Core MCP Server ready\n');
process.stderr.write('💬 Single-agent conversational app building\n');
process.stderr.write('🎯 Real-time APML crystallization\n');