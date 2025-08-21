// Simple, robust APML parser - first principles approach
class SimpleAPMLParser {
  parse(content) {
    const result = {
      app_configuration: {},
      data_model: {},
      ui_components: {},
      user_interactions: {},
      styling: {}
    };

    // Split into lines and process
    const lines = content.split('\n');
    let currentSection = null;
    let currentObject = null;
    let currentObjectName = null;
    let braceLevel = 0;
    let objectContent = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Check for section headers
      if (trimmed.startsWith('##')) {
        currentSection = trimmed.substring(2).trim().toLowerCase().replace(/\s+/g, '_');
        continue;
      }
      
      // Skip comments
      if (trimmed.startsWith('#')) continue;
      
      // If we're in a section, process content
      if (currentSection) {
        // Check if line starts an object (has colon and brace)
        if (trimmed.includes(':') && trimmed.includes('{')) {
          // If we're already in an object, this is nested content
          if (currentObject && braceLevel > 0) {
            objectContent.push(trimmed);
            braceLevel += (trimmed.match(/\{/g) || []).length;
            braceLevel -= (trimmed.match(/\}/g) || []).length;
            
            // If parent object is complete
            if (braceLevel === 0) {
              this.finalizeObject(result, currentSection, currentObjectName, objectContent);
              currentObject = null;
              currentObjectName = null;
              objectContent = [];
            }
            continue;
          }
          
          // If we were already in an object, finalize it
          if (currentObject && braceLevel === 0) {
            this.finalizeObject(result, currentSection, currentObjectName, objectContent);
          }
          
          // Start new object
          const colonIndex = trimmed.indexOf(':');
          currentObjectName = trimmed.substring(0, colonIndex).trim();
          currentObject = currentObjectName;
          braceLevel = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
          objectContent = [trimmed];
          
          
          // If object closes on same line
          if (braceLevel === 0) {
            this.finalizeObject(result, currentSection, currentObjectName, objectContent);
            currentObject = null;
            currentObjectName = null;
            objectContent = [];
          }
          continue;
        }
        
        // If we're inside an object, collect content
        if (currentObject && braceLevel > 0) {
          objectContent.push(trimmed);
          braceLevel += (trimmed.match(/\{/g) || []).length;
          braceLevel -= (trimmed.match(/\}/g) || []).length;
          
          // If object is complete
          if (braceLevel === 0) {
            this.finalizeObject(result, currentSection, currentObjectName, objectContent);
            currentObject = null;
            currentObjectName = null;
            objectContent = [];
          }
          continue;
        }
        
        // Simple key-value pair
        if (trimmed.includes(':') && !trimmed.includes('{')) {
          const colonIndex = trimmed.indexOf(':');
          const key = trimmed.substring(0, colonIndex).trim();
          const value = trimmed.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
          
          if (!result[currentSection]) {
            result[currentSection] = {};
          }
          result[currentSection][key] = value;
        }
      }
    }
    
    // Finalize any remaining object
    if (currentObject && braceLevel === 0) {
      this.finalizeObject(result, currentSection, currentObjectName, objectContent);
    }
    
    return result;
  }
  
  finalizeObject(result, section, objectName, content) {
    if (!result[section]) {
      result[section] = {};
    }
    
    // Join content and parse as structured object
    const fullContent = content.join('\n');
    
    if (section === 'data_model' && objectName === 'app_state') {
      result[section][objectName] = this.parseAppState(fullContent);
    } else if (section === 'ui_components') {
      result[section][objectName] = this.parseComponent(fullContent);
    } else {
      // Generic object parsing
      result[section][objectName] = this.parseGenericObject(fullContent);
    }
  }
  
  parseAppState(content) {
    const state = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes(':') && trimmed.includes('default:')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const defaultMatch = trimmed.match(/default:\s*"([^"]+)"/);
        
        if (defaultMatch) {
          state[key] = {
            type: 'string',
            default: defaultMatch[1]
          };
        }
      }
    }
    
    return state;
  }
  
  parseComponent(content) {
    const component = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes(':') && !trimmed.includes('{') && !trimmed.includes('[')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim()
          .replace(/^["']|["']$/g, '')
          .replace(/,$/, '')
          .replace(/^["']|["']$/g, '');
        
        component[key] = value;
      }
    }
    
    // For now, just mark elements as empty array
    if (content.includes('elements:')) {
      component.elements = [];
    }
    
    return component;
  }
  
  parseGenericObject(content) {
    const obj = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes(':') && !trimmed.includes('{')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim()
          .replace(/^["']|["']$/g, '')
          .replace(/,$/, '')
          .replace(/^["']|["']$/g, '');
        
        obj[key] = value;
      }
    }
    
    return obj;
  }
}

module.exports = SimpleAPMLParser;