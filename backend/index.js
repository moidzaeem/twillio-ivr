// Load environment variables safely
const result = require('dotenv').config();


const express = require('express');

const app = express();

// Simple test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

const PORT = process.env.PORT || 5000;

// Start server and listen on port
app.listen(5001, () => {
  console.log(`Server running on port 5001`);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
