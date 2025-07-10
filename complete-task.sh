#!/bin/bash
# complete-task.sh - Mark task complete

TASK_ID=$1
RESULT=${2:-"completed"}

curl -X POST http://localhost:3001/api/queue/complete \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK_ID\",\"result\":\"$RESULT\"}"

echo "Task $TASK_ID marked complete"