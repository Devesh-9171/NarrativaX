const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(uri, {
    maxPoolSize: 30,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000
  });

  console.log('MongoDB connected');
}

module.exports = connectDB;
