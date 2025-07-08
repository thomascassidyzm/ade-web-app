class ADEClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.init();
  }
  
  init() {
    this.connectWebSocket();
    this.setupEventListeners();
  }
  
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      this.connected = true;
      this.addStatus('Connected to ADE server');
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
      this.addStatus('Disconnected from server');
      // Reconnect after 3 seconds
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.addStatus('Connection error');
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
    this.addStatus(`Sent: "${description}"`);
    
    // Show status section
    document.getElementById('status').classList.remove('hidden');
  }
  
  handleMessage(data) {
    this.addStatus(`Received: ${data.type}`);
    // Will handle different message types as we build out L1_ORCH
  }
  
  addStatus(message) {
    const statusDiv = document.getElementById('status-messages');
    const messageEl = document.createElement('div');
    messageEl.className = 'status-message';
    messageEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    statusDiv.appendChild(messageEl);
    statusDiv.scrollTop = statusDiv.scrollHeight;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adeClient = new ADEClient();
});