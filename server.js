require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const { compileAPMLToVue } = require('./compiler/apml-to-vue');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3001;

// Initialize Claude API
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Token tracking for cost analysis
let sessionStats = {
  totalSessions: 0,
  totalTokensInput: 0,
  totalTokensOutput: 0,
  totalCost: 0,
  averageTokensPerSession: 0,
  sessions: []
};

// Cost calculation (approximate)
const COST_PER_INPUT_TOKEN = 0.000015;  // $15 per million
const COST_PER_OUTPUT_TOKEN = 0.000075; // $75 per million

// Sanitize text to remove invalid Unicode characters
const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  
  // Remove lone surrogates and other problematic Unicode characters
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Remove lone high surrogates
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Remove lone low surrogates
    .replace(/[\uFFFE\uFFFF]/g, '') // Remove other invalid characters
    .replace(/\0/g, ''); // Remove null characters
};

// Real Claude API integration with token tracking
const callClaudeAPI = async (message, sessionId) => {
  try {
    // Sanitize the input message to prevent JSON parsing errors
    const sanitizedMessage = sanitizeText(message);
    
    const systemPrompt = `You are ADE - help users build apps through conversation.

Keep responses SHORT. Ask ONE simple question at a time. Focus on understanding their app idea and identifying the main screens they need.

Be conversational and helpful.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.MAX_TOKENS_PER_REQUEST) || 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: sanitizedMessage
      }]
    });

    // Track token usage
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);

    // Update session stats
    sessionStats.totalTokensInput += inputTokens;
    sessionStats.totalTokensOutput += outputTokens;
    sessionStats.totalCost += cost;

    // Log session data
    const sessionData = {
      sessionId,
      timestamp: new Date().toISOString(),
      message: message.substring(0, 100) + '...', // Truncate for privacy
      inputTokens,
      outputTokens,
      cost: cost.toFixed(6)
    };
    
    sessionStats.sessions.push(sessionData);
    
    // Log to console for real-time monitoring
    console.log(`💰 Session ${sessionId}: ${inputTokens + outputTokens} tokens, $${cost.toFixed(4)}`);
    
    // Save stats periodically
    if (sessionStats.sessions.length % 10 === 0) {
      await saveSessionStats();
    }

    return {
      role: 'assistant',
      content: response.content[0].text,
      usage: {
        inputTokens,
        outputTokens,
        cost,
        totalCost: sessionStats.totalCost
      }
    };

  } catch (error) {
    console.error('Claude API Error:', error);
    
    // Fallback to smart mock response
    return {
      role: 'assistant',
      content: `I'm experiencing a connection issue with my AI engine. Let me help you with a basic response:\n\nFor building apps, I typically help with:\n• Defining screens and user flows\n• Creating APML structure\n• Designing interactions\n\nWhat kind of app are you thinking about? Please try your message again.`,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        error: error.message
      }
    };
  }
};

// Save session statistics
const saveSessionStats = async () => {
  try {
    sessionStats.totalSessions = sessionStats.sessions.length;
    sessionStats.averageTokensPerSession = sessionStats.totalSessions > 0 
      ? Math.round((sessionStats.totalTokensInput + sessionStats.totalTokensOutput) / sessionStats.totalSessions)
      : 0;
    
    await fs.writeFile(
      path.join(__dirname, 'session-stats.json'),
      JSON.stringify(sessionStats, null, 2)
    );
  } catch (error) {
    console.error('Failed to save session stats:', error);
  }
};

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the new ADE interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-magic-live.html'));
});

// Serve the APML Visualizer
app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-visualizer.html'));
});

// Serve the Message Flow Simulator
app.get('/simulator', (req, res) => {
  res.sendFile(path.join(__dirname, 'message-flow-simulator.html'));
});

// Serve the ADE Meta Interface
app.get('/meta', (req, res) => {
  res.sendFile(path.join(__dirname, 'ade-meta.html'));
});

// Serve the Lifecycle Demo
app.get('/lifecycle', (req, res) => {
  res.sendFile(path.join(__dirname, 'lifecycle-demo.html'));
});

// Serve the Magic ADE Experience
app.get('/magic', (req, res) => {
  res.sendFile(path.join(__dirname, 'magic-ade.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ADE is running', timestamp: new Date().toISOString() });
});

// Session storage for conversation persistence
const sessions = new Map();

// WebSocket for real-time chat with session persistence
wss.on('connection', (ws) => {
  console.log('🔌 Client connected to ADE chat');
  let currentSessionId = 'persistent-session'; // Use same session for all connections
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'chat') {
        // Ensure session exists
        if (!sessions.has(currentSessionId)) {
          sessions.set(currentSessionId, {
            messages: [],
            appContext: null,
            apmlStructure: null
          });
          console.log('🆕 New session created:', currentSessionId);
        }
        
        // Get session context
        const session = sessions.get(currentSessionId);
        session.messages.push({ role: 'user', content: message.content });
        
        // Enhanced system prompt with conversation context
        const contextualPrompt = `You are ADE (App Development Engine). You transform conversations into production-ready apps using APML.

## Your Core Capability
As we chat, you SIMULTANEOUSLY:
1. Have natural conversation (keep responses SHORT, ask ONE question)
2. Build APML structure in real-time based on what user describes
3. Send APML updates to visualize Mermaid + iPhone simulator

## APML Pattern Libraries
Health Apps: welcome → assessment → results → recommendations → booking
Navigation: main_menu → sections (about, services, community, etc.)
E-commerce: browse → product → cart → checkout → confirmation
Social: feed → profile → friends → messages → settings

## Current Conversation Context:
${session.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

## Your Response Format:
{
  "chat_response": "SHORT conversational response with ONE question",
  "apml_update": {
    "screens": ["list", "of", "screens", "user", "described"],
    "flows": [{"from": "screen1", "to": "screen2"}],
    "app_context": {"name": "AppName", "type": "health/social/etc"}
  }
}

Continue building on the app context. Don't restart. Generate both chat AND APML.

CRITICAL: NEVER output raw APML, JSON, or code in your chat responses. Only natural conversation in chat_response.`;

        // Call Claude API with full conversation context
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-20250514',
          max_tokens: 1000,
          system: contextualPrompt,
          messages: [{ role: 'user', content: message.content }]
        });
        
        const responseContent = response.content[0].text;
        session.messages.push({ role: 'assistant', content: responseContent });
        
        // Try to parse Claude's JSON response for APML updates
        let chatResponse = responseContent;
        let apmlUpdate = null;
        
        try {
          const parsed = JSON.parse(responseContent);
          if (parsed.chat_response && parsed.apml_update) {
            chatResponse = parsed.chat_response;
            apmlUpdate = parsed.apml_update;
            
            // Update session with APML data
            if (apmlUpdate.app_context) {
              session.appContext = apmlUpdate.app_context;
            }
            if (apmlUpdate.screens || apmlUpdate.flows) {
              session.apmlStructure = { 
                screens: apmlUpdate.screens || session.apmlStructure?.screens || [],
                flows: apmlUpdate.flows || session.apmlStructure?.flows || []
              };
            }
          }
        } catch (e) {
          // Not JSON, treat as regular chat response
          console.log('Non-JSON response, treating as regular chat');
        }
        
        ws.send(JSON.stringify({
          type: 'response',
          content: chatResponse,
          timestamp: Date.now(),
          sessionId: currentSessionId,
          apmlUpdate: apmlUpdate,
          appContext: session.appContext,
          apmlStructure: session.apmlStructure
        }));
        
        console.log(`💬 Session ${currentSessionId}: ${session.messages.length} messages`);
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        content: 'Sorry, I encountered an error processing your message.'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Client disconnected from ADE chat');
  });
});

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const response = await callClaudeAPI(message, sessionId);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// API endpoint for session statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      totalSessions: sessionStats.totalSessions,
      totalTokens: sessionStats.totalTokensInput + sessionStats.totalTokensOutput,
      totalCost: sessionStats.totalCost,
      averageTokensPerSession: sessionStats.averageTokensPerSession,
      averageCostPerSession: sessionStats.totalSessions > 0 
        ? (sessionStats.totalCost / sessionStats.totalSessions).toFixed(4)
        : 0,
      recentSessions: sessionStats.sessions.slice(-10) // Last 10 sessions
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// API endpoint for APML compilation
app.post('/api/compile', async (req, res) => {
  try {
    const { apml } = req.body;
    const vueComponent = compileAPMLToVue(apml);
    res.json({ 
      success: true, 
      vueComponent,
      message: 'APML compiled to Vue successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to compile APML'
    });
  }
});

// MCP endpoint for Remote MCP integration with Claude Pro Max
app.post('/api/mcp', async (req, res) => {
  try {
    const { tool, parameters, session_id } = req.body;
    
    // Get or create session
    let session = sessions.get(session_id);
    if (!session) {
      session = {
        messages: [],
        appContext: null,
        apmlStructure: { screens: [], flows: [] }
      };
      sessions.set(session_id, session);
    }
    
    // Handle MCP tool calls
    switch (tool) {
      case 'send_message':
        const { message, app_context, apml_update } = parameters;
        
        // Update session context
        if (app_context) session.appContext = app_context;
        if (apml_update) session.apmlStructure = { ...session.apmlStructure, ...apml_update };
        
        // Broadcast to connected WebSocket clients
        wss.clients.forEach(client => {
          if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({
              type: 'mcp_response',
              content: message,
              appContext: session.appContext,
              apmlStructure: session.apmlStructure,
              sessionId: session_id
            }));
          }
        });
        
        res.json({ success: true, session_context: session });
        break;
        
      default:
        res.status(400).json({ error: 'Unknown MCP tool' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 ADE Server running on port ${PORT}`);
  console.log(`🌍 WebSocket chat available`);
  console.log(`📱 /meta - Complete lifecycle demo`);
  console.log(`🎯 /simulator - ProjectChat experience`);
  console.log(`🔧 /visualizer - APML tools`);
  console.log(`💰 /api/stats - Token usage statistics`);
  
  // Load existing session stats if available
  try {
    const existingStats = await fs.readFile(path.join(__dirname, 'session-stats.json'), 'utf8');
    sessionStats = { ...sessionStats, ...JSON.parse(existingStats) };
    console.log(`📊 Loaded ${sessionStats.sessions?.length || 0} previous sessions`);
  } catch (error) {
    console.log(`📊 Starting fresh session tracking`);
  }
  
  // Log API key status
  if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your_anthropic_api_key_here') {
    console.log(`🤖 Claude API configured`);
  } else {
    console.log(`⚠️  No Claude API key found. Please set CLAUDE_API_KEY in .env file`);
    console.log(`   Get your API key from: https://console.anthropic.com`);
  }
});