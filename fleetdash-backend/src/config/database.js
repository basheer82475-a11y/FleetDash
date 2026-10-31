const mongoose = require("mongoose");

function validateMongoUri(uri) {
  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  const placeholderPattern = /(<[^>]+>|placeholder|example|your_[a-z_]+|replace_me|changeme|db_password|<password>|<username>|<cluster-url>)/i;

  if (placeholderPattern.test(uri)) {
    throw new Error(
      "MONGO_URI appears to contain placeholder text; update MongoDB Atlas credentials in .env before benchmarking."
    );
  }

  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error("MONGO_URI must be a valid MongoDB connection string");
  }

  return uri;
}

async function connectDatabase(uri = process.env.MONGO_URI) {
  const resolvedUri = validateMongoUri(uri);
  return mongoose.connect(resolvedUri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
    autoIndex: true,
  });
}

module.exports = { connectDatabase, validateMongoUri };
