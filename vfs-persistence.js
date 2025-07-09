const fs = require('fs').promises;
const path = require('path');

class VFSPersistence {
  constructor(vfs) {
    this.vfs = vfs;
    this.persistencePath = './vfs-snapshots';
    this.autoSaveInterval = 60000; // Auto-save every minute
    this.init();
  }

  async init() {
    await fs.mkdir(this.persistencePath, { recursive: true });
    await this.loadLatestSnapshot();
    this.startAutoSave();
  }

  async saveSnapshot(trigger = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(this.persistencePath, `snapshot-${timestamp}-${trigger}.json`);
    
    try {
      // Get all VFS contents
      const snapshot = {
        timestamp: new Date().toISOString(),
        trigger,
        files: await this.getAllFiles()
      };
      
      await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
      console.log(`VFS snapshot saved: ${snapshotPath}`);
      
      // Clean up old snapshots (keep last 10)
      await this.cleanupOldSnapshots();
      
      return { success: true, path: snapshotPath };
    } catch (error) {
      console.error('Failed to save VFS snapshot:', error);
      return { success: false, error: error.message };
    }
  }

  async loadLatestSnapshot() {
    try {
      const files = await fs.readdir(this.persistencePath);
      const snapshots = files.filter(f => f.startsWith('snapshot-')).sort().reverse();
      
      if (snapshots.length === 0) {
        console.log('No VFS snapshots found');
        return;
      }
      
      const latestSnapshot = snapshots[0];
      const snapshotPath = path.join(this.persistencePath, latestSnapshot);
      const data = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
      
      console.log(`Loading VFS snapshot from ${data.timestamp}`);
      
      // Restore files to VFS
      for (const [filePath, content] of Object.entries(data.files)) {
        await this.vfs.write(filePath, content.content, content.metadata);
      }
      
      console.log(`Restored ${Object.keys(data.files).length} files from snapshot`);
    } catch (error) {
      console.error('Failed to load VFS snapshot:', error);
    }
  }

  async getAllFiles() {
    const files = {};
    
    async function scanDirectory(dir, basePath = '') {
      const items = await fs.readdir(path.join('./vfs-storage', dir), { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          await scanDirectory(itemPath, basePath);
        } else {
          try {
            const content = await fs.readFile(path.join('./vfs-storage', itemPath), 'utf8');
            files[itemPath] = JSON.parse(content);
          } catch (e) {
            // Skip non-JSON files
          }
        }
      }
    }
    
    try {
      await scanDirectory('');
    } catch (e) {
      // VFS might be empty
    }
    
    return files;
  }

  async cleanupOldSnapshots() {
    const files = await fs.readdir(this.persistencePath);
    const snapshots = files.filter(f => f.startsWith('snapshot-')).sort().reverse();
    
    // Keep only the 10 most recent snapshots
    for (let i = 10; i < snapshots.length; i++) {
      await fs.unlink(path.join(this.persistencePath, snapshots[i]));
    }
  }

  startAutoSave() {
    setInterval(() => {
      this.saveSnapshot('autosave');
    }, this.autoSaveInterval);
  }

  // Save on critical events
  async saveOnEvent(eventType) {
    const criticalEvents = [
      'app_specification_complete',
      'build_phase_complete',
      'eye_test_complete',
      'deployment_ready'
    ];
    
    if (criticalEvents.includes(eventType)) {
      await this.saveSnapshot(eventType);
    }
  }

  // Export for deployment
  async exportForDeployment(projectName) {
    const exportPath = path.join('./exports', projectName);
    await fs.mkdir(exportPath, { recursive: true });
    
    const files = await this.getAllFiles();
    
    // Convert VFS structure to real project files
    for (const [vfsPath, data] of Object.entries(files)) {
      if (vfsPath.includes('/components/') && vfsPath.endsWith('.vue')) {
        // Export Vue components
        const componentPath = path.join(exportPath, 'src', vfsPath);
        await fs.mkdir(path.dirname(componentPath), { recursive: true });
        await fs.writeFile(componentPath, data.content);
      }
      // Add more export rules for different file types
    }
    
    console.log(`Project exported to ${exportPath}`);
    return exportPath;
  }
}

module.exports = VFSPersistence;