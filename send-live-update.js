const WebSocket = require('ws');

// Connect to the ADE server WebSocket
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', function open() {
  console.log('Connected to ADE server');
  
  // Send APML update for the health diagnostic app
  const apmlUpdate = {
    type: 'mcp_response',
    content: 'Building diagnostic tool for neuro and bio health...',
    appContext: {
      name: 'NeuroHealth Diagnostic',
      type: 'medical_diagnostic',
      features: ['neuro_assessment', 'bio_markers', 'diagnostic_results']
    },
    apmlStructure: {
      screens: [
        { name: 'diagnostic_entry', type: 'assessment_start' },
        { name: 'neuro_assessment', type: 'cognitive_tests' },
        { name: 'bio_markers', type: 'health_metrics' },
        { name: 'results_dashboard', type: 'medical_summary' }
      ],
      flows: [
        { from: 'diagnostic_entry', to: 'neuro_assessment' },
        { from: 'diagnostic_entry', to: 'bio_markers' },
        { from: 'neuro_assessment', to: 'results_dashboard' },
        { from: 'bio_markers', to: 'results_dashboard' }
      ]
    },
    sessionId: 'claude-code-session'
  };
  
  ws.send(JSON.stringify(apmlUpdate));
  console.log('Sent APML update for health diagnostic app');
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

setTimeout(() => {
  ws.close();
  console.log('Connection closed');
}, 2000);