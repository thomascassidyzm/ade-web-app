class WorkQueue {
  constructor() {
    this.tasks = new Map();
    this.completedTasks = new Map();
    this.taskCounter = 0;
  }

  // Add a new task to the queue
  addTask(task) {
    const taskId = `TASK_${++this.taskCounter}_${Date.now()}`;
    const taskEntry = {
      id: taskId,
      type: task.type || 'general',
      priority: task.priority || 'medium',
      title: task.title,
      description: task.description,
      spec: task.spec || null,
      requirements: task.requirements || {},
      dependencies: task.dependencies || [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      claimedBy: null,
      claimedAt: null,
      completedAt: null,
      result: null
    };
    
    this.tasks.set(taskId, taskEntry);
    console.log(`[WorkQueue] Added task ${taskId} of type ${task.type}`);
    return taskEntry;
  }

  // Get available tasks for polling agents
  getTasks(agentType = null) {
    const availableTasks = [];
    
    for (const [id, task] of this.tasks.entries()) {
      // Check if task is available (not claimed or timed out)
      if (task.status === 'pending' || 
          (task.status === 'claimed' && this.isTaskTimedOut(task))) {
        
        // Check if task matches agent type
        if (!agentType || task.type === agentType || task.type === 'general') {
          // Check dependencies
          if (this.areDependenciesComplete(task)) {
            availableTasks.push({
              id: task.id,
              type: task.type,
              priority: task.priority,
              title: task.title,
              description: task.description,
              requirements: task.requirements
            });
          }
        }
      }
    }
    
    // Sort by priority then creation time
    return availableTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  // Claim a specific task
  claimTask(taskId, agentId) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      console.log(`[WorkQueue] Task ${taskId} not found`);
      return null;
    }
    
    if (task.status !== 'pending') {
      console.log(`[WorkQueue] Task ${taskId} already ${task.status}`);
      return null;
    }
    
    task.status = 'claimed';
    task.claimedBy = agentId;
    task.claimedAt = new Date().toISOString();
    
    console.log(`[WorkQueue] Task ${taskId} claimed by ${agentId}`);
    return task;
  }

  // Claim next available task of a specific type
  claimNextTask(type, agentId) {
    const availableTasks = this.getTasks(type, 'pending');
    
    if (availableTasks.length === 0) {
      console.log(`[WorkQueue] No pending ${type} tasks available`);
      return null;
    }
    
    const task = availableTasks[0];
    return this.claimTask(task.id, agentId);
  }

  // Complete a task with results
  completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      console.log(`[WorkQueue] Task ${taskId} not found`);
      return null;
    }
    
    if (task.status !== 'claimed') {
      console.log(`[WorkQueue] Task ${taskId} not in claimed state`);
      return null;
    }
    
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;
    
    // Move to completed tasks
    this.completedTasks.set(taskId, task);
    this.tasks.delete(taskId);
    
    console.log(`[WorkQueue] Task ${taskId} completed`);
    return task;
  }

  // Check if a task has timed out (15 minutes)
  isTaskTimedOut(task) {
    if (task.status !== 'claimed' || !task.claimedAt) {
      return false;
    }
    
    const claimedTime = new Date(task.claimedAt).getTime();
    const currentTime = new Date().getTime();
    const timeoutMs = 15 * 60 * 1000; // 15 minutes
    
    return (currentTime - claimedTime) > timeoutMs;
  }

  // Check if all dependencies are complete
  areDependenciesComplete(task) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    
    for (const depId of task.dependencies) {
      if (!this.completedTasks.has(depId)) {
        return false;
      }
    }
    
    return true;
  }

  // Get task by ID
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  // Get queue statistics
  getStats() {
    let pending = 0;
    let claimed = 0;
    let timedOut = 0;
    
    for (const task of this.tasks.values()) {
      if (task.status === 'pending') {
        pending++;
      } else if (task.status === 'claimed') {
        if (this.isTaskTimedOut(task)) {
          timedOut++;
        } else {
          claimed++;
        }
      }
    }
    
    return {
      pending,
      claimed,
      completed: this.completedTasks.size,
      timedOut,
      total: pending + claimed + this.completedTasks.size,
      byType: {
        architect: this.countByType('architect'),
        designer: this.countByType('designer'),
        frontend: this.countByType('frontend'),
        backend: this.countByType('backend'),
        database: this.countByType('database'),
        tester: this.countByType('tester'),
        deployer: this.countByType('deployer')
      }
    };
  }

  // Count tasks by type
  countByType(type) {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.type === type) count++;
    }
    for (const task of this.completedTasks.values()) {
      if (task.type === type) count++;
    }
    return count;
  }

  // Create specialized tasks for building an application
  createBuildTasks(appDescription) {
    const tasks = [];
    
    // 1. Architecture & Planning
    const archTask = this.addTask({
      type: 'architect',
      priority: 'high',
      title: 'System Architecture Design',
      description: 'Design system architecture and create technical specifications',
      requirements: {
        appDescription,
        deliverables: ['system-design.apml', 'tech-stack.json', 'api-spec.yaml']
      }
    });
    tasks.push(archTask);
    
    // 2. UI/UX Design
    const designTask = this.addTask({
      type: 'designer',
      priority: 'high',
      title: 'UI/UX Design',
      description: 'Create UI designs and component specifications',
      requirements: {
        appDescription,
        deliverables: ['wireframes.apml', 'design-system.json', 'components-spec.apml']
      },
      dependencies: [archTask.id]
    });
    tasks.push(designTask);
    
    // 3. Frontend Development
    const frontendTask = this.addTask({
      type: 'frontend',
      priority: 'medium',
      title: 'Frontend Implementation',
      description: 'Implement frontend components and user interface',
      requirements: {
        framework: 'vue',
        deliverables: ['components/', 'views/', 'stores/']
      },
      dependencies: [designTask.id]
    });
    tasks.push(frontendTask);
    
    // 4. Backend Development
    const backendTask = this.addTask({
      type: 'backend',
      priority: 'medium',
      title: 'Backend API Development',
      description: 'Implement API endpoints and business logic',
      requirements: {
        framework: 'express',
        deliverables: ['api/', 'services/', 'models/']
      },
      dependencies: [archTask.id]
    });
    tasks.push(backendTask);
    
    // 5. Database Setup
    const dbTask = this.addTask({
      type: 'database',
      priority: 'medium',
      title: 'Database Design',
      description: 'Design database schema and setup migrations',
      requirements: {
        database: 'postgresql',
        deliverables: ['schema.sql', 'migrations/', 'seeds/']
      },
      dependencies: [archTask.id]
    });
    tasks.push(dbTask);
    
    // 6. Integration Testing
    const testTask = this.addTask({
      type: 'tester',
      priority: 'low',
      title: 'Integration Testing',
      description: 'Create integration tests and ensure all components work together',
      requirements: {
        deliverables: ['tests/', 'test-report.json']
      },
      dependencies: [frontendTask.id, backendTask.id]
    });
    tasks.push(testTask);
    
    // 7. Deployment
    const deployTask = this.addTask({
      type: 'deployer',
      priority: 'low',
      title: 'Production Deployment',
      description: 'Deploy application to production',
      requirements: {
        platform: 'railway',
        deliverables: ['deployment-config.json', 'live-url.txt']
      },
      dependencies: [testTask.id]
    });
    tasks.push(deployTask);
    
    console.log(`[WorkQueue] Created ${tasks.length} build tasks for: ${appDescription}`);
    return tasks;
  }
}

module.exports = WorkQueue;