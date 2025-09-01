// Clean queue toggle implementation
document.addEventListener('DOMContentLoaded', () => {
  // Remove any existing queue button first
  document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.includes('Queue')) btn.remove();
  });
  
  // Wait for queue monitor to exist
  setTimeout(() => {
    const queueMonitor = document.querySelector('.vfs-container:first-of-type') || 
                        document.querySelector('div[style*="left: 20px"][style*="top: 100px"]');
    
    if (!queueMonitor || !queueMonitor.textContent.includes('Work Queue')) return;
    
    // Create new toggle button
    const queueToggle = document.createElement('button');
    queueToggle.textContent = '📊 Queue';
    queueToggle.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      padding: 10px 20px;
      background: #1a1a1a;
      border: 1px solid #00ff88;
      color: #00ff88;
      border-radius: 8px;
      cursor: pointer;
      z-index: 2000;
      font-family: monospace;
    `;
    
    document.body.appendChild(queueToggle);
    
    // Set initial state
    queueMonitor.style.display = 'none';
    let visible = false;
    
    // Toggle function
    queueToggle.addEventListener('click', () => {
      visible = !visible;
      queueMonitor.style.display = visible ? 'block' : 'none';
    });
  }, 1000);
});
