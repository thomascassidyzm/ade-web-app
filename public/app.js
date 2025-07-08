class ADEClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.agents = new Map();
    this.vfsFiles = new Set();
    this.activityLog = [];
    this.init();
  }
  
  init() {
    this.connectWebSocket();
    this.setupEventListeners();
    this.startStatusPolling();
  }
  
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.connected = true;
      this.updateConnectionStatus('ws', 'Connected');
      this.updateMainStatus('Connected', 'connected');
      this.logActivity('system', 'WebSocket connected');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Message parse error:', error);
      }
    };
    
    this.ws.onclose = () => {
      this.connected = false;
      this.updateConnectionStatus('ws', 'Disconnected');
      this.updateMainStatus('Disconnected', 'error');
      this.logActivity('system', 'WebSocket disconnected');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('ws', 'Error');
      this.logActivity('system', 'Connection error');
    };
  }
  
  setupEventListeners() {
    const submitBtn = document.getElementById('submit-btn');
    const descriptionInput = document.getElementById('app-description');
    
    submitBtn.addEventListener('click', () => {
      const description = descriptionInput.value.trim();
      if (description && this.connected) {
        this.sendDescription(description);
      }
    });
    
    descriptionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        submitBtn.click();
      }
    });
  }
  
  sendDescription(description) {
    const message = {
      type: 'app_description',
      description: description,
      timestamp: new Date().toISOString()
    };
    
    this.ws.send(JSON.stringify(message));
    this.logActivity('user', `Sent: "${description}"`);
  }
  
  handleMessage(data) {
    this.logActivity('message', `${data.type}: ${JSON.stringify(data).substring(0, 100)}...`);
    
    switch(data.type) {
      case 'worker_created':
        this.addAgent(data);
        break;
      case 'vfs_write':
        this.updateVFS(data.content.path);
        break;
      case 'agent_status':
        this.updateAgentStatus(data.agentId, data.status);
        break;
      case 'mcp_connected':
        this.updateConnectionStatus('mcp', 'Connected');
        break;
      case 'orch_connected':
        this.updateConnectionStatus('orch', 'Connected');
        break;
      default:
        console.log('Unhandled message type:', data.type);
    }
  }
  
  addAgent(agentData) {
    this.agents.set(agentData.agentId, agentData);
    this.renderAgents();
    this.logActivity('agent', `Spawned ${agentData.agentType} agent: ${agentData.agentId}`);
  }
  
  updateAgentStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.renderAgents();
      this.logActivity('agent', `${agentId} status: ${status}`);
    }
  }
  
  updateVFS(path) {
    this.vfsFiles.add(path);
    this.renderVFS();
    this.logActivity('vfs', `File written: ${path}`);
  }
  
  renderAgents() {
    const container = document.getElementById('agents-list');
    
    if (this.agents.size === 0) {
      container.innerHTML = '<p class="empty-state">No agents active</p>';
      return;
    }
    
    container.innerHTML = Array.from(this.agents.values())
      .map(agent => `
        <div class="agent-item">
          <div class="agent-name">${agent.agentType} (${agent.agentId})</div>
          <div class="agent-status">Status: ${agent.status}</div>
        </div>
      `).join('');
  }
  
  renderVFS() {
    const container = document.getElementById('vfs-browser');
    
    if (this.vfsFiles.size === 0) {
      container.innerHTML = '<p class="empty-state">No files yet</p>';
      return;
    }
    
    // Group files by directory
    const tree = {};
    this.vfsFiles.forEach(path => {
      const parts = path.split('/');
      let current = tree;
      parts.forEach((part, i) => {
        if (i === parts.length - 1) {
          current[part] = 'file';
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });
    
    container.innerHTML = this.renderTree(tree);
  }
  
  renderTree(tree, level = 0) {
    return Object.entries(tree)
      .map(([name, value]) => {
        if (value === 'file') {
          return `<div class="vfs-item vfs-file" style="padding-left: ${level * 20}px">📄 ${name}</div>`;
        } else {
          return `
            <div class="vfs-item vfs-folder" style="padding-left: ${level * 20}px">📁 ${name}/</div>
            ${this.renderTree(value, level + 1)}
          `;
        }
      }).join('');
  }
  
  logActivity(type, message) {
    const entry = {
      time: new Date().toLocaleTimeString(),
      type,
      message
    };
    
    this.activityLog.push(entry);
    
    const container = document.getElementById('activity-messages');
    const entryEl = document.createElement('div');
    entryEl.className = 'activity-entry';
    entryEl.innerHTML = `
      <span class="activity-time">${entry.time}</span>
      <span class="activity-type ${type}">${type.toUpperCase()}</span>
      <span class="activity-message">${message}</span>
    `;
    
    container.appendChild(entryEl);
    container.scrollTop = container.scrollHeight;
  }
  
  updateConnectionStatus(service, status) {
    const element = document.getElementById(`${service}-status`);
    if (element) {
      element.textContent = status;
      element.className = `conn-status ${status === 'Connected' ? 'connected' : 'disconnected'}`;
    }
  }
  
  updateMainStatus(text, state) {
    const dot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    statusText.textContent = text;
    dot.className = `status-dot ${state}`;
  }
  
  async startStatusPolling() {
    setInterval(async () => {
      if (this.connected) {
        try {
          const response = await fetch('/api/status');
          const data = await response.json();
          
          // Check MCP/Railway connection
          if (data.connections > 0) {
            this.updateConnectionStatus('mcp', 'Connected');
          }
          
          // Fetch agents
          const agentsResponse = await fetch('/api/agents');
          const agentsData = await agentsResponse.json();
          
          if (agentsData.agents) {
            agentsData.agents.forEach(agent => {
              if (!this.agents.has(agent.id)) {
                this.addAgent({
                  agentId: agent.id,
                  agentType: agent.type,
                  status: agent.status
                });
              }
            });
          }
          
          // Fetch VFS files
          const vfsResponse = await fetch('/api/vfs/list/');
          const vfsData = await vfsResponse.json();
          
          if (vfsData.files) {
            vfsData.files.forEach(file => this.vfsFiles.add(file));
            this.renderVFS();
          }
        } catch (error) {
          console.error('Status polling error:', error);
        }
      }
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adeClient = new ADEClient();
});