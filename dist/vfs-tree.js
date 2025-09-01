// Enhanced VFS Tree with toggle button
class VFSTree {
  constructor() {
    this.expanded = new Set(['components']);
    this.visible = true;
    this.createUI();
    this.refresh();
    setInterval(() => this.refresh(), 2000);
  }
  
  createUI() {
    // Toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.innerHTML = '📁 VFS';
    this.toggleBtn.style.cssText = `
      position: fixed;
      right: 20px;
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
    
    // Container
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 80px;
      width: 300px;
      max-height: 60vh;
      background: #1a1a1a;
      border: 1px solid #00ff88;
      padding: 15px;
      border-radius: 8px;
      color: #00ff88;
      overflow-y: auto;
      font-family: monospace;
      font-size: 14px;
      z-index: 2000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
    `;
    
    document.body.appendChild(this.toggleBtn);
    document.body.appendChild(this.container);
    
    this.toggleBtn.addEventListener('click', () => {
      this.visible = !this.visible;
      this.container.style.display = this.visible ? 'block' : 'none';
    });
  }
  
  async refresh() {
    if (!this.visible) return;
    try {
      const tree = await this.buildTree();
      this.render(tree);
    } catch (error) {
      console.error('VFS refresh error:', error);
    }
  }
  
  async buildTree(path = '') {
    const response = await fetch(`/api/vfs/list/${path}`);
    const data = await response.json();
    const files = data.files || [];
    
    const tree = [];
    for (const file of files) {
      const fullPath = path ? `${path}/${file}` : file;
      const isDirectory = !file.includes('.');
      
      const node = {
        name: file,
        path: fullPath,
        isDirectory
      };
      
      if (isDirectory && this.expanded.has(fullPath)) {
        node.children = await this.buildTree(fullPath);
      }
      
      tree.push(node);
    }
    
    return tree;
  }
  
  render(tree) {
    this.container.innerHTML = `
      <h3 style="margin-bottom: 10px">VFS Files</h3>
      ${this.renderNodes(tree)}
    `;
    
    // Add click handlers
    this.container.querySelectorAll('.vfs-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = e.target.dataset.path;
        if (this.expanded.has(path)) {
          this.expanded.delete(path);
        } else {
          this.expanded.add(path);
        }
        this.refresh();
      });
    });
  }
  
  renderNodes(nodes, level = 0) {
    return `<ul class="vfs-tree" style="margin-left: ${level * 15}px; list-style: none; padding: 0;">
      ${nodes.map(node => `
        <li class="vfs-item" style="margin: 4px 0;">
          ${node.isDirectory ? `
            <span class="vfs-toggle" data-path="${node.path}" style="cursor: pointer; color: #00ff88;">
              ${this.expanded.has(node.path) ? '▼' : '▶'}
            </span>
          ` : '<span style="width: 16px; display: inline-block"></span>'}
          <span class="vfs-name" style="margin-left: 5px;">${node.name}</span>
          ${node.children ? this.renderNodes(node.children, level + 1) : ''}
        </li>
      `).join('')}
    </ul>`;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.vfsTree = new VFSTree();
});
