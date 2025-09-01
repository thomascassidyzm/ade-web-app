class ADEApp {
  constructor() {
    this.ws = null;
    this.currentPhase = 'specify';
    this.connected = false;
    this.init();
  }

  init() {
    this.connectWebSocket();
    this.setupEventListeners();
    this.initializePhaseUI();
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.updateConnectionStatus('connecting');
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.connected = true;
      console.log('Connected to ADE server');
      this.updateConnectionStatus('connected');
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
      this.updateConnectionStatus('disconnected');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('error');
    };
  }

  setupEventListeners() {
    // Start Building button
    const startBtn = document.getElementById('start-building');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startBuilding());
    }

    // Feature chips
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', (e) => this.toggleFeature(e.target));
    });

    // Phase navigation
    document.querySelectorAll('.phase-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const phase = e.currentTarget.dataset.phase;
        if (this.canNavigateToPhase(phase)) {
          this.navigateToPhase(phase);
        }
      });
    });

    // Eye test choices
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const choice = e.currentTarget.dataset.choice;
        this.selectDesignChoice(choice);
      });
    });
  }

  initializePhaseUI() {
    // Initialize with SPECIFY phase
    this.showPhase('specify');
  }

  startBuilding() {
    const description = document.getElementById('app-description').value.trim();
    if (!description) {
      alert('Please describe your app idea first');
      return;
    }

    // Get selected features
    const selectedFeatures = Array.from(document.querySelectorAll('.chip.selected'))
      .map(chip => chip.textContent.trim());

    // Send to server
    this.ws.send(JSON.stringify({
      type: 'app_description',
      description: description,
      features: selectedFeatures,
      timestamp: new Date().toISOString()
    }));

    // Add to chat
    this.addChatMessage('user', description);
    
    // Update UI
    document.getElementById('start-building').disabled = true;
    document.getElementById('start-building').textContent = 'Processing...';
  }

  toggleFeature(chip) {
    chip.classList.toggle('selected');
    if (chip.classList.contains('selected')) {
      chip.style.background = 'var(--primary)';
      chip.style.color = 'white';
      chip.style.borderColor = 'var(--primary)';
    } else {
      chip.style.background = '';
      chip.style.color = '';
      chip.style.borderColor = '';
    }
  }

  handleMessage(data) {
    switch(data.type) {
      case 'phase_update':
        this.updatePhase(data.phase);
        break;
        
      case 'apml_from_orch':
        this.displayOrchMessage(data.content);
        break;
        
      case 'visualization_ready':
        this.showVisualization(data.content);
        break;
        
      case 'agent_progress':
        this.updateAgentProgress(data);
        break;
        
      case 'build_complete':
        this.onBuildComplete(data);
        break;
        
      case 'eyetest_item':
        this.showEyeTestItem(data);
        break;
        
      case 'deployment_ready':
        this.showDeployment(data);
        break;
    }
  }

  displayOrchMessage(content) {
    const message = content.message || JSON.stringify(content);
    this.addChatMessage('orch', message);
  }

  addChatMessage(sender, message) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    // Remove welcome message
    const welcome = container.querySelector('.chat-welcome');
    if (welcome) welcome.remove();
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${sender}`;
    messageEl.innerHTML = sender === 'user' 
      ? message 
      : this.formatOrchMessage(message);
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
  }

  formatOrchMessage(message) {
    // Convert markdown-style formatting
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '&bull; ');
  }
  
  updateConnectionStatus(status) {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    
    const statusText = statusEl.querySelector('.status-text');
    
    switch(status) {
      case 'connecting':
        statusEl.className = 'connection-status';
        statusText.textContent = 'Connecting...';
        break;
      case 'connected':
        statusEl.className = 'connection-status connected';
        statusText.textContent = 'Ready';
        break;
      case 'disconnected':
        statusEl.className = 'connection-status';
        statusText.textContent = 'Reconnecting...';
        break;
      case 'error':
        statusEl.className = 'connection-status';
        statusText.textContent = 'Connection error';
        break;
    }
  }

  updatePhase(phase) {
    this.currentPhase = phase;
    
    // Update progress bar
    const phases = ['specify', 'visualize', 'build', 'eye-test', 'deploy'];
    const currentIndex = phases.indexOf(phase);
    
    document.querySelectorAll('.phase-item').forEach((item, index) => {
      if (index < currentIndex) {
        item.classList.add('completed');
        item.classList.remove('active');
      } else if (index === currentIndex) {
        item.classList.add('active');
        item.classList.remove('completed');
      } else {
        item.classList.remove('active', 'completed');
      }
    });
    
    // Update connectors
    document.querySelectorAll('.phase-connector').forEach((conn, index) => {
      if (index < currentIndex) {
        conn.classList.add('completed');
      } else {
        conn.classList.remove('completed');
      }
    });
    
    // Show appropriate phase content
    this.showPhase(phase);
  }

  showPhase(phase) {
    document.querySelectorAll('.phase-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const phaseContent = document.getElementById(`${phase}-phase`);
    if (phaseContent) {
      phaseContent.classList.add('active');
    }
  }

  canNavigateToPhase(phase) {
    const phases = ['specify', 'visualize', 'build', 'eye-test', 'deploy'];
    const currentIndex = phases.indexOf(this.currentPhase);
    const targetIndex = phases.indexOf(phase);
    
    // Can only go to completed phases or current phase
    return targetIndex <= currentIndex;
  }

  navigateToPhase(phase) {
    if (this.canNavigateToPhase(phase)) {
      this.showPhase(phase);
    }
  }

  showVisualization(content) {
    this.updatePhase('visualize');
    
    // Render wireframes
    const wireframeContainer = document.getElementById('screens-wireframe');
    if (wireframeContainer && content.screens) {
      wireframeContainer.innerHTML = this.renderWireframes(content.screens);
    }
    
    // Render flows
    const flowsContainer = document.getElementById('message-flows');
    if (flowsContainer && content.flows) {
      flowsContainer.innerHTML = this.renderFlows(content.flows);
    }
  }

  renderWireframes(screens) {
    return screens.map(screen => `
      <div class="wireframe-screen">
        <h4>${screen.name}</h4>
        <div class="wireframe-elements">
          ${screen.elements.map(el => `<div class="wireframe-element ${el.type}">${el.label}</div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  renderFlows(flows) {
    return flows.map(flow => `
      <div class="flow-item">
        <span class="flow-type ${flow.type}">${flow.type}</span>
        <span class="flow-arrow">→</span>
        <span class="flow-description">${flow.description}</span>
      </div>
    `).join('');
  }

  updateAgentProgress(data) {
    const agentCard = document.querySelector(`[data-agent="${data.agent}"]`);
    if (!agentCard) return;
    
    agentCard.classList.add('active');
    
    const statusEl = agentCard.querySelector('.agent-status');
    if (statusEl) statusEl.textContent = data.status;
    
    const progressFill = agentCard.querySelector('.progress-fill');
    if (progressFill) progressFill.style.width = `${data.progress}%`;
    
    // Add to build log
    const buildLog = document.getElementById('build-messages');
    if (buildLog) {
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry';
      logEntry.textContent = `[${data.agent}] ${data.message}`;
      buildLog.appendChild(logEntry);
      buildLog.scrollTop = buildLog.scrollHeight;
    }
  }

  showEyeTestItem(data) {
    this.updatePhase('eye-test');
    
    // Update test info
    document.getElementById('test-item').textContent = data.item;
    document.getElementById('test-description').textContent = data.description;
    
    // Update progress
    const progress = (data.current / data.total) * 100;
    document.querySelector('.test-count').textContent = `${data.current} of ${data.total}`;
    document.querySelector('.eyetest-container .progress-fill').style.width = `${progress}%`;
    
    // Show options
    // This would render the actual UI elements being tested
  }

  selectDesignChoice(choice) {
    this.ws.send(JSON.stringify({
      type: 'eyetest_choice',
      choice: choice,
      timestamp: new Date().toISOString()
    }));
  }

  showDeployment(data) {
    this.updatePhase('deploy');
    
    // Update deployment info
    document.querySelector('.app-url').href = data.appUrl;
    document.querySelector('.app-url').textContent = data.appUrl;
    document.querySelector('.admin-url').href = data.adminUrl;
    document.querySelector('.github-url').href = data.githubUrl;
    document.querySelector('.build-time').textContent = data.buildTime;
  }

  onBuildComplete(data) {
    // Move to eye-test phase automatically
    this.updatePhase('eye-test');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adeApp = new ADEApp();
});
// VFS Tree Display
class VFSTree {
  constructor(container) {
    this.container = container;
    this.refresh();
    setInterval(() => this.refresh(), 2000); // Auto-refresh every 2s
  }
  
  async refresh() {
    try {
      const response = await fetch('/api/vfs/list');
      const data = await response.json();
      this.renderTree(data.files || []);
    } catch (error) {
      console.error('VFS refresh error:', error);
    }
  }
  
  async getDirectoryContents(path) {
    const response = await fetch(`/api/vfs/list/${path}`);
    const data = await response.json();
    return data.files || [];
  }
  
  renderTree(files) {
    this.container.innerHTML = '<h3>VFS Files</h3>' + this.renderDirectory(files, '');
  }
  
  renderDirectory(files, path) {
    return '<ul class="vfs-tree">' + files.map(file => 
      `<li class="vfs-item" data-path="${path}${file}">
        <span class="vfs-name">${file}</span>
      </li>`
    ).join('') + '</ul>';
  }
}

// Initialize VFS tree when ready
document.addEventListener('DOMContentLoaded', () => {
  const vfsContainer = document.createElement('div');
  vfsContainer.id = 'vfs-tree';
  vfsContainer.className = 'vfs-container';
  vfsContainer.style.cssText = `
    position: fixed;
    right: 20px;
    top: 100px;
    width: 250px;
    background: #1a1a1a;
    border: 1px solid #00ff88;
    padding: 15px;
    border-radius: 8px;
    color: #00ff88;
    max-height: 70vh;
    overflow-y: auto;
  `;
  document.body.appendChild(vfsContainer);
  
  window.vfsTree = new VFSTree(vfsContainer);
});

// Add VFS toggle button immediately
(function() {
  const btn = document.createElement('button');
  btn.innerHTML = '📁 VFS';
  btn.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:10px 20px;background:#1a1a1a;border:1px solid #00ff88;color:#00ff88;border-radius:8px;cursor:pointer;z-index:3000;font-family:monospace;';
  document.body.appendChild(btn);
  
  const container = document.createElement('div');
  container.innerHTML = '<h3>Loading VFS...</h3>';
  container.style.cssText = 'position:fixed;right:20px;bottom:80px;width:300px;max-height:60vh;background:#1a1a1a;border:1px solid #00ff88;padding:15px;border-radius:8px;color:#00ff88;overflow-y:auto;font-family:monospace;font-size:14px;z-index:3000;display:none;';
  document.body.appendChild(container);
  
  let visible = false;
  btn.onclick = () => {
    visible = !visible;
    container.style.display = visible ? 'block' : 'none';
    if (visible) loadVFS();
  };
  
  async function loadVFS() {
    const res = await fetch('/api/vfs/list/components');
    const data = await res.json();
    container.innerHTML = '<h3>VFS Components</h3><ul>' + 
      (data.files || []).map(f => '<li>' + f + '</li>').join('') + 
      '</ul>';
  }
})();

// Quick navigation to VISUALIZE
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.adeApp) {
      window.adeApp.updatePhase('visualize');
    }
  }, 100);
});

// Hide VFS displays
document.querySelectorAll('#vfs-tree, .vfs-container').forEach(el => el.remove());
document.querySelector('button[textContent*="VFS"]')?.remove();
