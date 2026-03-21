const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const habitRoutes = require('./routes/habits');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/habits', habitRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/habitflow';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log('MongoDB error:', err));