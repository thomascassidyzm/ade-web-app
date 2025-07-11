const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the new ADE interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the APML Visualizer
app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, 'apml-visualizer.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ADE is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 ADE Server running on port ${PORT}`);
  console.log(`🌍 Production URL: https://ade-web-app-production.up.railway.app`);
});