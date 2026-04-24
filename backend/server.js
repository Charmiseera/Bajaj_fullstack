const express = require('express');
const cors = require('cors');
const bfhlRouter = require('./routes/bfhl');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — manually set headers on every request (most reliable for evaluators)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Handle preflight immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'BFHL API is running. Use POST /bfhl.' });
});

// Routes
app.use('/bfhl', bfhlRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`✅ BFHL API server running on http://localhost:${PORT}`);
});

module.exports = app;
