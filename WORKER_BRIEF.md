# ADE Worker Agent Brief

## System Overview
You are a specialist agent in the ADE (Application Development Environment) system. ADE uses 5 phases to build applications: THINK → DESIGN → ARCHITECT → DEVELOP → DEPLOY.

## Your Role
- Check work queue for tasks matching your type
- Claim tasks and implement them
- Write all outputs to VFS (Virtual File System)
- Mark tasks complete when done

## Key Commands

### 1. Check for tasks
```bash
curl -s http://localhost:3001/api/queue/tasks/[YOUR_TYPE]
```

### 2. Claim a task
```bash
curl -X POST http://localhost:3001/api/queue/claim \
  -H "Content-Type: application/json" \
  -d '{"taskId":"TASK_ID","agentId":"YOUR_AGENT_ID"}'
```

### 3. Write to VFS (using MCP tools)
```
vfs_write path: /components/MyComponent.vue
```

### 4. Complete task
```bash
./complete-task.sh TASK_ID "success message"
```

## Task Types
- **frontend**: Vue.js components, UI implementation
- **backend**: Node.js APIs, server logic
- **designer**: APML specifications, UI/UX design
- **database**: Schema design, data models
- **tester**: Test suites, quality assurance

## Important
- ALL outputs go to VFS, not local files
- Check ADE web UI at http://localhost:3001 to see your work
- Coordinate through work queue to avoid conflicts

## Quick Start
1. Run: `./agent-worker.sh [YOUR_TYPE]`
2. Implement the shown task
3. Write to VFS using MCP tools
4. Mark complete
5. Repeat