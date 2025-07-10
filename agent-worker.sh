#!/bin/bash
# agent-worker.sh - Run in Claude Code terminals

AGENT_TYPE=$1
AGENT_ID="${AGENT_TYPE}_$(date +%s)"

echo "Starting $AGENT_ID worker"

while true; do
  # Check for tasks
  TASKS=$(curl -s http://localhost:3001/api/queue/tasks/$AGENT_TYPE)
  PENDING=$(echo $TASKS | jq -r '.[] | select(.status=="pending") | .id' | head -1)
  
  if [ ! -z "$PENDING" ]; then
    echo "Claiming task: $PENDING"
    
    # Claim task
    CLAIM=$(curl -s -X POST http://localhost:3001/api/queue/claim \
      -H "Content-Type: application/json" \
      -d "{\"taskId\":\"$PENDING\",\"agentId\":\"$AGENT_ID\"}")
    
    # Extract task details
    TITLE=$(echo $CLAIM | jq -r '.title')
    DESC=$(echo $CLAIM | jq -r '.description')
    
    echo "Working on: $TITLE"
    echo "Task: $DESC"
    echo "---"
    echo "Claude Code: Please implement this task"
    echo "Save files locally or to VFS as specified"
    echo "When complete, run: ./complete-task.sh $PENDING 'success'"
    
    # Wait for completion
    break
  fi
  
  sleep 10
done