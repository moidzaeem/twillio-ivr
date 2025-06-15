const result = require('dotenv').config();
if (result.error) {
  console.error('Failed to load .env file:', result.error);
  process.exit(1); // optional, to stop if env not loaded
} else {
  console.log('Environment variables loaded:', result.parsed);
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilioRoutes = require('./routes/twilioRoutes');
console.log('>> Booting Express Server...');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Main API routes
app.use('/api/twilio', twilioRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
