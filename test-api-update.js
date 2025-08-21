const http = require('http');

const updateData = JSON.stringify({
  tool: 'send_message',
  parameters: {
    message: 'Diagnostic tool for neuro and bio health - building APML structure...',
    app_context: {
      name: 'NeuroHealth Diagnostic',
      type: 'medical_diagnostic',
      features: ['neuro_assessment', 'bio_markers', 'results']
    },
    apml_update: {
      screens: [
        'diagnostic_entry',
        'neuro_assessment', 
        'bio_markers',
        'results_dashboard'
      ],
      flows: [
        'entry_to_neuro',
        'entry_to_bio',
        'assessments_to_results'
      ]
    }
  },
  session_id: 'claude-code-test'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/mcp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': updateData.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(updateData);
req.end();

console.log('Sent APML update via API');