// Fix Work Queue - make it toggleable
document.addEventListener('DOMContentLoaded', () => {
  // Find existing work queue
  const workQueue = document.querySelector('.vfs-container') || document.querySelector('#work-queue');
  if (!workQueue) return;
  
  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.innerHTML = '📊 Queue';
  toggleBtn.style.cssText = `
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
  
  // Update work queue position
  workQueue.style.position = 'fixed';
  workQueue.style.left = '20px';
  workQueue.style.bottom = '80px';
  workQueue.style.display = 'none';
  workQueue.style.zIndex = '2000';
  
  document.body.appendChild(toggleBtn);
  
  let visible = false;
  toggleBtn.onclick = () => {
    visible = !visible;
    workQueue.style.display = visible ? 'block' : 'none';
  };
});

// Hide any VFS elements showing at top
document.querySelectorAll('.vfs-container, #vfs-tree').forEach(el => {
  if (el.offsetTop < 200) {
    el.style.display = 'none';
  }
});
