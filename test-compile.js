const fs = require('fs');
const http = require('http');

// Read our ADE magic interface APML
const apmlContent = fs.readFileSync('./ade-magic-interface.apml', 'utf8');

const data = JSON.stringify({
  apml: apmlContent
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/compile',
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
      console.log('\n=== COMPILED VUE COMPONENT ===');
      console.log(parsed.vueComponent);
      
      // Save the compiled Vue component
      fs.writeFileSync('./ade-compiled.vue', parsed.vueComponent);
      console.log('\n✅ Saved to ade-compiled.vue');
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