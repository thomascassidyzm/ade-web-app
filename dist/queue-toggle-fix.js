// Fix queue toggle - separate from VFS
document.addEventListener('DOMContentLoaded', () => {
  // Remove old toggle code
  const oldScript = document.querySelector('script[src="fix-toggles.js"]');
  if (oldScript) oldScript.remove();
  
  // Find work queue element
  let workQueue = null;
  const checkForQueue = setInterval(() => {
    const possibleQueue = document.querySelector('div[style*="Work Queue"]') || 
                         document.querySelector('.work-queue') ||
                         Array.from(document.querySelectorAll('div')).find(el => 
                           el.textContent.includes('Work Queue') && 
                           el.style.position === 'fixed'
                         );
    
    if (possibleQueue) {
      workQueue = possibleQueue;
      clearInterval(checkForQueue);
      setupQueueToggle();
    }
  }, 100);
  
  function setupQueueToggle() {
    // Create queue toggle button
    const queueBtn = document.createElement('button');
    queueBtn.innerHTML = '📊 Queue';
    queueBtn.style.cssText = `
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
    
    document.body.appendChild(queueBtn);
    
    // Hide work queue initially
    workQueue.style.display = 'none';
    
    let queueVisible = false;
    queueBtn.onclick = () => {
      queueVisible = !queueVisible;
      workQueue.style.display = queueVisible ? 'block' : 'none';
    };
  }
});
