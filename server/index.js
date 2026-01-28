const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mockDb = require('./mockDb');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
let dbConnected = false;
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cooltab', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✓ MongoDB connected');
    dbConnected = true;
  })
  .catch((err) => {
    console.log('⚠ MongoDB connection error - using mock database for development');
    console.log('Error:', err.message);
  });

// Enable mock database flag for controllers
app.use((req, res, next) => {
  req.useMockDb = !dbConnected;
  next();
});

// Seed mock database with sample data if using mock DB
if (!dbConnected) {
  mockDb.seedSampleData().catch(console.error);
}

// Routes
const loadRoutes = require('./routes/loads');
app.use('/api/loads', loadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
