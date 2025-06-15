// Load environment variables safely
const result = require('dotenv').config();
if (result.error) {
  console.error('Failed to load .env file:', result.error);
  process.exit(1); // Exit if .env failed to load
} else {
  console.log('Environment variables loaded:', result.parsed);
}

const express = require('express');

const app = express();

// Simple test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

const PORT = process.env.PORT || 5000;

// Start server and listen on port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
