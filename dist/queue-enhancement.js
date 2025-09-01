// Enhanced queue with phase progress
document.addEventListener('DOMContentLoaded', () => {
  // Remove all VFS elements
  document.querySelectorAll('#vfs-tree, .vfs-container, button').forEach(el => {
    if (el.textContent?.includes('VFS')) el.remove();
  });
  
  // Move status to bottom if exists
  const status = document.querySelector('.connection-status');
  if (status) {
    status.style.cssText = 'position:fixed;bottom:20px;right:20px;font-size:0.75rem;';
  }
  
  // Enhance work queue
  const updateQueue = () => {
    const queueEl = document.querySelector('[style*="Work Queue"]') || 
                   document.querySelector('.work-queue');
    if (!queueEl) return;
    
    // Add phase progress
    const phaseProgress = `
      <div class="phase-metrics">
        <h4>Phase Progress</h4>
        <div class="phase-metric">
          <span class="phase-metric-name">VISUALIZE</span>
          <div class="progress-bar-mini">
            <div class="progress-fill-mini" style="width: 100%"></div>
          </div>
          <span class="phase-metric-percent">100%</span>
        </div>
        <div class="phase-metric">
          <span class="phase-metric-name">BUILD</span>
          <div class="progress-bar-mini">
            <div class="progress-fill-mini" style="width: 60%"></div>
          </div>
          <span class="phase-metric-percent">60%</span>
        </div>
      </div>
    `;
    
    // Insert at top of queue
    if (!queueEl.querySelector('.phase-metrics')) {
      queueEl.insertAdjacentHTML('afterbegin', phaseProgress);
    }
    
    // Make tasks clickable
    queueEl.querySelectorAll('[style*="pending"], [style*="completed"]').forEach(task => {
      task.style.cursor = 'pointer';
      task.onclick = () => {
        alert(`Task: ${task.textContent}\nClick would show preview`);
      };
    });
  };
  
  // Update periodically
  setInterval(updateQueue, 1000);
  
  // Fix phase nav centering
  const phaseNav = document.querySelector('.phase-progress');
  if (phaseNav) {
    phaseNav.style.margin = '0 auto';
    phaseNav.style.gridColumn = '2';
  }
});
