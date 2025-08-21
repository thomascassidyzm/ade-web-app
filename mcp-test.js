const { spawn } = require('child_process');

// Start the MCP server process
const mcpServer = spawn('node', ['mcp-ade-core.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send analyze_request tool call
const analyzeRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "analyze_request",
    arguments: {
      message: "I need to build a health app that acts like a diagnostic tool for neuro and bio health",
      current_apml: {}
    }
  }
};

mcpServer.stdin.write(JSON.stringify(analyzeRequest) + '\n');

mcpServer.stdout.on('data', (data) => {
  console.log('MCP Response:', data.toString());
});

mcpServer.stderr.on('data', (data) => {
  console.log('MCP Server:', data.toString());
});

setTimeout(() => {
  mcpServer.kill();
}, 3000);