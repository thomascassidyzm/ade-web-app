const fs = require('fs').promises;
const path = require('path');

class VirtualFileSystem {
  constructor(basePath = './vfs-storage') {
    this.basePath = basePath;
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      this.basePath,
      path.join(this.basePath, 'specs'),
      path.join(this.basePath, 'agents'),
      path.join(this.basePath, 'projects'),
      path.join(this.basePath, 'components')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }

  async write(filePath, content, metadata = {}) {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    
    const fileData = {
      content,
      metadata: {
        ...metadata,
        created: new Date().toISOString(),
        path: filePath
      }
    };
    
    await fs.writeFile(fullPath, JSON.stringify(fileData, null, 2));
    return { success: true, path: filePath };
  }

  async read(filePath) {
    const fullPath = path.join(this.basePath, filePath);
    try {
      const data = await fs.readFile(fullPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { error: `File not found: ${filePath}` };
    }
  }

  async list(directory = '') {
    const fullPath = path.join(this.basePath, directory);
    try {
      const files = await fs.readdir(fullPath);
      return files.filter(f => !f.startsWith('.'));
    } catch (error) {
      return [];
    }
  }

  async getStructure() {
    // Return the complete VFS structure
    const structure = {};
    
    const scanDir = async (dir, obj) => {
      const fullPath = path.join(this.basePath, dir);
      try {
        const items = await fs.readdir(fullPath);
        for (const item of items) {
          if (item.startsWith('.')) continue;
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(path.join(this.basePath, itemPath));
          if (stats.isDirectory()) {
            obj[item] = {};
            await scanDir(itemPath, obj[item]);
          } else {
            obj[item] = 'file';
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    };
    
    await scanDir('', structure);
    return structure;
  }
}

module.exports = VirtualFileSystem;