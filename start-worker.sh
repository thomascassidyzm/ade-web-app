#!/bin/bash
# start-worker.sh - Initialize Claude Code worker with MCP

WORKER_TYPE=${1:-""}
if [ -z "$WORKER_TYPE" ]; then
  echo "=== ADE Worker Agent Setup ==="
  echo "What type of worker are you?"
  echo "Options: frontend, backend, architect, designer, database, tester, deployer"
  read WORKER_TYPE
fi

WORKER_ID="${WORKER_TYPE}_$(date +%s)"

echo ""
echo "🚀 Starting ADE $WORKER_TYPE Worker"
echo "Worker ID: $WORKER_ID"
echo ""
echo "This worker will:"
echo "1. Poll for $WORKER_TYPE tasks from ADE"
echo "2. Use VFS for all outputs"
echo "3. Coordinate through the work queue"
echo ""
echo "Starting Claude Code with MCP orchestrator..."
echo "Use these commands in Claude Code:"
echo "- Poll for tasks: curl https://ade-web-app-production.up.railway.app/api/queue/tasks/$WORKER_TYPE"
echo "- Use MCP tools: vfs_write, vfs_read, generate_component, etc."
echo ""

# Set environment variables
export WORKER_TYPE=$WORKER_TYPE
export WORKER_ID=$WORKER_ID
export ADE_WS_URL="wss://ade-web-app-production.up.railway.app"
export ADE_HTTP_URL="https://ade-web-app-production.up.railway.app"

# Start with MCP if available
if command -v claude-code &> /dev/null; then
  claude-code --mcp mcp-orchestrator.js
else
  echo "Claude Code not found in PATH. Start it manually with:"
  echo "claude-code --mcp mcp-orchestrator.js"
fi