#!/bin/bash
# Update coordination.apml when claiming/completing tasks

ACTION=$1  # claim/complete/block
TASK_ID=$2
AGENT=$3

echo "Updating coordination status: $ACTION $TASK_ID by $AGENT"
echo "Agents should check /specs/coordination.apml before starting work"
