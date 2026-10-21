const mongoose = require("mongoose");

async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error("MONGO_URI is required");
  return mongoose.connect(uri, { serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000 });
}

module.exports = { connectDatabase };
