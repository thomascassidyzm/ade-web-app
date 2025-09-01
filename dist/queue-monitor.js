// Work Queue Monitor
class QueueMonitor {
  constructor(container) {
    this.container = container;
    this.refresh();
    setInterval(() => this.refresh(), 1000);
  }
  
  async refresh() {
    try {
      const response = await fetch('/api/queue/tasks');
      const tasks = await response.json();
      this.render(tasks);
    } catch (error) {
      console.error('Queue refresh error:', error);
    }
  }
  
  render(tasks) {
    const stats = {
      pending: tasks.filter(t => t.status === 'pending').length,
      claimed: tasks.filter(t => t.status === 'claimed').length,
      completed: tasks.filter(t => t.status === 'completed').length
    };
    
    this.container.innerHTML = `
      <h3>Work Queue</h3>
      <div style="margin-bottom: 10px">
        <span style="color: #ffaa00">⏳ ${stats.pending}</span>
        <span style="color: #00aaff; margin-left: 10px">🔧 ${stats.claimed}</span>
        <span style="color: #00ff88; margin-left: 10px">✓ ${stats.completed}</span>
      </div>
      <ul style="list-style: none; padding: 0; font-size: 12px">
        ${tasks.slice(-5).reverse().map(task => `
          <li style="margin: 5px 0; padding: 5px; background: #2a2a2a; border-radius: 3px">
            <div>${task.title}</div>
            <div style="color: ${
              task.status === 'completed' ? '#00ff88' : 
              task.status === 'claimed' ? '#00aaff' : '#888'
            }">${task.status} - ${task.type}</div>
          </li>
        `).join('')}
      </ul>
    `;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: 20px;
    top: 100px;
    width: 280px;
    background: #1a1a1a;
    border: 1px solid #00ff88;
    padding: 15px;
    border-radius: 8px;
    color: #00ff88;
    font-family: monospace;
    font-size: 14px;
    z-index: 1000;
  `;
  document.body.appendChild(container);
  
  window.queueMonitor = new QueueMonitor(container);
});
