require("dotenv").config();
const mongoose = require("mongoose");
const TelemetryBucket = require("../src/models/TelemetryBucket");
const { connectDatabase } = require("../src/config/database");
const { getReadings, getLatest } = require("../src/services/telemetryService");

const vehicleId = process.env.BENCHMARK_VEHICLE_ID;
const iterations = Math.max(1, Number(process.env.BENCHMARK_ITERATIONS) || 100);
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];

async function measure(name, operation) {
  const samples = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = process.hrtime.bigint();
    await operation();
    samples.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  return { name, iterations, averageMs: samples.reduce((a, b) => a + b, 0) / samples.length, p95Ms: percentile(samples, 0.95), p99Ms: percentile(samples, 0.99) };
}

async function main() {
  if (!vehicleId) throw new Error("Set BENCHMARK_VEHICLE_ID to a seeded vehicle");
  await connectDatabase();
  await TelemetryBucket.syncIndexes();
  const now = new Date();
  const startTime = new Date(now.getTime() - 60 * 60 * 1000);
  const base = { vehicleId };
  const rangeMatch = { vehicleId, bucketEnd: { $gte: startTime }, bucketStart: { $lte: now } };
  const explainRange = await TelemetryBucket.aggregate([{ $match: rangeMatch }, { $project: { vehicleId: 1, readings: 1 } }, { $unwind: "$readings" }, { $match: { "readings.timestamp": { $gte: startTime, $lte: now } } }]).explain("executionStats");
  const explainLatest = await TelemetryBucket.find(base).sort({ bucketEnd: -1 }).limit(1).select({ bucketEnd: 1 }).explain("executionStats");
  const reports = await Promise.all([
    measure("vehicle-hour-range", () => getReadings(vehicleId, { startTime, endTime: now, limit: 100, offset: 0 })),
    measure("latest-telemetry", () => getLatest(vehicleId)),
  ]);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), mongoVersion: (await mongoose.connection.db.admin().serverInfo()).version, collectionDocuments: await TelemetryBucket.countDocuments(), indexes: await TelemetryBucket.collection.indexes(), measuredLatencyMs: reports, explainExecutionStats: { timestampRange: explainRange.executionStats, latestBucket: explainLatest.executionStats }, note: "Measured latency includes client/server round trips; explain executionTimeMillis is MongoDB execution time." }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
