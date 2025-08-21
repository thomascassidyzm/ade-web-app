const http = require('http');

const data = JSON.stringify({
  message: "Hello! I want to build a simple todo app. Can you help me think through the screens and features?"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('\n=== CLAUDE RESPONSE ===');
      console.log(parsed.content);
      console.log('\n=== USAGE STATS ===');
      console.log(`Input tokens: ${parsed.usage.inputTokens}`);
      console.log(`Output tokens: ${parsed.usage.outputTokens}`);
      console.log(`Cost: $${parsed.usage.cost}`);
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();