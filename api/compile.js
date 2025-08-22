// Vercel API Route for ADE APML Compilation
// Handles APML to Vue.js compilation using CompilerAgent

const CompilerAgent = require('../services/compiler-agent');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { apml, sessionId } = req.body;
    
    if (!apml) {
      return res.status(400).json({ error: 'APML content is required' });
    }

    console.log('🔧 [VERCEL] Starting APML compilation...');
    
    // Initialize CompilerAgent
    const compilerAgent = new CompilerAgent();
    
    // Use single Compiler Agent (Zenjin-proven architecture)
    const result = await compilerAgent.compileAPML(apml, sessionId || 'vercel-session');
    
    if (result.success) {
      console.log('✅ [VERCEL] Compilation successful');
      
      return res.status(200).json({ 
        success: true, 
        vueComponent: result.vueCode,
        apml: result.apml,
        analysis: result.analysis,
        stats: result.stats,
        message: 'APML compiled successfully by Compiler Agent'
      });
    } else {
      console.error('❌ [VERCEL] Compilation failed:', result.error);
      
      return res.status(500).json(result);
    }
    
  } catch (error) {
    console.error('Compile API Error:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Compiler Agent failed to process APML'
    });
  }
}