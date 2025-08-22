// Vercel API Route for ADE Chat
// Handles Claude Sonnet 4 conversations and APML generation

const Anthropic = require('@anthropic-ai/sdk');

// Initialize Claude API
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

// Token tracking for cost analysis
const COST_PER_INPUT_TOKEN = 0.000015;  // $15 per million
const COST_PER_OUTPUT_TOKEN = 0.000075; // $75 per million

// Sanitize text to remove invalid Unicode characters
const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Remove lone high surrogates
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Remove lone low surrogates
    .replace(/[\uFFFE\uFFFF]/g, '') // Remove other invalid characters
    .replace(/\0/g, ''); // Remove null characters
};

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
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Sanitize the input message
    const sanitizedMessage = sanitizeText(message);
    
    const systemPrompt = `You are ADE CHAT AGENT. You discuss app ideas and generate APML specifications. You DO NOT compile code.

## Your ONLY Responsibilities:
1. Have natural conversation (keep responses SHORT, ask ONE question)
2. Generate APML specifications based on what user describes  
3. Send APML to the separate Compiler Agent for Vue.js generation

## CRITICAL: NEVER COMPILE CODE YOURSELF
- You generate APML specifications only
- The dedicated Compiler Agent handles APML→Vue compilation
- This separation ensures consistent, error-free deployments

## APML Pattern Libraries you can specify:
Health Apps: welcome → assessment → results → recommendations → booking
Navigation: main_menu → sections (about, services, community, etc.)
E-commerce: browse → product → cart → checkout → confirmation
Social: feed → profile → friends → messages → settings

## Your Response Format:
{
  "chat_response": "SHORT conversational response with ONE question",
  "apml_specification": {
    "screens": ["list", "of", "screens", "user", "described"],
    "flows": [{"from": "screen1", "to": "screen2"}],
    "app_context": {"name": "AppName", "type": "health/social/etc"}
  }
}

Continue building on the app context. Generate APML specs that the Compiler Agent will transform to Vue.js.

CRITICAL: NEVER output raw Vue code, HTML, or CSS. Only APML specifications and natural conversation.`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: sanitizedMessage }]
    });

    const responseContent = response.content[0].text;
    
    // Calculate token usage and cost
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);

    // Try to parse Claude's JSON response for APML updates
    let chatResponse = responseContent;
    let apmlUpdate = null;
    
    try {
      const parsed = JSON.parse(responseContent);
      if (parsed.chat_response && (parsed.apml_specification || parsed.apml_update)) {
        chatResponse = parsed.chat_response;
        apmlUpdate = parsed.apml_specification || parsed.apml_update;
      }
    } catch (e) {
      // Not JSON, treat as regular chat response
      console.log('Non-JSON response, treating as regular chat');
    }

    console.log(`💬 Chat: ${inputTokens + outputTokens} tokens, $${cost.toFixed(4)}`);

    return res.status(200).json({
      role: 'assistant',
      content: chatResponse,
      apmlUpdate: apmlUpdate,
      usage: {
        inputTokens,
        outputTokens,
        cost,
        totalCost: cost
      }
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    
    return res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message
    });
  }
}