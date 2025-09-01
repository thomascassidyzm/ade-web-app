// Message flow interactions
document.addEventListener('DOMContentLoaded', () => {
  const flowsContainer = document.getElementById('message-flows');
  
  // Message flow templates for different components
  const messageFlows = {
    'login': [
      { type: 'user-app', description: 'User enters credentials' },
      { type: 'app-app', description: 'Validate with auth service' },
      { type: 'app-user', description: 'Show success/error message' }
    ],
    'profile': [
      { type: 'app-user', description: 'Display profile data' },
      { type: 'user-app', description: 'Edit profile fields' },
      { type: 'app-app', description: 'Save to database' },
      { type: 'app-user', description: 'Confirm changes saved' }
    ],
    'subscription': [
      { type: 'user-app', description: 'Select subscription plan' },
      { type: 'app-app', description: 'Check payment method' },
      { type: 'app-user', description: 'Show payment form' },
      { type: 'user-app', description: 'Submit payment' },
      { type: 'app-app', description: 'Process with payment gateway' },
      { type: 'app-user', description: 'Confirm subscription active' }
    ]
  };
  
  // Add click handlers to wireframe elements
  document.addEventListener('click', (e) => {
    if (e.target.closest('.wireframe-element') || e.target.closest('.screen-button')) {
      const element = e.target;
      const elementType = element.textContent.toLowerCase();
      
      // Find matching flows
      const flows = messageFlows[elementType] || [
        { type: 'user-app', description: `User interacts with ${elementType}` },
        { type: 'app-app', description: `Process ${elementType} request` },
        { type: 'app-user', description: `Update ${elementType} display` }
      ];
      
      // Display flows
      if (flowsContainer) {
        flowsContainer.innerHTML = flows.map(flow => `
          <div class="flow-item">
            <span class="flow-type">${flow.type}</span>
            <span class="flow-arrow">→</span>
            <span class="flow-description">${flow.description}</span>
          </div>
        `).join('');
      }
    }
  });
});
