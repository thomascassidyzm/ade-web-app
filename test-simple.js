require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

console.log('API Key:', process.env.CLAUDE_API_KEY ? 'Found' : 'Missing');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 100,
  messages: [{ role: 'user', content: 'Hello!' }]
}).then(response => {
  console.log('SUCCESS:', response.content[0].text);
}).catch(error => {
  console.log('ERROR:', error.message);
  console.log('Error details:', error);
});