require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const habitRoutes = require('./routes/habits');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/habits', habitRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('HabitFlow API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));