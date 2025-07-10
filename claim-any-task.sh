#!/bin/bash
# claim-any-task.sh - Claims ANY pending task regardless of type

AGENT_ID="agent_$(date +%s)"

echo "Claiming any available task as $AGENT_ID"

# Get first pending task of any type
TASK=$(curl -s "http://localhost:3001/api/queue/tasks" | grep -o '"id":"[^"]*","type":"[^"]*","title":"[^"]*","description":"[^"]*","spec":[^,]*,"status":"pending"' | head -1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TASK" ]; then
  echo "No pending tasks"
  exit 1
fi

echo "Found task: $TASK"

# Claim it
curl -s -X POST http://localhost:3001/api/queue/claim \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK\",\"agentId\":\"$AGENT_ID\"}"

echo ""
echo "Task claimed! Complete with: ./complete-task.sh $TASK"