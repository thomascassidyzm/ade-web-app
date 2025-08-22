// Vercel API Route for ADE Statistics
// Simple stats endpoint (in serverless, stats are per-request)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In serverless, we can't maintain persistent stats
    // This is a basic implementation that shows current session only
    const stats = {
      platform: 'Vercel Serverless',
      timestamp: new Date().toISOString(),
      message: 'Stats are per-request in serverless architecture',
      currentSession: {
        totalTokens: 0,
        totalCost: 0,
        successRate: 100
      }
    };
    
    return res.status(200).json(stats);
    
  } catch (error) {
    console.error('Stats API Error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to get statistics',
      message: error.message 
    });
  }
}