const mongoose = require("mongoose");

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    connectionPromise = mongoose.connect(process.env.MONGO_URI);
    await connectionPromise;

    console.log("MongoDB connected successfully");

    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;

    console.error("MongoDB connection failed");

    console.error(error.message);

    throw error;
  }
};

module.exports = connectDB;
