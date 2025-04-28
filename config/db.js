import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  // Validate MONGO_URI exists before attempting connection
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  // Configure mongoose connection settings
  mongoose.set('strictQuery', true); // Suppress Mongoose deprecation warning
  mongoose.connection.on('error', err => {
    console.error(`MongoDB connection error: ${err.message}`);
  });

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout for initial connection
      socketTimeoutMS: 45000, // 45 seconds timeout for queries
      maxPoolSize: 10, // Maximum number of connections in pool
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn; // Return the connection object for potential reuse
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    // Graceful shutdown with non-zero exit code
    process.exit(1);
  }
};

// Add connection events for better monitoring
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
});

// Close the Mongoose connection when Node process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

export default connectDB;