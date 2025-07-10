// Update phase navigation with hints and better interaction
document.addEventListener('DOMContentLoaded', () => {
  // Reorganize header layout
  const header = document.querySelector('.ade-header');
  const logo = document.querySelector('.logo');
  const phaseProgress = document.querySelector('.phase-progress');
  const connectionStatus = document.querySelector('.connection-status');
  
  if (header && logo && phaseProgress) {
    // Create new header structure
    header.innerHTML = '';
    
    // Left side - branding
    const leftSection = document.createElement('div');
    leftSection.style.display = 'flex';
    leftSection.style.alignItems = 'center';
    leftSection.style.gap = '1rem';
    leftSection.innerHTML = `
      <h1 style="font-size: 1.5rem; margin: 0; background: linear-gradient(135deg, #00ffff 0%, #00ff88 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ADE</h1>
      <a href="#" class="about-link" style="color: #00ff88; text-decoration: none; font-size: 0.75rem; opacity: 0.7;">What is ADE?</a>
    `;
    
    // Center - phase roadmap
    phaseProgress.style.flex = '1';
    phaseProgress.style.maxWidth = '600px';
    phaseProgress.style.margin = '0 auto';
    
    // Add hints to phase items
    const phaseHints = {
      'specify': 'Describe your app idea',
      'visualize': 'See UI wireframes & flows',
      'build': 'Watch agents build it',
      'eye-test': 'Choose design preferences',
      'deploy': 'Launch your app'
    };
    
    document.querySelectorAll('.phase-item').forEach(item => {
      const phase = item.dataset.phase;
      if (phaseHints[phase]) {
        item.setAttribute('data-hint', phaseHints[phase]);
      }
    });
    
    // Right side - status
    if (connectionStatus) {
      connectionStatus.style.marginLeft = 'auto';
    }
    
    // Rebuild header
    header.appendChild(leftSection);
    header.appendChild(phaseProgress);
    if (connectionStatus) {
      header.appendChild(connectionStatus);
    }
  }
  
  // Enhance phase navigation clicks
  document.querySelectorAll('.phase-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const phase = e.currentTarget.dataset.phase;
      // Visual feedback
      e.currentTarget.style.transform = 'scale(0.95)';
      setTimeout(() => {
        e.currentTarget.style.transform = '';
      }, 100);
    });
  });
});
