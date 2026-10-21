const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema({
  speed: { type: Number, required: true, min: 0, max: 500 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  fuelLevel: { type: Number, required: true, min: 0, max: 100 },
  engineTemperature: { type: Number, required: true, min: -100, max: 300 },
  timestamp: { type: Date, required: true },
}, { _id: true });

const bucketSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true },
  windowStart: { type: Date, required: true },
  bucketNumber: { type: Number, required: true, default: 0, min: 0 },
  bucketStart: { type: Date, required: true },
  bucketEnd: { type: Date, required: true },
  readingCount: { type: Number, required: true, min: 1, max: 1000 },
  readings: { type: [readingSchema], validate: [(value) => value.length <= 1000, "Bucket is full"] },
}, { timestamps: true, versionKey: false });

bucketSchema.index({ vehicleId: 1, windowStart: 1, bucketNumber: 1 }, { unique: true });
bucketSchema.index({ vehicleId: 1, bucketStart: 1 });

module.exports = mongoose.models.TelemetryBucket || mongoose.model("TelemetryBucket", bucketSchema);
