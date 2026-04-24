const express = require('express');
const cors = require('cors');
const bfhlRouter = require('./routes/bfhl');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins
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
