#!/bin/bash
# claim-task.sh - Simple task claimer without jq

TYPE=$1
AGENT_ID="${TYPE}_$(date +%s)"

echo "Claiming $TYPE task as $AGENT_ID"

# Get first pending task
TASK=$(curl -s "http://localhost:3001/api/queue/tasks/$TYPE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TASK" ]; then
  echo "No pending $TYPE tasks"
  exit 1
fi

echo "Found task: $TASK"

# Claim it
RESULT=$(curl -s -X POST http://localhost:3001/api/queue/claim \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK\",\"agentId\":\"$AGENT_ID\"}")

echo "$RESULT"
echo ""
echo "Task claimed! Implement it, then run:"
echo "./complete-task.sh $TASK"